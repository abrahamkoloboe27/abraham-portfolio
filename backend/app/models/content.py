"""Portfolio pieces (réalisations) and blog articles."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, OrderedMixin, TimestampMixin, UUIDMixin
from app.db.types import JSONType
from app.models.enums import ContentStatus, ProjectCategory

project_tags = Table(
    "project_tags",
    Base.metadata,
    Column("project_id", Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", Uuid, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "tags"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name_fr: Mapped[str] = mapped_column(String(64), nullable=False)
    name_en: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str | None] = mapped_column(String(16))
    description_fr: Mapped[str | None] = mapped_column(String(512))
    description_en: Mapped[str | None] = mapped_column(String(512))

    projects: Mapped[list[Project]] = relationship(secondary=project_tags, back_populates="tags")
    posts: Mapped[list[Post]] = relationship(secondary=post_tags, back_populates="tags")


class Project(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """A "réalisation": personal project, client delivery or open-source work."""

    __tablename__ = "projects"

    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    title_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    summary_fr: Mapped[str | None] = mapped_column(String(512))
    summary_en: Mapped[str | None] = mapped_column(String(512))
    content_fr: Mapped[str | None] = mapped_column(Text)  # Markdown
    content_en: Mapped[str | None] = mapped_column(Text)

    category: Mapped[str] = mapped_column(
        String(32), default=ProjectCategory.DATA_ENGINEERING, index=True
    )
    status: Mapped[str] = mapped_column(String(16), default=ContentStatus.DRAFT, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    cover_url: Mapped[str | None] = mapped_column(String(512))
    thumbnail_url: Mapped[str | None] = mapped_column(String(512))
    gallery: Mapped[list | None] = mapped_column(JSONType, default=list)
    video_url: Mapped[str | None] = mapped_column(String(1024))

    repo_url: Mapped[str | None] = mapped_column(String(1024))
    demo_url: Mapped[str | None] = mapped_column(String(1024))
    article_url: Mapped[str | None] = mapped_column(String(1024))
    # [{"label": "...", "url": "...", "icon": "..."}]
    links: Mapped[list | None] = mapped_column(JSONType, default=list)

    tech: Mapped[list | None] = mapped_column(JSONType, default=list)
    role_fr: Mapped[str | None] = mapped_column(String(255))
    role_en: Mapped[str | None] = mapped_column(String(255))
    client: Mapped[str | None] = mapped_column(String(255))
    # [{"label_fr": "...", "label_en": "...", "value": "-40%"}]
    metrics: Mapped[list | None] = mapped_column(JSONType, default=list)

    started_at: Mapped[date | None] = mapped_column(Date)
    finished_at: Mapped[date | None] = mapped_column(Date)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    seo_title_fr: Mapped[str | None] = mapped_column(String(255))
    seo_title_en: Mapped[str | None] = mapped_column(String(255))
    seo_description_fr: Mapped[str | None] = mapped_column(String(512))
    seo_description_en: Mapped[str | None] = mapped_column(String(512))

    tags: Mapped[list[Tag]] = relationship(
        secondary=project_tags, back_populates="projects", lazy="selectin"
    )


class Post(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """Blog article, stored as Markdown and rendered client-side."""

    __tablename__ = "posts"

    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    title_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    excerpt_fr: Mapped[str | None] = mapped_column(String(512))
    excerpt_en: Mapped[str | None] = mapped_column(String(512))
    content_fr: Mapped[str | None] = mapped_column(Text)
    content_en: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(16), default=ContentStatus.DRAFT, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    cover_url: Mapped[str | None] = mapped_column(String(512))
    cover_alt_fr: Mapped[str | None] = mapped_column(String(255))
    cover_alt_en: Mapped[str | None] = mapped_column(String(255))

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reading_minutes: Mapped[int] = mapped_column(Integer, default=1)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    canonical_url: Mapped[str | None] = mapped_column(String(1024))
    external_url: Mapped[str | None] = mapped_column(String(1024))

    author_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )

    seo_title_fr: Mapped[str | None] = mapped_column(String(255))
    seo_title_en: Mapped[str | None] = mapped_column(String(255))
    seo_description_fr: Mapped[str | None] = mapped_column(String(512))
    seo_description_en: Mapped[str | None] = mapped_column(String(512))

    tags: Mapped[list[Tag]] = relationship(
        secondary=post_tags, back_populates="posts", lazy="selectin"
    )
