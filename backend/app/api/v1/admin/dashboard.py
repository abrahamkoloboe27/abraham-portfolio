"""Admin dashboard metrics, audit trail and site settings (singleton)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app import schemas
from app.api.deps import DbSession, RequireAdmin, RequireEditor, RequireViewer, save_and_refresh
from app.models.community import Playlist, Talk
from app.models.content import Post, Project
from app.models.enums import AuditAction, ContentStatus
from app.models.media import ContactMessage, MediaAsset, PageView
from app.models.site import SiteSettings
from app.models.user import AuditLog, User
from app.schemas.common import Page
from app.services import audit

router = APIRouter()


async def _count(db: DbSession, model: Any, *conditions: Any) -> int:
    stmt = select(func.count()).select_from(model)
    if conditions:
        stmt = stmt.where(*conditions)
    return (await db.execute(stmt)).scalar_one()


@router.get("/stats", response_model=schemas.DashboardStats, summary="Chiffres du tableau de bord")
async def dashboard_stats(db: DbSession, _: RequireViewer) -> schemas.DashboardStats:
    now = datetime.now(UTC)
    since_30d = now - timedelta(days=30)
    since_7d = now - timedelta(days=7)

    views_rows = (
        await db.execute(
            select(func.date(PageView.created_at), func.count())
            .where(PageView.created_at >= since_30d)
            .group_by(func.date(PageView.created_at))
            .order_by(func.date(PageView.created_at))
        )
    ).all()
    timeseries = [schemas.TimeseriesPoint(date=str(day), value=count) for day, count in views_rows]

    top_pages = [
        schemas.TopEntry(label=path, value=count, href=path)
        for path, count in (
            await db.execute(
                select(PageView.path, func.count())
                .where(PageView.created_at >= since_30d)
                .group_by(PageView.path)
                .order_by(func.count().desc())
                .limit(10)
            )
        ).all()
    ]
    top_referrers = [
        schemas.TopEntry(label=referrer or "direct", value=count)
        for referrer, count in (
            await db.execute(
                select(PageView.referrer, func.count())
                .where(PageView.created_at >= since_30d)
                .group_by(PageView.referrer)
                .order_by(func.count().desc())
                .limit(10)
            )
        ).all()
    ]

    recent = (
        (
            await db.execute(
                select(ContactMessage)
                .where(ContactMessage.is_spam.is_(False))
                .order_by(ContactMessage.created_at.desc())
                .limit(5)
            )
        )
        .scalars()
        .all()
    )

    return schemas.DashboardStats(
        projects_total=await _count(db, Project),
        projects_published=await _count(db, Project, Project.status == ContentStatus.PUBLISHED),
        posts_total=await _count(db, Post),
        posts_published=await _count(db, Post, Post.status == ContentStatus.PUBLISHED),
        talks_total=await _count(db, Talk),
        playlists_total=await _count(db, Playlist),
        media_total=await _count(db, MediaAsset),
        messages_total=await _count(db, ContactMessage, ContactMessage.is_spam.is_(False)),
        messages_unread=await _count(
            db, ContactMessage, ContactMessage.is_read.is_(False), ContactMessage.is_spam.is_(False)
        ),
        users_total=await _count(db, User),
        views_30d=await _count(db, PageView, PageView.created_at >= since_30d),
        views_7d=await _count(db, PageView, PageView.created_at >= since_7d),
        visitors_30d=(
            await db.execute(
                select(func.count(func.distinct(PageView.visitor_hash))).where(
                    PageView.created_at >= since_30d
                )
            )
        ).scalar_one(),
        views_timeseries=timeseries,
        top_pages=top_pages,
        top_referrers=top_referrers,
        recent_messages=[schemas.ContactMessageOut.model_validate(m) for m in recent],
    )


@router.get("/audit", response_model=Page[schemas.AuditLogOut], summary="Journal d'activité")
async def list_audit(
    db: DbSession,
    _: RequireAdmin,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 50,
    entity_type: str | None = None,
    action: str | None = None,
) -> Page[schemas.AuditLogOut]:
    conditions = []
    if entity_type:
        conditions.append(AuditLog.entity_type == entity_type)
    if action:
        conditions.append(AuditLog.action == action)

    total = (
        await db.execute(select(func.count()).select_from(AuditLog).where(*conditions))
    ).scalar_one()
    rows = (
        (
            await db.execute(
                select(AuditLog)
                .where(*conditions)
                .order_by(AuditLog.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .scalars()
        .all()
    )
    return Page.build(
        [schemas.AuditLogOut.model_validate(row) for row in rows], total, page, per_page
    )


# ------------------------------------------------------------------- settings
@router.get("/settings", response_model=schemas.SiteSettingsOut, summary="Paramètres du site")
async def get_settings(db: DbSession, _: RequireViewer) -> Any:
    row = (await db.execute(select(SiteSettings).limit(1))).scalar_one_or_none()
    if row is None:
        row = SiteSettings()
        db.add(row)
        return await save_and_refresh(db, row)
    return row


@router.patch(
    "/settings", response_model=schemas.SiteSettingsOut, summary="Modifier les paramètres"
)
async def update_settings(
    payload: schemas.SiteSettingsUpdate, db: DbSession, user: RequireEditor, request: Request
) -> Any:
    row = (await db.execute(select(SiteSettings).limit(1))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paramètres introuvables")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    await save_and_refresh(db, row)
    await audit.record(
        db,
        action=AuditAction.UPDATE,
        entity_type="settings",
        entity_id=str(row.id),
        entity_label=row.site_name,
        actor=user,
        changes={key: "***" if "password" in key else value for key, value in data.items()},
        request=request,
    )
    return row
