"""Team management: accounts and invitation-based access sharing."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from sqlalchemy import func, select

from app import schemas
from app.api.deps import CurrentUser, DbSession, RequireAdmin, RequireOwner
from app.core.config import settings
from app.core.security import create_token, decode_token, hash_password, hash_token
from app.models.enums import ROLE_LEVEL, AuditAction, UserRole
from app.models.user import Invitation, RefreshToken, User
from app.schemas.common import Page
from app.services import audit
from app.services.email import send_invitation_email
from app.utils.text import ensure_aware

router = APIRouter()


def _assert_can_target(actor: User, target_role: str) -> None:
    """An admin may never create or promote someone above their own level."""
    if ROLE_LEVEL.get(target_role, 0) > ROLE_LEVEL.get(actor.role, 0):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Vous ne pouvez pas attribuer un rôle supérieur au vôtre",
        )


# ----------------------------------------------------------------------- users
@router.get("/users", response_model=Page[schemas.UserOut], summary="Lister les accès")
async def list_users(
    db: DbSession, _: RequireAdmin, page: int = 1, per_page: int = 50
) -> Page[schemas.UserOut]:
    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    rows = (
        (
            await db.execute(
                select(User)
                .order_by(User.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .scalars()
        .all()
    )
    return Page.build([schemas.UserOut.model_validate(row) for row in rows], total, page, per_page)


@router.post(
    "/users",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un accès directement",
)
async def create_user(
    payload: schemas.UserCreate, db: DbSession, actor: RequireAdmin, request: Request
) -> Any:
    _assert_can_target(actor, payload.role)
    existing = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Un compte existe déjà pour cet email")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        locale=payload.locale,
    )
    db.add(user)
    await db.flush()
    await audit.record(
        db,
        action=AuditAction.CREATE,
        entity_type="user",
        entity_id=str(user.id),
        entity_label=user.email,
        actor=actor,
        changes={"role": payload.role},
        request=request,
    )
    return user


@router.patch("/users/{user_id}", response_model=schemas.UserOut, summary="Modifier un accès")
async def update_user(
    user_id: uuid.UUID,
    payload: schemas.UserUpdate,
    db: DbSession,
    actor: RequireAdmin,
    request: Request,
) -> Any:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    if target.is_owner and not actor.is_owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Le compte propriétaire est protégé")

    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        _assert_can_target(actor, data["role"])
        if target.is_owner and data["role"] != UserRole.OWNER:
            await _assert_not_last_owner(db, target)
    if data.get("is_active") is False and target.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas vous désactiver")

    for key, value in data.items():
        setattr(target, key, value)
    await db.flush()
    await audit.record(
        db,
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=str(target.id),
        entity_label=target.email,
        actor=actor,
        changes=data,
        request=request,
    )
    return target


@router.delete("/users/{user_id}", response_model=schemas.Message, summary="Révoquer un accès")
async def delete_user(
    user_id: uuid.UUID, db: DbSession, actor: RequireOwner, request: Request
) -> schemas.Message:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    if target.id == actor.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas supprimer votre compte"
        )
    if target.is_owner:
        await _assert_not_last_owner(db, target)

    email = target.email
    await db.delete(target)
    await audit.record(
        db,
        action=AuditAction.DELETE,
        entity_type="user",
        entity_id=str(user_id),
        entity_label=email,
        actor=actor,
        request=request,
    )
    return schemas.Message(detail=f"Accès révoqué pour {email}")


async def _assert_not_last_owner(db: DbSession, target: User) -> None:
    owners = (
        await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.OWNER))
    ).scalar_one()
    if owners <= 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Impossible : ce compte est le dernier propriétaire du site",
        )


# ----------------------------------------------------------------- invitations
@router.get(
    "/invitations", response_model=list[schemas.InvitationOut], summary="Invitations envoyées"
)
async def list_invitations(db: DbSession, _: RequireAdmin) -> Any:
    stmt = select(Invitation).order_by(Invitation.created_at.desc()).limit(100)
    return (await db.execute(stmt)).scalars().all()


@router.post(
    "/invitations",
    response_model=schemas.InvitationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Partager un accès par email",
)
async def create_invitation(
    payload: schemas.InvitationCreate,
    db: DbSession,
    actor: RequireAdmin,
    request: Request,
    background: BackgroundTasks,
) -> schemas.InvitationOut:
    _assert_can_target(actor, payload.role)
    email = payload.email.lower()
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Un compte existe déjà pour cet email")

    raw_token = create_token(uuid.uuid4(), "invite", extra_claims={"email": email})
    invitation = Invitation(
        email=email,
        role=payload.role,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.INVITATION_EXPIRE_DAYS),
        message=payload.message,
        invited_by_id=actor.id,
    )
    db.add(invitation)
    await db.flush()

    invite_url = f"{settings.ADMIN_SITE_URL.rstrip('/')}/accept-invite?token={raw_token}"
    background.add_task(send_invitation_email, email, invite_url, actor.full_name, payload.role)

    await audit.record(
        db,
        action=AuditAction.INVITE,
        entity_type="invitation",
        entity_id=str(invitation.id),
        entity_label=email,
        actor=actor,
        changes={"role": payload.role},
        request=request,
    )

    result = schemas.InvitationOut.model_validate(invitation)
    # Without SMTP the link must still reach the admin — it is shown once in the UI.
    if not settings.SMTP_HOST:
        result.invite_url = invite_url
    return result


@router.delete(
    "/invitations/{invitation_id}",
    response_model=schemas.Message,
    summary="Révoquer une invitation",
)
async def revoke_invitation(
    invitation_id: uuid.UUID, db: DbSession, actor: RequireAdmin
) -> schemas.Message:
    invitation = await db.get(Invitation, invitation_id)
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation introuvable")
    invitation.revoked_at = datetime.now(UTC)
    return schemas.Message(detail="Invitation révoquée")


@router.post(
    "/invitations/accept",
    response_model=schemas.TokenPair,
    summary="Accepter une invitation (public)",
)
async def accept_invitation(
    payload: schemas.InvitationAccept, db: DbSession, request: Request
) -> schemas.TokenPair:
    claims = decode_token(payload.token, expected_type="invite")
    if not claims:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invitation invalide ou expirée")

    invitation = (
        await db.execute(
            select(Invitation).where(Invitation.token_hash == hash_token(payload.token))
        )
    ).scalar_one_or_none()
    if invitation is None or invitation.accepted_at or invitation.revoked_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invitation invalide ou déjà utilisée")
    if ensure_aware(invitation.expires_at) < datetime.now(UTC):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invitation expirée")
    if (await db.execute(select(User).where(User.email == invitation.email))).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Un compte existe déjà pour cet email")

    user = User(
        email=invitation.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=invitation.role,
    )
    db.add(user)
    invitation.accepted_at = datetime.now(UTC)
    await db.flush()

    from app.api.v1.admin.auth import _issue_tokens

    tokens = await _issue_tokens(db, user, request)
    await audit.record(
        db,
        action=AuditAction.CREATE,
        entity_type="user",
        entity_id=str(user.id),
        entity_label=user.email,
        actor=user,
        changes={"via": "invitation", "role": user.role},
        request=request,
    )
    return tokens


@router.get(
    "/invitations/verify",
    response_model=schemas.InvitationOut,
    summary="Vérifier un jeton d'invitation (public)",
)
async def verify_invitation(token: str, db: DbSession) -> Any:
    invitation = (
        await db.execute(select(Invitation).where(Invitation.token_hash == hash_token(token)))
    ).scalar_one_or_none()
    if (
        invitation is None
        or invitation.accepted_at
        or invitation.revoked_at
        or ensure_aware(invitation.expires_at) < datetime.now(UTC)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation invalide ou expirée")
    return invitation


@router.get(
    "/users/{user_id}/sessions",
    response_model=list[schemas.SessionOut],
    summary="Sessions d'un utilisateur",
)
async def user_sessions(user_id: uuid.UUID, db: DbSession, _: RequireAdmin) -> Any:
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.user_id == user_id)
        .order_by(RefreshToken.created_at.desc())
        .limit(50)
    )
    return (await db.execute(stmt)).scalars().all()


@router.post(
    "/users/{user_id}/revoke-sessions",
    response_model=schemas.BulkResult,
    summary="Déconnecter un utilisateur partout",
)
async def revoke_user_sessions(
    user_id: uuid.UUID, db: DbSession, actor: RequireAdmin, request: Request
) -> schemas.BulkResult:
    sessions = (
        (
            await db.execute(
                select(RefreshToken).where(
                    RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    for session in sessions:
        session.revoked_at = datetime.now(UTC)
    await audit.record(
        db,
        action=AuditAction.UPDATE,
        entity_type="session",
        entity_id=str(user_id),
        actor=actor,
        changes={"revoked": len(sessions)},
        request=request,
    )
    return schemas.BulkResult(updated=len(sessions))


@router.get("/whoami", response_model=schemas.UserOut, summary="Alias de /auth/me")
async def whoami(user: CurrentUser) -> Any:
    return user
