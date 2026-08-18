"""Shared FastAPI dependencies: DB session, current user, role guards."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import ROLE_LEVEL, UserRole
from app.models.user import User
from app.schemas.common import PaginationParams

bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")

DbSession = Annotated[AsyncSession, Depends(get_db)]

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Identifiants invalides ou session expirée",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise CREDENTIALS_ERROR
    payload = decode_token(credentials.credentials, expected_type="access")
    if not payload:
        raise CREDENTIALS_ERROR
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise CREDENTIALS_ERROR from exc

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(minimum: UserRole) -> Callable[[User], User]:
    """Guard a route with the lowest role allowed to call it."""

    threshold = ROLE_LEVEL[minimum]

    def _guard(user: CurrentUser) -> User:
        if ROLE_LEVEL.get(user.role, 0) < threshold:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle « {minimum} » requis pour cette action",
            )
        return user

    return _guard


RequireViewer = Annotated[User, Depends(require_role(UserRole.VIEWER))]
RequireEditor = Annotated[User, Depends(require_role(UserRole.EDITOR))]
RequireAdmin = Annotated[User, Depends(require_role(UserRole.ADMIN))]
RequireOwner = Annotated[User, Depends(require_role(UserRole.OWNER))]


async def get_optional_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User | None:
    """Lets public endpoints reveal drafts to a signed-in editor (preview mode)."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials, expected_type="access")
    if not payload:
        return None
    try:
        user = await db.get(User, uuid.UUID(payload["sub"]))
    except ValueError:
        return None
    return user if user and user.is_active else None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginationParams:
    return PaginationParams(page=page, per_page=per_page)


Pagination = Annotated[PaginationParams, Depends(pagination)]


async def save_and_refresh[T](db: AsyncSession, obj: T) -> T:
    """Flush, then reload the row before it is serialized.

    Columns computed by the database (`created_at`, `updated_at` and their
    `server_default` / `onupdate` clauses) are expired by the flush. Reading them
    later — during response serialization — would emit a lazy SELECT outside the
    async context and raise `MissingGreenlet`. Refreshing here keeps that IO
    inside the request's async scope.
    """
    await db.flush()
    await db.refresh(obj)
    return obj


async def unique_or_409(
    db: AsyncSession, model: type, field: str, value: str, exclude_id: uuid.UUID | None = None
) -> None:
    stmt = select(model).where(getattr(model, field) == value)
    if exclude_id:
        stmt = stmt.where(model.id != exclude_id)
    if (await db.execute(stmt.limit(1))).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La valeur « {value} » est déjà utilisée pour le champ {field}",
        )
