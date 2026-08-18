"""Password hashing and JWT issuing/verification."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings

TokenType = Literal["access", "refresh", "reset", "invite"]


# --------------------------------------------------------------------- passwords
def hash_password(password: str) -> str:
    """bcrypt caps input at 72 bytes; pre-hash so long passphrases stay valid."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(_normalize(password), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_normalize(password), hashed.encode())
    except (ValueError, TypeError):
        return False


def _normalize(password: str) -> bytes:
    raw = password.encode()
    if len(raw) > 72:
        return hashlib.sha256(raw).hexdigest().encode()
    return raw


# ------------------------------------------------------------------------ tokens
def create_token(
    subject: str | uuid.UUID,
    token_type: TokenType,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    default_expiry = {
        "access": timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "refresh": timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "reset": timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        "invite": timedelta(days=settings.INVITATION_EXPIRE_DAYS),
    }[token_type]
    expire = now + (expires_delta or default_expiry)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except InvalidTokenError:
        return None
    if expected_type and payload.get("type") != expected_type:
        return None
    return payload


def create_access_token(user_id: uuid.UUID, role: str) -> str:
    return create_token(user_id, "access", extra_claims={"role": role})


def create_refresh_token(user_id: uuid.UUID) -> tuple[str, str, datetime]:
    """Return `(jwt, sha256_digest, expires_at)`; only the digest is stored."""
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    token = create_token(user_id, "refresh")
    return token, hash_token(token), expires_at


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_secret(length: int = 32) -> str:
    return secrets.token_urlsafe(length)
