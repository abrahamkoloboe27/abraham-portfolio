"""Experience, education, certifications, skills and spoken languages."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import OrderedOut


# ------------------------------------------------------------------ experience
class ExperienceBase(BaseModel):
    company: str
    company_url: str | None = None
    company_logo_url: str | None = None
    role_fr: str
    role_en: str
    employment_type: str | None = None
    location: str | None = None
    start_date: date
    end_date: date | None = None
    is_current: bool = False
    summary_fr: str | None = None
    summary_en: str | None = None
    highlights: list[dict] = Field(default_factory=list)
    tech: list[str] = Field(default_factory=list)
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class ExperienceCreate(ExperienceBase):
    pass


class ExperienceUpdate(BaseModel):
    company: str | None = None
    company_url: str | None = None
    company_logo_url: str | None = None
    role_fr: str | None = None
    role_en: str | None = None
    employment_type: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None
    summary_fr: str | None = None
    summary_en: str | None = None
    highlights: list[dict] | None = None
    tech: list[str] | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class ExperienceOut(OrderedOut, ExperienceBase):
    pass


# ------------------------------------------------------------------- education
class EducationBase(BaseModel):
    school: str
    school_url: str | None = None
    school_logo_url: str | None = None
    degree_fr: str
    degree_en: str
    field_fr: str | None = None
    field_en: str | None = None
    location: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int = 0
    is_visible: bool = True


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    school: str | None = None
    school_url: str | None = None
    school_logo_url: str | None = None
    degree_fr: str | None = None
    degree_en: str | None = None
    field_fr: str | None = None
    field_en: str | None = None
    location: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class EducationOut(OrderedOut, EducationBase):
    pass


# --------------------------------------------------------------- certification
class CertificationBase(BaseModel):
    name: str
    issuer: str
    issuer_logo_url: str | None = None
    issued_at: date | None = None
    expires_at: date | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    is_featured: bool = False
    position: int = 0
    is_visible: bool = True


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    name: str | None = None
    issuer: str | None = None
    issuer_logo_url: str | None = None
    issued_at: date | None = None
    expires_at: date | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    is_featured: bool | None = None
    position: int | None = None
    is_visible: bool | None = None


class CertificationOut(OrderedOut, CertificationBase):
    pass


# ---------------------------------------------------------------------- skills
class SkillBase(BaseModel):
    name: str
    level: int = Field(default=4, ge=1, le=5)
    icon: str | None = None
    url: str | None = None
    years_experience: float | None = None
    is_featured: bool = False
    category_id: uuid.UUID | None = None
    position: int = 0
    is_visible: bool = True


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: str | None = None
    level: int | None = Field(default=None, ge=1, le=5)
    icon: str | None = None
    url: str | None = None
    years_experience: float | None = None
    is_featured: bool | None = None
    category_id: uuid.UUID | None = None
    position: int | None = None
    is_visible: bool | None = None


class SkillOut(OrderedOut, SkillBase):
    pass


class SkillCategoryBase(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    name_fr: str
    name_en: str
    icon: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int = 0
    is_visible: bool = True


class SkillCategoryCreate(SkillCategoryBase):
    pass


class SkillCategoryUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-]*$")
    name_fr: str | None = None
    name_en: str | None = None
    icon: str | None = None
    description_fr: str | None = None
    description_en: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class SkillCategoryOut(OrderedOut, SkillCategoryBase):
    skills: list[SkillOut] = Field(default_factory=list)


# ------------------------------------------------------------------- languages
class LanguageBase(BaseModel):
    name_fr: str
    name_en: str
    level_fr: str
    level_en: str
    cefr: str | None = None
    position: int = 0
    is_visible: bool = True


class LanguageCreate(LanguageBase):
    pass


class LanguageUpdate(BaseModel):
    name_fr: str | None = None
    name_en: str | None = None
    level_fr: str | None = None
    level_en: str | None = None
    cefr: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class LanguageOut(OrderedOut, LanguageBase):
    pass
