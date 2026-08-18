"""Authentication, session and access-sharing payloads."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole
from app.schemas.common import ORMModel, TimestampedOut

Password = Annotated[str, Field(min_length=10, max_length=128)]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(TimestampedOut):
    email: EmailStr
    full_name: str
    role: UserRole
    avatar_url: str | None = None
    is_active: bool
    locale: str = "fr"
    last_login_at: datetime | None = None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: Password
    role: UserRole = UserRole.EDITOR
    locale: str = "fr"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    avatar_url: str | None = None
    locale: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: Password


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: Password


class InvitationCreate(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.EDITOR
    message: str | None = Field(default=None, max_length=1000)


class InvitationOut(TimestampedOut):
    email: EmailStr
    role: UserRole
    status: str
    expires_at: datetime
    accepted_at: datetime | None = None
    message: str | None = None
    invited_by_id: uuid.UUID | None = None
    # Only returned once, right after creation, when SMTP is not configured.
    invite_url: str | None = None


class InvitationAccept(BaseModel):
    token: str
    full_name: str = Field(min_length=2, max_length=255)
    password: Password


class SessionOut(ORMModel):
    id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    user_agent: str | None = None
    ip_address: str | None = None


class AuditLogOut(ORMModel):
    id: uuid.UUID
    created_at: datetime
    actor_id: uuid.UUID | None = None
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    entity_label: str | None = None
    changes: dict | None = None
    ip_address: str | None = None
