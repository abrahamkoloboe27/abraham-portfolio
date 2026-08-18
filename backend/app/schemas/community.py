"""Organizations, talks/trainings and video playlists."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import TalkType
from app.schemas.common import OrderedOut

SLUG_PATTERN = r"^[a-z0-9][a-z0-9-]*$"


# --------------------------------------------------------------- organizations
class OrganizationBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=96)
    name: str
    role_fr: str | None = None
    role_en: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    logo_url: str | None = None
    url: str | None = None
    since: date | None = None
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    name: str | None = None
    role_fr: str | None = None
    role_en: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    logo_url: str | None = None
    url: str | None = None
    since: date | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class OrganizationOut(OrderedOut, OrganizationBase):
    pass


# ----------------------------------------------------------------------- talks
class TalkBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=160)
    title_fr: str
    title_en: str
    type: TalkType = TalkType.TALK
    event_name: str | None = None
    organization_id: uuid.UUID | None = None
    description_fr: str | None = None
    description_en: str | None = None
    abstract_fr: str | None = None
    abstract_en: str | None = None
    event_date: date | None = None
    end_date: date | None = None
    location: str | None = None
    is_online: bool = False
    language: str = "fr"
    audience_size: int | None = None
    duration_minutes: int | None = None
    cover_url: str | None = None
    slides_url: str | None = None
    video_url: str | None = None
    repo_url: str | None = None
    event_url: str | None = None
    gallery: list[dict] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class TalkCreate(TalkBase):
    pass


class TalkUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    title_fr: str | None = None
    title_en: str | None = None
    type: TalkType | None = None
    event_name: str | None = None
    organization_id: uuid.UUID | None = None
    description_fr: str | None = None
    description_en: str | None = None
    abstract_fr: str | None = None
    abstract_en: str | None = None
    event_date: date | None = None
    end_date: date | None = None
    location: str | None = None
    is_online: bool | None = None
    language: str | None = None
    audience_size: int | None = None
    duration_minutes: int | None = None
    cover_url: str | None = None
    slides_url: str | None = None
    video_url: str | None = None
    repo_url: str | None = None
    event_url: str | None = None
    gallery: list[dict] | None = None
    topics: list[str] | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class TalkOut(OrderedOut, TalkBase):
    organization: OrganizationOut | None = None


# ------------------------------------------------------------------- playlists
class VideoBase(BaseModel):
    title: str
    description: str | None = None
    external_id: str | None = None
    url: str
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    published_at: date | None = None
    playlist_id: uuid.UUID | None = None
    position: int = 0
    is_visible: bool = True


class VideoCreate(VideoBase):
    pass


class VideoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    external_id: str | None = None
    url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    published_at: date | None = None
    playlist_id: uuid.UUID | None = None
    position: int | None = None
    is_visible: bool | None = None


class VideoOut(OrderedOut, VideoBase):
    pass


class PlaylistBase(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=160)
    title_fr: str
    title_en: str
    description_fr: str | None = None
    description_en: str | None = None
    provider: str = "youtube"
    external_id: str | None = None
    url: str
    thumbnail_url: str | None = None
    video_count: int | None = None
    level: str | None = None
    topics: list[str] = Field(default_factory=list)
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class PlaylistCreate(PlaylistBase):
    pass


class PlaylistUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    title_fr: str | None = None
    title_en: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    provider: str | None = None
    external_id: str | None = None
    url: str | None = None
    thumbnail_url: str | None = None
    video_count: int | None = None
    level: str | None = None
    topics: list[str] | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class PlaylistOut(OrderedOut, PlaylistBase):
    videos: list[VideoOut] = Field(default_factory=list)
