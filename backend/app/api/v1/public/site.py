"""Read-only endpoints powering the public site, plus contact and analytics."""

from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DbSession
from app.core.config import settings
from app.models.community import Organization, Playlist, Talk
from app.models.content import ContentStatus, Post, Project, Tag
from app.models.media import ContactMessage, PageView
from app.models.resume import (
    Certification,
    Education,
    Experience,
    Language,
    Skill,
    SkillCategory,
)
from app.models.site import NavItem, Section, SiteSettings, SocialLink, Stat, Testimonial
from app.services import audit
from app.services.email import send_contact_notification

router = APIRouter()

CACHE_HEADER = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"


def _visible(model: Any):
    return select(model).where(model.is_visible.is_(True)).order_by(model.position)


def _published(model: Any):
    now = datetime.now(UTC)
    return (
        select(model)
        .where(
            model.is_visible.is_(True),
            model.status == ContentStatus.PUBLISHED,
            (model.published_at.is_(None)) | (model.published_at <= now),
        )
        .order_by(model.published_at.desc().nulls_last(), model.position)
    )


async def _get_settings_row(db: DbSession) -> SiteSettings:
    row = (await db.execute(select(SiteSettings).limit(1))).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Le site n'est pas encore initialisé — lancez `python -m app.db.seed`.",
        )
    return row


@router.get("/site", response_model=schemas.SiteBundle, summary="Bundle complet du site")
async def get_site_bundle(db: DbSession, response: Response) -> schemas.SiteBundle:
    """Single call returning everything the home page renders, in both languages."""
    response.headers["Cache-Control"] = CACHE_HEADER

    site = await _get_settings_row(db)

    async def fetch(stmt):
        return (await db.execute(stmt)).unique().scalars().all()

    sections = await fetch(_visible(Section))
    nav = await fetch(_visible(NavItem))
    socials = await fetch(_visible(SocialLink))
    stats = await fetch(_visible(Stat))
    experiences = await fetch(
        select(Experience)
        .where(Experience.is_visible.is_(True))
        .order_by(Experience.position, Experience.start_date.desc())
    )
    education = await fetch(
        select(Education)
        .where(Education.is_visible.is_(True))
        .order_by(Education.position, Education.end_year.desc().nulls_last())
    )
    certifications = await fetch(
        select(Certification)
        .where(Certification.is_visible.is_(True))
        .order_by(Certification.position, Certification.issued_at.desc().nulls_last())
    )
    skill_categories = await fetch(
        select(SkillCategory)
        .where(SkillCategory.is_visible.is_(True))
        .options(selectinload(SkillCategory.skills))
        .order_by(SkillCategory.position)
    )
    languages = await fetch(_visible(Language))
    organizations = await fetch(_visible(Organization))
    testimonials = await fetch(_visible(Testimonial))
    playlists = await fetch(
        select(Playlist)
        .where(Playlist.is_visible.is_(True))
        .options(selectinload(Playlist.videos))
        .order_by(Playlist.position)
    )
    featured_projects = await fetch(_published(Project).limit(6))
    latest_posts = await fetch(_published(Post).limit(4))
    featured_talks = await fetch(
        select(Talk)
        .where(Talk.is_visible.is_(True))
        .options(selectinload(Talk.organization))
        .order_by(Talk.position, Talk.event_date.desc().nulls_last())
        .limit(12)
    )
    tags = await fetch(_visible(Tag))

    return schemas.SiteBundle(
        settings=schemas.SiteSettingsOut.model_validate(site),
        sections=[schemas.SectionOut.model_validate(x) for x in sections],
        nav=[schemas.NavItemOut.model_validate(x) for x in nav],
        socials=[schemas.SocialLinkOut.model_validate(x) for x in socials],
        stats=[schemas.StatOut.model_validate(x) for x in stats],
        experiences=[schemas.ExperienceOut.model_validate(x) for x in experiences],
        education=[schemas.EducationOut.model_validate(x) for x in education],
        certifications=[schemas.CertificationOut.model_validate(x) for x in certifications],
        skill_categories=[schemas.SkillCategoryOut.model_validate(x) for x in skill_categories],
        languages=[schemas.LanguageOut.model_validate(x) for x in languages],
        organizations=[schemas.OrganizationOut.model_validate(x) for x in organizations],
        featured_projects=[schemas.ProjectSummaryOut.model_validate(x) for x in featured_projects],
        latest_posts=[schemas.PostSummaryOut.model_validate(x) for x in latest_posts],
        featured_talks=[schemas.TalkOut.model_validate(x) for x in featured_talks],
        playlists=[schemas.PlaylistOut.model_validate(x) for x in playlists],
        testimonials=[schemas.TestimonialOut.model_validate(x) for x in testimonials],
        tags=[schemas.TagOut.model_validate(x) for x in tags],
    )


@router.get("/settings", response_model=schemas.SiteSettingsOut, summary="Paramètres du site")
async def get_public_settings(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return await _get_settings_row(db)


@router.get("/sections", response_model=list[schemas.SectionOut], summary="Sections visibles")
async def list_sections(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(Section))).scalars().all()


@router.get("/experiences", response_model=list[schemas.ExperienceOut], summary="Expériences")
async def list_experiences(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Experience)
        .where(Experience.is_visible.is_(True))
        .order_by(Experience.position, Experience.start_date.desc())
    )
    return (await db.execute(stmt)).scalars().all()


@router.get("/education", response_model=list[schemas.EducationOut], summary="Formations suivies")
async def list_education(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Education)
        .where(Education.is_visible.is_(True))
        .order_by(Education.position, Education.end_year.desc().nulls_last())
    )
    return (await db.execute(stmt)).scalars().all()


@router.get(
    "/certifications", response_model=list[schemas.CertificationOut], summary="Certifications"
)
async def list_certifications(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Certification)
        .where(Certification.is_visible.is_(True))
        .order_by(Certification.position, Certification.issued_at.desc().nulls_last())
    )
    return (await db.execute(stmt)).scalars().all()


@router.get("/skills", response_model=list[schemas.SkillCategoryOut], summary="Compétences")
async def list_skills(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(SkillCategory)
        .where(SkillCategory.is_visible.is_(True))
        .options(selectinload(SkillCategory.skills.and_(Skill.is_visible.is_(True))))
        .order_by(SkillCategory.position)
    )
    return (await db.execute(stmt)).unique().scalars().all()


@router.get("/languages", response_model=list[schemas.LanguageOut], summary="Langues parlées")
async def list_languages(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(Language))).scalars().all()


@router.get("/socials", response_model=list[schemas.SocialLinkOut], summary="Liens sociaux")
async def list_socials(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(SocialLink))).scalars().all()


@router.get("/stats", response_model=list[schemas.StatOut], summary="Chiffres clés")
async def list_stats(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(Stat))).scalars().all()


@router.get("/organizations", response_model=list[schemas.OrganizationOut], summary="Communautés")
async def list_organizations(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(Organization))).scalars().all()


@router.get("/testimonials", response_model=list[schemas.TestimonialOut], summary="Recommandations")
async def list_testimonials(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    return (await db.execute(_visible(Testimonial))).scalars().all()


# ------------------------------------------------------------------------ contact
@router.post(
    "/contact",
    response_model=schemas.Message,
    status_code=status.HTTP_201_CREATED,
    summary="Envoyer un message",
)
async def submit_contact(
    payload: schemas.ContactMessageCreate,
    db: DbSession,
    request: Request,
    background: BackgroundTasks,
) -> schemas.Message:
    # Bots fill the hidden field; accept the request so they don't retry, but flag it.
    is_spam = bool(payload.honeypot)

    message = ContactMessage(
        name=payload.name.strip(),
        email=payload.email.lower(),
        company=payload.company,
        subject=payload.subject,
        message=payload.message.strip(),
        locale=payload.locale,
        is_spam=is_spam,
        ip_address=audit.client_ip(request),
        user_agent=request.headers.get("user-agent"),
        referrer=request.headers.get("referer"),
    )
    db.add(message)

    if not is_spam:
        background.add_task(
            send_contact_notification,
            payload.name,
            str(payload.email),
            payload.subject or "(sans sujet)",
            payload.message,
        )
    return schemas.Message(detail="Message envoyé, merci ! Je reviens vers vous rapidement.")


# ---------------------------------------------------------------------- analytics
@router.post(
    "/track",
    response_model=schemas.Message,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enregistrer une vue de page",
)
async def track_view(
    payload: schemas.PageViewCreate, db: DbSession, request: Request
) -> schemas.Message:
    """Cookie-free counter: the visitor hash rotates daily and stores no PII."""
    ip = audit.client_ip(request) or ""
    ua = request.headers.get("user-agent", "")
    seed = f"{ip}|{ua}|{date.today().isoformat()}|{settings.SECRET_KEY}"
    visitor_hash = hashlib.sha256(seed.encode()).hexdigest()[:32]

    db.add(
        PageView(
            created_at=datetime.now(UTC),
            path=payload.path[:512],
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            locale=payload.locale,
            referrer=(payload.referrer or request.headers.get("referer") or "")[:1024] or None,
            country=request.headers.get("cf-ipcountry")
            or request.headers.get("x-vercel-ip-country"),
            visitor_hash=visitor_hash,
        )
    )

    if payload.entity_type == "project" and payload.entity_id:
        await _bump_view_count(db, Project, payload.entity_id)
    elif payload.entity_type == "post" and payload.entity_id:
        await _bump_view_count(db, Post, payload.entity_id)

    return schemas.Message(detail="ok")


async def _bump_view_count(db: DbSession, model: Any, slug_or_id: str) -> None:
    obj = (
        await db.execute(select(model).where(model.slug == slug_or_id).limit(1))
    ).scalar_one_or_none()
    if obj is not None:
        obj.view_count = (obj.view_count or 0) + 1


@router.get("/health", response_model=schemas.HealthOut, summary="État du service")
async def health(db: DbSession) -> schemas.HealthOut:
    try:
        await db.execute(select(1))
        database = "up"
    except Exception:
        database = "down"
    return schemas.HealthOut(
        status="ok" if database == "up" else "degraded",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database=database,
    )


__all__ = ["CACHE_HEADER", "router"]
