"""Admin API — hand-written routers plus every generated CRUD resource."""

from typing import Any

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import schemas
from app.api.v1.admin import auth, dashboard, media, messages, users
from app.api.v1.admin.factory import make_crud_router
from app.models.community import Organization, Playlist, Talk, Video
from app.models.content import Post, Project, Tag
from app.models.resume import (
    Certification,
    Education,
    Experience,
    Language,
    Skill,
    SkillCategory,
)
from app.models.site import NavItem, Section, SocialLink, Stat, Testimonial
from app.utils.text import excerpt, reading_minutes


async def _sync_tags(db: AsyncSession, obj: Any, extras: dict[str, Any]) -> None:
    """Replace the tag set when the payload carries `tag_ids`.

    `no_autoflush` matters here: without it, the SELECT below would flush the
    still-pending row, turning it persistent, and the following assignment would
    lazy-load the (empty) existing collection with blocking IO.
    """
    tag_ids = extras.get("tag_ids")
    if tag_ids is None:
        return
    with db.no_autoflush:
        tags = (await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))).scalars().all()
        obj.tags = list(tags)


async def _prepare_post(db: AsyncSession, obj: Post, extras: dict[str, Any]) -> None:
    await _sync_tags(db, obj, extras)
    obj.reading_minutes = max(reading_minutes(obj.content_fr), reading_minutes(obj.content_en))
    if not obj.excerpt_fr and obj.content_fr:
        obj.excerpt_fr = excerpt(obj.content_fr)
    if not obj.excerpt_en and obj.content_en:
        obj.excerpt_en = excerpt(obj.content_en)


router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["admin • auth"])
router.include_router(users.router, prefix="/team", tags=["admin • équipe"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["admin • tableau de bord"])
router.include_router(media.router, prefix="/media", tags=["admin • médias"])
router.include_router(messages.router, prefix="/messages", tags=["admin • messages"])

# ---------------------------------------------------------------- CRUD resources
RESOURCES = [
    dict(
        prefix="/sections",
        model=Section,
        create_schema=schemas.SectionCreate,
        update_schema=schemas.SectionUpdate,
        out_schema=schemas.SectionOut,
        entity="section",
        tags=["admin • sections"],
        search_fields=("key", "title_fr", "title_en"),
        filter_fields=("type", "is_visible"),
        unique_fields=("key",),
    ),
    dict(
        prefix="/nav-items",
        model=NavItem,
        create_schema=schemas.NavItemCreate,
        update_schema=schemas.NavItemUpdate,
        out_schema=schemas.NavItemOut,
        entity="lien de navigation",
        tags=["admin • navigation"],
        search_fields=("label_fr", "label_en", "href"),
        filter_fields=("location", "is_visible"),
    ),
    dict(
        prefix="/socials",
        model=SocialLink,
        create_schema=schemas.SocialLinkCreate,
        update_schema=schemas.SocialLinkUpdate,
        out_schema=schemas.SocialLinkOut,
        entity="lien social",
        tags=["admin • liens"],
        search_fields=("platform", "label", "url"),
        filter_fields=("is_visible",),
    ),
    dict(
        prefix="/stats",
        model=Stat,
        create_schema=schemas.StatCreate,
        update_schema=schemas.StatUpdate,
        out_schema=schemas.StatOut,
        entity="chiffre clé",
        tags=["admin • chiffres"],
        search_fields=("key", "label_fr", "label_en"),
        unique_fields=("key",),
    ),
    dict(
        prefix="/testimonials",
        model=Testimonial,
        create_schema=schemas.TestimonialCreate,
        update_schema=schemas.TestimonialUpdate,
        out_schema=schemas.TestimonialOut,
        entity="recommandation",
        tags=["admin • recommandations"],
        search_fields=("author_name", "company", "quote_fr", "quote_en"),
        filter_fields=("is_featured", "is_visible"),
    ),
    dict(
        prefix="/experiences",
        model=Experience,
        create_schema=schemas.ExperienceCreate,
        update_schema=schemas.ExperienceUpdate,
        out_schema=schemas.ExperienceOut,
        entity="expérience",
        tags=["admin • parcours"],
        search_fields=("company", "role_fr", "role_en", "location"),
        filter_fields=("is_current", "is_visible"),
        default_order=[Experience.position, Experience.start_date.desc()],
    ),
    dict(
        prefix="/education",
        model=Education,
        create_schema=schemas.EducationCreate,
        update_schema=schemas.EducationUpdate,
        out_schema=schemas.EducationOut,
        entity="formation",
        tags=["admin • parcours"],
        search_fields=("school", "degree_fr", "degree_en"),
        default_order=[Education.position, Education.end_year.desc().nulls_last()],
    ),
    dict(
        prefix="/certifications",
        model=Certification,
        create_schema=schemas.CertificationCreate,
        update_schema=schemas.CertificationUpdate,
        out_schema=schemas.CertificationOut,
        entity="certification",
        tags=["admin • parcours"],
        search_fields=("name", "issuer"),
        filter_fields=("is_featured", "is_visible"),
        default_order=[Certification.position, Certification.issued_at.desc().nulls_last()],
    ),
    dict(
        prefix="/skill-categories",
        model=SkillCategory,
        create_schema=schemas.SkillCategoryCreate,
        update_schema=schemas.SkillCategoryUpdate,
        out_schema=schemas.SkillCategoryOut,
        entity="catégorie de compétences",
        tags=["admin • compétences"],
        search_fields=("slug", "name_fr", "name_en"),
        unique_fields=("slug",),
        list_options=(selectinload(SkillCategory.skills),),
    ),
    dict(
        prefix="/skills",
        model=Skill,
        create_schema=schemas.SkillCreate,
        update_schema=schemas.SkillUpdate,
        out_schema=schemas.SkillOut,
        entity="compétence",
        tags=["admin • compétences"],
        search_fields=("name",),
        filter_fields=("category_id", "is_featured", "is_visible"),
    ),
    dict(
        prefix="/languages",
        model=Language,
        create_schema=schemas.LanguageCreate,
        update_schema=schemas.LanguageUpdate,
        out_schema=schemas.LanguageOut,
        entity="langue",
        tags=["admin • parcours"],
        search_fields=("name_fr", "name_en"),
    ),
    dict(
        prefix="/tags",
        model=Tag,
        create_schema=schemas.TagCreate,
        update_schema=schemas.TagUpdate,
        out_schema=schemas.TagOut,
        entity="tag",
        tags=["admin • contenus"],
        search_fields=("slug", "name_fr", "name_en"),
        unique_fields=("slug",),
    ),
    dict(
        prefix="/projects",
        model=Project,
        create_schema=schemas.ProjectCreate,
        update_schema=schemas.ProjectUpdate,
        out_schema=schemas.ProjectOut,
        entity="réalisation",
        tags=["admin • contenus"],
        search_fields=("slug", "title_fr", "title_en", "summary_fr", "summary_en"),
        filter_fields=("status", "category", "is_featured", "is_visible"),
        unique_fields=("slug",),
        on_create=_sync_tags,
        on_update=_sync_tags,
        list_options=(selectinload(Project.tags),),
        default_order=[Project.position, Project.created_at.desc()],
    ),
    dict(
        prefix="/posts",
        model=Post,
        create_schema=schemas.PostCreate,
        update_schema=schemas.PostUpdate,
        out_schema=schemas.PostOut,
        entity="article",
        tags=["admin • contenus"],
        search_fields=("slug", "title_fr", "title_en", "excerpt_fr", "excerpt_en"),
        filter_fields=("status", "is_featured", "is_visible"),
        unique_fields=("slug",),
        on_create=_prepare_post,
        on_update=_prepare_post,
        list_options=(selectinload(Post.tags),),
        default_order=[Post.published_at.desc().nulls_last(), Post.created_at.desc()],
    ),
    dict(
        prefix="/organizations",
        model=Organization,
        create_schema=schemas.OrganizationCreate,
        update_schema=schemas.OrganizationUpdate,
        out_schema=schemas.OrganizationOut,
        entity="organisation",
        tags=["admin • communauté"],
        search_fields=("slug", "name"),
        unique_fields=("slug",),
    ),
    dict(
        prefix="/talks",
        model=Talk,
        create_schema=schemas.TalkCreate,
        update_schema=schemas.TalkUpdate,
        out_schema=schemas.TalkOut,
        entity="intervention",
        tags=["admin • communauté"],
        search_fields=("slug", "title_fr", "title_en", "event_name", "location"),
        filter_fields=("type", "is_featured", "is_visible", "organization_id"),
        unique_fields=("slug",),
        list_options=(selectinload(Talk.organization),),
        default_order=[Talk.position, Talk.event_date.desc().nulls_last()],
    ),
    dict(
        prefix="/playlists",
        model=Playlist,
        create_schema=schemas.PlaylistCreate,
        update_schema=schemas.PlaylistUpdate,
        out_schema=schemas.PlaylistOut,
        entity="playlist",
        tags=["admin • communauté"],
        search_fields=("slug", "title_fr", "title_en"),
        filter_fields=("provider", "is_featured", "is_visible"),
        unique_fields=("slug",),
        list_options=(selectinload(Playlist.videos),),
    ),
    dict(
        prefix="/videos",
        model=Video,
        create_schema=schemas.VideoCreate,
        update_schema=schemas.VideoUpdate,
        out_schema=schemas.VideoOut,
        entity="vidéo",
        tags=["admin • communauté"],
        search_fields=("title",),
        filter_fields=("playlist_id", "is_visible"),
    ),
]

for resource in RESOURCES:
    prefix = resource.pop("prefix")
    router.include_router(make_crud_router(**resource), prefix=prefix)

__all__ = ["router"]
