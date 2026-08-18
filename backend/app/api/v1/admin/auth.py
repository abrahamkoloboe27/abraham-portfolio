"""Login, token refresh, session management and self-service account actions."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from sqlalchemy import select

from app import schemas
from app.api.deps import CurrentUser, DbSession, save_and_refresh
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.enums import AuditAction
from app.models.user import RefreshToken, User
from app.services import audit
from app.services.email import send_password_reset_email
from app.utils.text import ensure_aware

router = APIRouter()

INVALID_CREDENTIALS = HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou mot de passe incorrect")


async def _issue_tokens(db: DbSession, user: User, request: Request) -> schemas.TokenPair:
    refresh, digest, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=digest,
            expires_at=expires_at,
            user_agent=request.headers.get("user-agent"),
            ip_address=audit.client_ip(request),
        )
    )
    return schemas.TokenPair(
        access_token=create_access_token(user.id, user.role),
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=schemas.TokenPair, summary="Connexion")
async def login(
    payload: schemas.LoginRequest, db: DbSession, request: Request
) -> schemas.TokenPair:
    stmt = select(User).where(User.email == payload.email.lower())
    user = (await db.execute(stmt)).scalar_one_or_none()

    # Always run the hash comparison so a missing account and a wrong password
    # take the same time — no user enumeration through response latency.
    reference = user.hashed_password if user else "$2b$12$" + "x" * 53
    password_ok = verify_password(payload.password, reference)

    if user is None or not password_ok:
        raise INVALID_CREDENTIALS
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ce compte est désactivé")

    user.last_login_at = datetime.now(UTC)
    tokens = await _issue_tokens(db, user, request)
    await audit.record(
        db,
        action=AuditAction.LOGIN,
        entity_type="session",
        entity_id=str(user.id),
        entity_label=user.email,
        actor=user,
        request=request,
    )
    return tokens


@router.post("/refresh", response_model=schemas.TokenPair, summary="Renouveler la session")
async def refresh_session(
    payload: schemas.RefreshRequest, db: DbSession, request: Request
) -> schemas.TokenPair:
    claims = decode_token(payload.refresh_token, expected_type="refresh")
    if not claims:
        raise INVALID_CREDENTIALS

    digest = hash_token(payload.refresh_token)
    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == digest))
    ).scalar_one_or_none()
    if stored is None or stored.revoked_at is not None:
        raise INVALID_CREDENTIALS
    if ensure_aware(stored.expires_at) < datetime.now(UTC):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expirée, reconnectez-vous")

    user = await db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise INVALID_CREDENTIALS

    # Rotate: the presented refresh token can never be replayed.
    stored.revoked_at = datetime.now(UTC)
    return await _issue_tokens(db, user, request)


@router.post("/logout", response_model=schemas.Message, summary="Déconnexion")
async def logout(
    payload: schemas.RefreshRequest, db: DbSession, user: CurrentUser, request: Request
) -> schemas.Message:
    stored = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(payload.refresh_token))
        )
    ).scalar_one_or_none()
    if stored is not None and stored.user_id == user.id:
        stored.revoked_at = datetime.now(UTC)
    await audit.record(
        db,
        action=AuditAction.LOGOUT,
        entity_type="session",
        entity_id=str(user.id),
        actor=user,
        request=request,
    )
    return schemas.Message(detail="Déconnecté")


@router.get("/me", response_model=schemas.UserOut, summary="Profil connecté")
async def read_me(user: CurrentUser) -> Any:
    return user


@router.patch("/me", response_model=schemas.UserOut, summary="Modifier son profil")
async def update_me(payload: schemas.UserUpdate, db: DbSession, user: CurrentUser) -> Any:
    data = payload.model_dump(exclude_unset=True)
    # Nobody escalates their own role through this endpoint.
    data.pop("role", None)
    data.pop("is_active", None)
    for key, value in data.items():
        setattr(user, key, value)
    return await save_and_refresh(db, user)


@router.post("/me/password", response_model=schemas.Message, summary="Changer son mot de passe")
async def change_password(
    payload: schemas.PasswordChange, db: DbSession, user: CurrentUser, request: Request
) -> schemas.Message:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect")
    user.hashed_password = hash_password(payload.new_password)

    # Invalidate every other session after a credential change.
    sessions = (
        (await db.execute(select(RefreshToken).where(RefreshToken.user_id == user.id)))
        .scalars()
        .all()
    )
    for session in sessions:
        session.revoked_at = datetime.now(UTC)

    await audit.record(
        db,
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=str(user.id),
        entity_label=user.email,
        changes={"password": "***"},
        actor=user,
        request=request,
    )
    return schemas.Message(detail="Mot de passe mis à jour, reconnectez-vous")


@router.get("/me/sessions", response_model=list[schemas.SessionOut], summary="Sessions actives")
async def list_sessions(db: DbSession, user: CurrentUser) -> Any:
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .order_by(RefreshToken.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().all()


@router.delete(
    "/me/sessions/{session_id}", response_model=schemas.Message, summary="Révoquer une session"
)
async def revoke_session(
    session_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> schemas.Message:
    session = await db.get(RefreshToken, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session introuvable")
    session.revoked_at = datetime.now(UTC)
    return schemas.Message(detail="Session révoquée")


@router.post(
    "/password-reset", response_model=schemas.Message, summary="Demander une réinitialisation"
)
async def request_password_reset(
    payload: schemas.PasswordResetRequest, db: DbSession, background: BackgroundTasks
) -> schemas.Message:
    user = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if user is not None and user.is_active:
        token = create_token(user.id, "reset")
        reset_url = f"{settings.ADMIN_SITE_URL.rstrip('/')}/reset-password?token={token}"
        background.add_task(send_password_reset_email, user.email, reset_url)
    # Same answer either way — the endpoint never reveals whether an account exists.
    return schemas.Message(
        detail="Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."
    )


@router.post(
    "/password-reset/confirm",
    response_model=schemas.Message,
    summary="Confirmer la réinitialisation",
)
async def confirm_password_reset(
    payload: schemas.PasswordResetConfirm, db: DbSession
) -> schemas.Message:
    claims = decode_token(payload.token, expected_type="reset")
    if not claims:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")
    try:
        user = await db.get(User, uuid.UUID(claims["sub"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré") from exc
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")

    user.hashed_password = hash_password(payload.new_password)
    sessions = (
        (await db.execute(select(RefreshToken).where(RefreshToken.user_id == user.id)))
        .scalars()
        .all()
    )
    for session in sessions:
        session.revoked_at = datetime.now(UTC)
    return schemas.Message(detail="Mot de passe réinitialisé, vous pouvez vous connecter")
