"""Site settings, social links, navigation, sections, testimonials and stats."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.enums import SectionType
from app.schemas.common import OrderedOut, ORMModel, TimestampedOut


# --------------------------------------------------------------- site settings
class SiteSettingsBase(BaseModel):
    site_name: str | None = None
    full_name: str | None = None
    job_title_fr: str | None = None
    job_title_en: str | None = None
    tagline_fr: str | None = None
    tagline_en: str | None = None
    bio_fr: str | None = None
    bio_en: str | None = None
    quote_fr: str | None = None
    quote_en: str | None = None

    email: str | None = None
    phone: str | None = None
    location: str | None = None
    timezone: str | None = None
    availability_fr: str | None = None
    availability_en: str | None = None
    is_open_to_work: bool | None = None
    calendar_url: str | None = None

    avatar_url: str | None = None
    logo_url: str | None = None
    favicon_url: str | None = None
    og_image_url: str | None = None
    resume_url_fr: str | None = None
    resume_url_en: str | None = None

    seo_title_fr: str | None = None
    seo_title_en: str | None = None
    seo_description_fr: str | None = None
    seo_description_en: str | None = None
    seo_keywords: list[str] | None = None

    theme: dict | None = None
    default_locale: str | None = None
    available_locales: list[str] | None = None
    analytics: dict | None = None
    features: dict | None = None
    maintenance_mode: bool | None = None
    footer_note_fr: str | None = None
    footer_note_en: str | None = None


class SiteSettingsUpdate(SiteSettingsBase):
    """Every field optional — the admin PATCHes only what changed."""


class SiteSettingsOut(TimestampedOut, SiteSettingsBase):
    site_name: str
    full_name: str


# ---------------------------------------------------------------- social links
class SocialLinkBase(BaseModel):
    platform: str = Field(max_length=64)
    label: str = Field(max_length=128)
    url: str = Field(max_length=1024)
    handle: str | None = None
    icon: str | None = None
    show_in_header: bool = False
    show_in_footer: bool = True
    show_in_hero: bool = True
    position: int = 0
    is_visible: bool = True


class SocialLinkCreate(SocialLinkBase):
    pass


class SocialLinkUpdate(BaseModel):
    platform: str | None = None
    label: str | None = None
    url: str | None = None
    handle: str | None = None
    icon: str | None = None
    show_in_header: bool | None = None
    show_in_footer: bool | None = None
    show_in_hero: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class SocialLinkOut(OrderedOut, SocialLinkBase):
    pass


# ------------------------------------------------------------------- nav items
class NavItemBase(BaseModel):
    label_fr: str
    label_en: str
    href: str
    location: str = "header"
    is_external: bool = False
    icon: str | None = None
    position: int = 0
    is_visible: bool = True


class NavItemCreate(NavItemBase):
    pass


class NavItemUpdate(BaseModel):
    label_fr: str | None = None
    label_en: str | None = None
    href: str | None = None
    location: str | None = None
    is_external: bool | None = None
    icon: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class NavItemOut(OrderedOut, NavItemBase):
    pass


# -------------------------------------------------------------------- sections
class SectionBase(BaseModel):
    key: str = Field(max_length=64, pattern=r"^[a-z0-9][a-z0-9-_]*$")
    type: SectionType = SectionType.CUSTOM
    title_fr: str | None = None
    title_en: str | None = None
    subtitle_fr: str | None = None
    subtitle_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    config: dict | None = None
    background: str | None = None
    max_items: int | None = None
    position: int = 0
    is_visible: bool = True


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    key: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-_]*$")
    type: SectionType | None = None
    title_fr: str | None = None
    title_en: str | None = None
    subtitle_fr: str | None = None
    subtitle_en: str | None = None
    content_fr: str | None = None
    content_en: str | None = None
    config: dict | None = None
    background: str | None = None
    max_items: int | None = None
    position: int | None = None
    is_visible: bool | None = None


class SectionOut(OrderedOut, SectionBase):
    pass


# ---------------------------------------------------------------- testimonials
class TestimonialBase(BaseModel):
    author_name: str
    author_role_fr: str | None = None
    author_role_en: str | None = None
    company: str | None = None
    avatar_url: str | None = None
    quote_fr: str | None = None
    quote_en: str | None = None
    source_url: str | None = None
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    author_name: str | None = None
    author_role_fr: str | None = None
    author_role_en: str | None = None
    company: str | None = None
    avatar_url: str | None = None
    quote_fr: str | None = None
    quote_en: str | None = None
    source_url: str | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class TestimonialOut(OrderedOut, TestimonialBase):
    pass


# ----------------------------------------------------------------------- stats
class StatBase(BaseModel):
    key: str = Field(max_length=64)
    label_fr: str
    label_en: str
    value: str
    suffix: str | None = None
    icon: str | None = None
    position: int = 0
    is_visible: bool = True


class StatCreate(StatBase):
    pass


class StatUpdate(BaseModel):
    key: str | None = None
    label_fr: str | None = None
    label_en: str | None = None
    value: str | None = None
    suffix: str | None = None
    icon: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class StatOut(OrderedOut, StatBase):
    pass


class HealthOut(ORMModel):
    status: str
    version: str
    environment: str
    database: str
