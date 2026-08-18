"""Public listing/detail endpoints for projects, blog posts, talks and playlists."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import String, func, or_, select
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.deps import DbSession, OptionalUser
from app.models.community import Organization, Playlist, Talk
from app.models.content import Post, Project, Tag, post_tags, project_tags
from app.models.enums import ContentStatus, ProjectCategory, TalkType
from app.schemas.common import Page

router = APIRouter()

CACHE_HEADER = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"


def _published_filter(model: Any, preview: bool):
    """Signed-in editors see drafts (preview); everybody else only sees published."""
    if preview:
        return [model.is_visible.is_(True)]
    return [
        model.is_visible.is_(True),
        model.status == ContentStatus.PUBLISHED,
        or_(model.published_at.is_(None), model.published_at <= datetime.now(UTC)),
    ]


def _search_clause(model: Any, term: str):
    pattern = f"%{term.lower()}%"
    fields = [
        "title_fr",
        "title_en",
        "summary_fr",
        "summary_en",
        "excerpt_fr",
        "excerpt_en",
        "content_fr",
        "content_en",
    ]
    clauses = [
        func.lower(getattr(model, field)).like(pattern) for field in fields if hasattr(model, field)
    ]
    return or_(*clauses)


# -------------------------------------------------------------------- projects
@router.get(
    "/projects", response_model=Page[schemas.ProjectSummaryOut], summary="Lister les réalisations"
)
async def list_projects(
    db: DbSession,
    response: Response,
    user: OptionalUser,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 12,
    category: ProjectCategory | None = None,
    tag: str | None = Query(None, description="Slug de tag"),
    featured: bool | None = None,
    tech: str | None = Query(None, description="Filtrer sur une techno"),
    q: str | None = Query(None, description="Recherche"),
) -> Page[schemas.ProjectSummaryOut]:
    response.headers["Cache-Control"] = CACHE_HEADER
    preview = user is not None

    conditions = _published_filter(Project, preview)
    if category:
        conditions.append(Project.category == category)
    if featured is not None:
        conditions.append(Project.is_featured.is_(featured))
    if q:
        conditions.append(_search_clause(Project, q))

    stmt = select(Project).where(*conditions)
    count_stmt = select(func.count()).select_from(Project).where(*conditions)

    if tag:
        stmt = stmt.join(project_tags).join(Tag).where(Tag.slug == tag)
        count_stmt = count_stmt.join(project_tags).join(Tag).where(Tag.slug == tag)
    if tech:
        # `tech` is a JSON array of strings; a case-insensitive text match is enough here.
        tech_clause = func.lower(func.cast(Project.tech, String)).like(f"%{tech.lower()}%")
        stmt = stmt.where(tech_clause)
        count_stmt = count_stmt.where(tech_clause)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.options(selectinload(Project.tags))
        .order_by(
            Project.is_featured.desc(),
            Project.position,
            Project.published_at.desc().nulls_last(),
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(stmt)).unique().scalars().all()
    return Page.build(
        [schemas.ProjectSummaryOut.model_validate(row) for row in rows], total, page, per_page
    )


@router.get(
    "/projects/{slug}", response_model=schemas.ProjectOut, summary="Détail d'une réalisation"
)
async def get_project(slug: str, db: DbSession, response: Response, user: OptionalUser) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Project)
        .where(Project.slug == slug, *_published_filter(Project, user is not None))
        .options(selectinload(Project.tags))
    )
    project = (await db.execute(stmt)).unique().scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Réalisation introuvable")
    return project


# ----------------------------------------------------------------------- posts
@router.get("/posts", response_model=Page[schemas.PostSummaryOut], summary="Lister les articles")
async def list_posts(
    db: DbSession,
    response: Response,
    user: OptionalUser,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 10,
    tag: str | None = None,
    featured: bool | None = None,
    q: str | None = None,
) -> Page[schemas.PostSummaryOut]:
    response.headers["Cache-Control"] = CACHE_HEADER
    conditions = _published_filter(Post, user is not None)
    if featured is not None:
        conditions.append(Post.is_featured.is_(featured))
    if q:
        conditions.append(_search_clause(Post, q))

    stmt = select(Post).where(*conditions)
    count_stmt = select(func.count()).select_from(Post).where(*conditions)
    if tag:
        stmt = stmt.join(post_tags).join(Tag).where(Tag.slug == tag)
        count_stmt = count_stmt.join(post_tags).join(Tag).where(Tag.slug == tag)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.options(selectinload(Post.tags))
        .order_by(Post.published_at.desc().nulls_last(), Post.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(stmt)).unique().scalars().all()
    return Page.build(
        [schemas.PostSummaryOut.model_validate(row) for row in rows], total, page, per_page
    )


@router.get("/posts/{slug}", response_model=schemas.PostOut, summary="Détail d'un article")
async def get_post(slug: str, db: DbSession, response: Response, user: OptionalUser) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Post)
        .where(Post.slug == slug, *_published_filter(Post, user is not None))
        .options(selectinload(Post.tags))
    )
    post = (await db.execute(stmt)).unique().scalar_one_or_none()
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article introuvable")
    return post


@router.get("/tags", response_model=list[schemas.TagWithCount], summary="Tags avec compteurs")
async def list_tags(db: DbSession, response: Response) -> list[schemas.TagWithCount]:
    response.headers["Cache-Control"] = CACHE_HEADER
    tags = (
        (await db.execute(select(Tag).where(Tag.is_visible.is_(True)).order_by(Tag.position)))
        .scalars()
        .all()
    )

    counts = dict(
        (
            await db.execute(select(post_tags.c.tag_id, func.count()).group_by(post_tags.c.tag_id))
        ).all()
    )
    project_counts = dict(
        (
            await db.execute(
                select(project_tags.c.tag_id, func.count()).group_by(project_tags.c.tag_id)
            )
        ).all()
    )

    result = []
    for tag in tags:
        payload = schemas.TagWithCount.model_validate(tag)
        payload.count = counts.get(tag.id, 0) + project_counts.get(tag.id, 0)
        result.append(payload)
    return result


# ----------------------------------------------------------------------- talks
@router.get(
    "/talks", response_model=Page[schemas.TalkOut], summary="Formations, ateliers et conférences"
)
async def list_talks(
    db: DbSession,
    response: Response,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
    type: TalkType | None = None,
    organization: str | None = Query(None, description="Slug d'organisation"),
    featured: bool | None = None,
) -> Page[schemas.TalkOut]:
    response.headers["Cache-Control"] = CACHE_HEADER
    conditions = [Talk.is_visible.is_(True)]
    if type:
        conditions.append(Talk.type == type)
    if featured is not None:
        conditions.append(Talk.is_featured.is_(featured))

    stmt = select(Talk).where(*conditions)
    count_stmt = select(func.count()).select_from(Talk).where(*conditions)
    if organization:
        stmt = stmt.join(Organization).where(Organization.slug == organization)
        count_stmt = count_stmt.join(Organization).where(Organization.slug == organization)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.options(selectinload(Talk.organization))
        .order_by(Talk.event_date.desc().nulls_last(), Talk.position)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(stmt)).unique().scalars().all()
    return Page.build([schemas.TalkOut.model_validate(row) for row in rows], total, page, per_page)


@router.get("/talks/{slug}", response_model=schemas.TalkOut, summary="Détail d'une intervention")
async def get_talk(slug: str, db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Talk)
        .where(Talk.slug == slug, Talk.is_visible.is_(True))
        .options(selectinload(Talk.organization))
    )
    talk = (await db.execute(stmt)).unique().scalar_one_or_none()
    if talk is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention introuvable")
    return talk


# ------------------------------------------------------------------- playlists
@router.get(
    "/playlists", response_model=list[schemas.PlaylistOut], summary="Playlists vidéo (YouTube)"
)
async def list_playlists(db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Playlist)
        .where(Playlist.is_visible.is_(True))
        .options(selectinload(Playlist.videos))
        .order_by(Playlist.position)
    )
    return (await db.execute(stmt)).unique().scalars().all()


@router.get(
    "/playlists/{slug}", response_model=schemas.PlaylistOut, summary="Détail d'une playlist"
)
async def get_playlist(slug: str, db: DbSession, response: Response) -> Any:
    response.headers["Cache-Control"] = CACHE_HEADER
    stmt = (
        select(Playlist)
        .where(Playlist.slug == slug, Playlist.is_visible.is_(True))
        .options(selectinload(Playlist.videos))
    )
    playlist = (await db.execute(stmt)).unique().scalar_one_or_none()
    if playlist is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Playlist introuvable")
    return playlist
