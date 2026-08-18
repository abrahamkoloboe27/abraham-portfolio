"""Uploaded files (images, PDFs) and inbound contact messages."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.db.types import JSONType
from app.models.enums import MediaFolder

if TYPE_CHECKING:
    from app.models.user import User


class MediaAsset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "media_assets"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    folder: Mapped[str] = mapped_column(String(32), default=MediaFolder.GENERAL, index=True)
    alt_fr: Mapped[str | None] = mapped_column(String(255))
    alt_en: Mapped[str | None] = mapped_column(String(255))
    caption_fr: Mapped[str | None] = mapped_column(String(512))
    caption_en: Mapped[str | None] = mapped_column(String(512))
    checksum: Mapped[str | None] = mapped_column(String(64), index=True)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )

    uploaded_by: Mapped[User | None] = relationship("User", lazy="joined")


class ContactMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "contact_messages"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    locale: Mapped[str] = mapped_column(String(5), default="fr")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_spam: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    referrer: Mapped[str | None] = mapped_column(String(1024))


class PageView(Base, UUIDMixin):
    """Lightweight, cookie-free traffic counter powering the admin dashboard."""

    __tablename__ = "page_views"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    path: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(32), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), index=True)
    locale: Mapped[str | None] = mapped_column(String(5))
    referrer: Mapped[str | None] = mapped_column(String(1024))
    country: Mapped[str | None] = mapped_column(String(8))
    # Daily rotating hash of IP + UA: unique-visitor counting without storing PII.
    visitor_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    meta: Mapped[dict | None] = mapped_column(JSONType, default=dict)
