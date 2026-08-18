"""Global site configuration, navigation and the drag-and-drop section layout."""

from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrderedMixin, TimestampMixin, UUIDMixin
from app.db.types import JSONType
from app.models.enums import SectionType


class SiteSettings(Base, UUIDMixin, TimestampMixin):
    """Singleton row (`is_singleton = True`) holding everything editable site-wide."""

    __tablename__ = "site_settings"

    is_singleton: Mapped[bool] = mapped_column(Boolean, default=True, unique=True, nullable=False)

    # identity
    site_name: Mapped[str] = mapped_column(String(255), default="Abraham Z. KOLOBOE")
    full_name: Mapped[str] = mapped_column(String(255), default="Sèdjro Abraham Zacharie KOLOBOE")
    job_title_fr: Mapped[str] = mapped_column(String(255), default="Data / ML Engineer")
    job_title_en: Mapped[str] = mapped_column(String(255), default="Data / ML Engineer")
    tagline_fr: Mapped[str | None] = mapped_column(String(512))
    tagline_en: Mapped[str | None] = mapped_column(String(512))
    bio_fr: Mapped[str | None] = mapped_column(Text)
    bio_en: Mapped[str | None] = mapped_column(Text)
    quote_fr: Mapped[str | None] = mapped_column(String(512))
    quote_en: Mapped[str | None] = mapped_column(String(512))

    # contact
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(64))
    location: Mapped[str | None] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Porto-Novo")
    availability_fr: Mapped[str | None] = mapped_column(String(255))
    availability_en: Mapped[str | None] = mapped_column(String(255))
    is_open_to_work: Mapped[bool] = mapped_column(Boolean, default=True)
    calendar_url: Mapped[str | None] = mapped_column(String(512))

    # assets
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    logo_url: Mapped[str | None] = mapped_column(String(512))
    favicon_url: Mapped[str | None] = mapped_column(String(512))
    og_image_url: Mapped[str | None] = mapped_column(String(512))
    resume_url_fr: Mapped[str | None] = mapped_column(String(512))
    resume_url_en: Mapped[str | None] = mapped_column(String(512))

    # seo
    seo_title_fr: Mapped[str | None] = mapped_column(String(255))
    seo_title_en: Mapped[str | None] = mapped_column(String(255))
    seo_description_fr: Mapped[str | None] = mapped_column(String(512))
    seo_description_en: Mapped[str | None] = mapped_column(String(512))
    seo_keywords: Mapped[list | None] = mapped_column(JSONType, default=list)

    # theme + behaviour
    theme: Mapped[dict | None] = mapped_column(JSONType, default=dict)
    default_locale: Mapped[str] = mapped_column(String(5), default="fr")
    available_locales: Mapped[list | None] = mapped_column(JSONType, default=lambda: ["fr", "en"])
    analytics: Mapped[dict | None] = mapped_column(JSONType, default=dict)
    features: Mapped[dict | None] = mapped_column(JSONType, default=dict)
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    footer_note_fr: Mapped[str | None] = mapped_column(String(512))
    footer_note_en: Mapped[str | None] = mapped_column(String(512))


class SocialLink(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """LinkedIn, GitHub, YouTube… every outbound profile scraped from the CV."""

    __tablename__ = "social_links"

    platform: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    handle: Mapped[str | None] = mapped_column(String(128))
    icon: Mapped[str | None] = mapped_column(String(64))
    show_in_header: Mapped[bool] = mapped_column(Boolean, default=False)
    show_in_footer: Mapped[bool] = mapped_column(Boolean, default=True)
    show_in_hero: Mapped[bool] = mapped_column(Boolean, default=True)


class NavItem(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """Header / footer navigation, editable from the admin."""

    __tablename__ = "nav_items"

    label_fr: Mapped[str] = mapped_column(String(128), nullable=False)
    label_en: Mapped[str] = mapped_column(String(128), nullable=False)
    href: Mapped[str] = mapped_column(String(512), nullable=False)
    location: Mapped[str] = mapped_column(String(16), default="header", index=True)
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
    icon: Mapped[str | None] = mapped_column(String(64))


class Section(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """A block on the home page. Adding a section = inserting a row here."""

    __tablename__ = "sections"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(32), default=SectionType.CUSTOM, nullable=False)
    title_fr: Mapped[str | None] = mapped_column(String(255))
    title_en: Mapped[str | None] = mapped_column(String(255))
    subtitle_fr: Mapped[str | None] = mapped_column(String(512))
    subtitle_en: Mapped[str | None] = mapped_column(String(512))
    content_fr: Mapped[str | None] = mapped_column(Text)
    content_en: Mapped[str | None] = mapped_column(Text)
    # Layout knobs (columns, variant, limit, cta…) consumed by the Next.js renderer.
    config: Mapped[dict | None] = mapped_column(JSONType, default=dict)
    background: Mapped[str | None] = mapped_column(String(32))
    max_items: Mapped[int | None] = mapped_column(Integer)


class Testimonial(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "testimonials"

    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role_fr: Mapped[str | None] = mapped_column(String(255))
    author_role_en: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    quote_fr: Mapped[str | None] = mapped_column(Text)
    quote_en: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1024))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class Stat(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    """Headline numbers (années d'expérience, apprenants formés, projets livrés…)."""

    __tablename__ = "stats"

    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label_fr: Mapped[str] = mapped_column(String(128), nullable=False)
    label_en: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(String(32), nullable=False)
    suffix: Mapped[str | None] = mapped_column(String(16))
    icon: Mapped[str | None] = mapped_column(String(64))
