"""Projects (réalisations), blog posts and tags."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import ContentStatus, ProjectCategory
from app.schemas.common import OrderedOut

SLUG_PATTERN = r"^[a-z0-9][a-z0-9-]*$"


# ------------------------------------------------------------------------ tags
class TagBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=64)
    name_fr: str
    name_en: str
    color: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int = 0
    is_visible: bool = True


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    name_fr: str | None = None
    name_en: str | None = None
    color: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class TagOut(OrderedOut, TagBase):
    pass


class TagWithCount(TagOut):
    count: int = 0


# -------------------------------------------------------------------- projects
class ProjectBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=160)
    title_fr: str
    title_en: str
    summary_fr: str | None = None
    summary_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    category: ProjectCategory = ProjectCategory.DATA_ENGINEERING
    status: ContentStatus = ContentStatus.DRAFT
    is_featured: bool = False
    cover_url: str | None = None
    thumbnail_url: str | None = None
    gallery: list[dict] = Field(default_factory=list)
    video_url: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    article_url: str | None = None
    links: list[dict] = Field(default_factory=list)
    tech: list[str] = Field(default_factory=list)
    role_fr: str | None = None
    role_en: str | None = None
    client: str | None = None
    metrics: list[dict] = Field(default_factory=list)
    started_at: date | None = None
    finished_at: date | None = None
    published_at: datetime | None = None
    seo_title_fr: str | None = None
    seo_title_en: str | None = None
    seo_description_fr: str | None = None
    seo_description_en: str | None = None
    position: int = 0
    is_visible: bool = True


class ProjectCreate(ProjectBase):
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    title_fr: str | None = None
    title_en: str | None = None
    summary_fr: str | None = None
    summary_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    category: ProjectCategory | None = None
    status: ContentStatus | None = None
    is_featured: bool | None = None
    cover_url: str | None = None
    thumbnail_url: str | None = None
    gallery: list[dict] | None = None
    video_url: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    article_url: str | None = None
    links: list[dict] | None = None
    tech: list[str] | None = None
    role_fr: str | None = None
    role_en: str | None = None
    client: str | None = None
    metrics: list[dict] | None = None
    started_at: date | None = None
    finished_at: date | None = None
    published_at: datetime | None = None
    seo_title_fr: str | None = None
    seo_title_en: str | None = None
    seo_description_fr: str | None = None
    seo_description_en: str | None = None
    position: int | None = None
    is_visible: bool | None = None
    tag_ids: list[uuid.UUID] | None = None


class ProjectOut(OrderedOut, ProjectBase):
    view_count: int = 0
    tags: list[TagOut] = Field(default_factory=list)


class ProjectSummaryOut(OrderedOut):
    """Lighter payload for list/grid views — no Markdown body."""

    slug: str
    title_fr: str
    title_en: str
    summary_fr: str | None = None
    summary_en: str | None = None
    category: ProjectCategory
    status: ContentStatus
    is_featured: bool = False
    cover_url: str | None = None
    thumbnail_url: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    tech: list[str] = Field(default_factory=list)
    metrics: list[dict] = Field(default_factory=list)
    started_at: date | None = None
    finished_at: date | None = None
    published_at: datetime | None = None
    view_count: int = 0
    tags: list[TagOut] = Field(default_factory=list)


# ----------------------------------------------------------------------- posts
class PostBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=160)
    title_fr: str
    title_en: str
    excerpt_fr: str | None = None
    excerpt_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    status: ContentStatus = ContentStatus.DRAFT
    is_featured: bool = False
    cover_url: str | None = None
    cover_alt_fr: str | None = None
    cover_alt_en: str | None = None
    published_at: datetime | None = None
    canonical_url: str | None = None
    external_url: str | None = None
    seo_title_fr: str | None = None
    seo_title_en: str | None = None
    seo_description_fr: str | None = None
    seo_description_en: str | None = None
    position: int = 0
    is_visible: bool = True


class PostCreate(PostBase):
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class PostUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    title_fr: str | None = None
    title_en: str | None = None
    excerpt_fr: str | None = None
    excerpt_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    status: ContentStatus | None = None
    is_featured: bool | None = None
    cover_url: str | None = None
    cover_alt_fr: str | None = None
    cover_alt_en: str | None = None
    published_at: datetime | None = None
    canonical_url: str | None = None
    external_url: str | None = None
    seo_title_fr: str | None = None
    seo_title_en: str | None = None
    seo_description_fr: str | None = None
    seo_description_en: str | None = None
    position: int | None = None
    is_visible: bool | None = None
    tag_ids: list[uuid.UUID] | None = None


class PostOut(OrderedOut, PostBase):
    reading_minutes: int = 1
    view_count: int = 0
    author_id: uuid.UUID | None = None
    tags: list[TagOut] = Field(default_factory=list)


class PostSummaryOut(OrderedOut):
    slug: str
    title_fr: str
    title_en: str
    excerpt_fr: str | None = None
    excerpt_en: str | None = None
    status: ContentStatus
    is_featured: bool = False
    cover_url: str | None = None
    published_at: datetime | None = None
    reading_minutes: int = 1
    view_count: int = 0
    external_url: str | None = None
    tags: list[TagOut] = Field(default_factory=list)
