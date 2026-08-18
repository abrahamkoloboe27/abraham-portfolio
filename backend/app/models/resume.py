"""Career timeline: experience, education, certifications and skills."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, OrderedMixin, TimestampMixin, UUIDMixin
from app.db.types import JSONType


class Experience(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "experiences"

    company: Mapped[str] = mapped_column(String(255), nullable=False)
    company_url: Mapped[str | None] = mapped_column(String(512))
    company_logo_url: Mapped[str | None] = mapped_column(String(512))
    role_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    role_en: Mapped[str] = mapped_column(String(255), nullable=False)
    employment_type: Mapped[str | None] = mapped_column(String(64))
    location: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    summary_fr: Mapped[str | None] = mapped_column(Text)
    summary_en: Mapped[str | None] = mapped_column(Text)
    # [{"fr": "...", "en": "..."}] — bullet points rendered as a list
    highlights: Mapped[list | None] = mapped_column(JSONType, default=list)
    tech: Mapped[list | None] = mapped_column(JSONType, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class Education(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "education"

    school: Mapped[str] = mapped_column(String(255), nullable=False)
    school_url: Mapped[str | None] = mapped_column(String(512))
    school_logo_url: Mapped[str | None] = mapped_column(String(512))
    degree_fr: Mapped[str] = mapped_column(String(255), nullable=False)
    degree_en: Mapped[str] = mapped_column(String(255), nullable=False)
    field_fr: Mapped[str | None] = mapped_column(String(255))
    field_en: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    start_year: Mapped[int | None] = mapped_column(Integer)
    end_year: Mapped[int | None] = mapped_column(Integer)
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)


class Certification(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "certifications"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer_logo_url: Mapped[str | None] = mapped_column(String(512))
    issued_at: Mapped[date | None] = mapped_column(Date, index=True)
    expires_at: Mapped[date | None] = mapped_column(Date)
    credential_id: Mapped[str | None] = mapped_column(String(255))
    credential_url: Mapped[str | None] = mapped_column(String(1024))
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class SkillCategory(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "skill_categories"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name_fr: Mapped[str] = mapped_column(String(128), nullable=False)
    name_en: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64))
    description_fr: Mapped[str | None] = mapped_column(String(512))
    description_en: Mapped[str | None] = mapped_column(String(512))

    skills: Mapped[list[Skill]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Skill.position",
        lazy="selectin",
    )


class Skill(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "skills"

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("skill_categories.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # 1–5, rendered as a bar/rating in the UI
    level: Mapped[int] = mapped_column(Integer, default=4)
    icon: Mapped[str | None] = mapped_column(String(64))
    url: Mapped[str | None] = mapped_column(String(512))
    years_experience: Mapped[float | None] = mapped_column()
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    category: Mapped[SkillCategory | None] = relationship(back_populates="skills")


class Language(Base, UUIDMixin, TimestampMixin, OrderedMixin):
    __tablename__ = "languages"

    name_fr: Mapped[str] = mapped_column(String(64), nullable=False)
    name_en: Mapped[str] = mapped_column(String(64), nullable=False)
    level_fr: Mapped[str] = mapped_column(String(64), nullable=False)
    level_en: Mapped[str] = mapped_column(String(64), nullable=False)
    cefr: Mapped[str | None] = mapped_column(String(8))
