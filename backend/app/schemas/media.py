"""Media library, contact inbox, analytics and the aggregated public payload."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import MediaFolder
from app.schemas.common import ORMModel, TimestampedOut
from app.schemas.community import OrganizationOut, PlaylistOut, TalkOut
from app.schemas.content import PostSummaryOut, ProjectSummaryOut, TagOut
from app.schemas.resume import (
    CertificationOut,
    EducationOut,
    ExperienceOut,
    LanguageOut,
    SkillCategoryOut,
)
from app.schemas.site import (
    NavItemOut,
    SectionOut,
    SiteSettingsOut,
    SocialLinkOut,
    StatOut,
    TestimonialOut,
)


# ----------------------------------------------------------------------- media
class MediaAssetOut(TimestampedOut):
    filename: str
    storage_key: str
    url: str
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    folder: MediaFolder
    alt_fr: str | None = None
    alt_en: str | None = None
    caption_fr: str | None = None
    caption_en: str | None = None
    uploaded_by_id: uuid.UUID | None = None


class MediaAssetUpdate(BaseModel):
    filename: str | None = None
    folder: MediaFolder | None = None
    alt_fr: str | None = None
    alt_en: str | None = None
    caption_fr: str | None = None
    caption_en: str | None = None


# --------------------------------------------------------------------- contact
class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    company: str | None = Field(default=None, max_length=255)
    subject: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=10, max_length=5000)
    locale: str = "fr"
    # Hidden field: real users leave it empty, most bots fill it in.
    honeypot: str | None = Field(default=None, max_length=255)


class ContactMessageOut(TimestampedOut):
    name: str
    email: EmailStr
    company: str | None = None
    subject: str | None = None
    message: str
    locale: str
    is_read: bool
    is_archived: bool
    is_spam: bool
    replied_at: datetime | None = None
    notes: str | None = None
    ip_address: str | None = None
    referrer: str | None = None


class ContactMessageUpdate(BaseModel):
    is_read: bool | None = None
    is_archived: bool | None = None
    is_spam: bool | None = None
    replied_at: datetime | None = None
    notes: str | None = None


# ------------------------------------------------------------------- analytics
class PageViewCreate(BaseModel):
    path: str = Field(max_length=512)
    entity_type: str | None = None
    entity_id: str | None = None
    locale: str | None = None
    referrer: str | None = None


class TimeseriesPoint(BaseModel):
    date: str
    value: int


class TopEntry(BaseModel):
    label: str
    value: int
    href: str | None = None


class DashboardStats(BaseModel):
    projects_total: int
    projects_published: int
    posts_total: int
    posts_published: int
    talks_total: int
    playlists_total: int
    media_total: int
    messages_total: int
    messages_unread: int
    users_total: int
    views_30d: int
    views_7d: int
    visitors_30d: int
    views_timeseries: list[TimeseriesPoint] = Field(default_factory=list)
    top_pages: list[TopEntry] = Field(default_factory=list)
    top_referrers: list[TopEntry] = Field(default_factory=list)
    recent_messages: list[ContactMessageOut] = Field(default_factory=list)


# -------------------------------------------------------- aggregated public API
class SiteBundle(ORMModel):
    """One request returns everything the home page needs — fewer round-trips."""

    settings: SiteSettingsOut
    sections: list[SectionOut] = Field(default_factory=list)
    nav: list[NavItemOut] = Field(default_factory=list)
    socials: list[SocialLinkOut] = Field(default_factory=list)
    stats: list[StatOut] = Field(default_factory=list)
    experiences: list[ExperienceOut] = Field(default_factory=list)
    education: list[EducationOut] = Field(default_factory=list)
    certifications: list[CertificationOut] = Field(default_factory=list)
    skill_categories: list[SkillCategoryOut] = Field(default_factory=list)
    languages: list[LanguageOut] = Field(default_factory=list)
    organizations: list[OrganizationOut] = Field(default_factory=list)
    featured_projects: list[ProjectSummaryOut] = Field(default_factory=list)
    latest_posts: list[PostSummaryOut] = Field(default_factory=list)
    featured_talks: list[TalkOut] = Field(default_factory=list)
    playlists: list[PlaylistOut] = Field(default_factory=list)
    testimonials: list[TestimonialOut] = Field(default_factory=list)
    tags: list[TagOut] = Field(default_factory=list)
