"""Everything Abraham teaches or publishes: talks, trainings, YouTube playlists."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, OrderedMixin, TimestampMixin, UUIDMixin
from app.db.types import JSONType
from app.models.enums import TalkType


class Organization(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """Communities and programmes he contributes to (Python Bénin, ATUT, …)."""

    __tablename__ = "organizations"

    slug: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_fr: Mapped[str | None] = mapped_column(String(255))
    role_en: Mapped[str | None] = mapped_column(String(255))
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(512))
    url: Mapped[str | None] = mapped_column(String(1024))
    since: Mapped[date | None] = mapped_column(Date)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    talks: Mapped[list[Talk]] = relationship(back_populates="organization")


class Talk(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """A training session, workshop, meetup talk or course given by Abraham."""

    __tablename__ = "talks"

    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    title_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(32), default=TalkType.TALK, index=True)
    event_name: Mapped[str | None] = mapped_column(String(255))
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="SET NULL"), index=True
    )
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    abstract_fr: Mapped[str | None] = mapped_column(String(512))
    abstract_en: Mapped[str | None] = mapped_column(String(512))

    event_date: Mapped[date | None] = mapped_column(Date, index=True)
    end_date: Mapped[date | None] = mapped_column(Date)
    location: Mapped[str | None] = mapped_column(String(255))
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(5), default="fr")
    audience_size: Mapped[int | None] = mapped_column(Integer)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)

    cover_url: Mapped[str | None] = mapped_column(String(512))
    slides_url: Mapped[str | None] = mapped_column(String(1024))
    video_url: Mapped[str | None] = mapped_column(String(1024))
    repo_url: Mapped[str | None] = mapped_column(String(1024))
    event_url: Mapped[str | None] = mapped_column(String(1024))
    gallery: Mapped[list | None] = mapped_column(JSONType, default=list)
    topics: Mapped[list | None] = mapped_column(JSONType, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    organization: Mapped[Organization | None] = relationship(
        back_populates="talks", lazy="selectin"
    )


class Playlist(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """A YouTube playlist (série de vidéos de formation)."""

    __tablename__ = "playlists"

    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    title_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(32), default="youtube")
    external_id: Mapped[str | None] = mapped_column(String(128), index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024))
    video_count: Mapped[int | None] = mapped_column(Integer)
    level: Mapped[str | None] = mapped_column(String(32))
    topics: Mapped[list | None] = mapped_column(JSONType, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    videos: Mapped[list[Video]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="Video.position",
        lazy="selectin",
    )


class Video(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "videos"

    playlist_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("playlists.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    external_id: Mapped[str | None] = mapped_column(String(64), index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    published_at: Mapped[date | None] = mapped_column(Date)

    playlist: Mapped[Playlist | None] = relationship(back_populates="videos")
