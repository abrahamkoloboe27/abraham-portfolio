"""Contact inbox management."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app import schemas
from app.api.deps import DbSession, RequireEditor, RequireViewer
from app.models.media import ContactMessage
from app.schemas.common import Page

router = APIRouter()


@router.get("", response_model=Page[schemas.ContactMessageOut], summary="Boîte de réception")
async def list_messages(
    db: DbSession,
    _: RequireViewer,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 25,
    unread: bool | None = None,
    archived: bool = False,
    spam: bool = False,
    search: str | None = None,
) -> Page[schemas.ContactMessageOut]:
    conditions = [
        ContactMessage.is_archived.is_(archived),
        ContactMessage.is_spam.is_(spam),
    ]
    if unread is not None:
        conditions.append(ContactMessage.is_read.is_(not unread))
    if search:
        pattern = f"%{search.lower()}%"
        conditions.append(
            or_(
                func.lower(ContactMessage.name).like(pattern),
                func.lower(ContactMessage.email).like(pattern),
                func.lower(ContactMessage.message).like(pattern),
            )
        )

    total = (
        await db.execute(select(func.count()).select_from(ContactMessage).where(*conditions))
    ).scalar_one()
    rows = (
        (
            await db.execute(
                select(ContactMessage)
                .where(*conditions)
                .order_by(ContactMessage.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .scalars()
        .all()
    )
    return Page.build(
        [schemas.ContactMessageOut.model_validate(row) for row in rows], total, page, per_page
    )


@router.get("/{message_id}", response_model=schemas.ContactMessageOut, summary="Lire un message")
async def get_message(message_id: uuid.UUID, db: DbSession, _: RequireViewer) -> Any:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message introuvable")
    if not message.is_read:
        message.is_read = True
    return message


@router.patch(
    "/{message_id}", response_model=schemas.ContactMessageOut, summary="Mettre à jour un message"
)
async def update_message(
    message_id: uuid.UUID,
    payload: schemas.ContactMessageUpdate,
    db: DbSession,
    _: RequireEditor,
) -> Any:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(message, key, value)
    await db.flush()
    return message


@router.delete("/{message_id}", response_model=schemas.Message, summary="Supprimer un message")
async def delete_message(message_id: uuid.UUID, db: DbSession, _: RequireEditor) -> schemas.Message:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message introuvable")
    await db.delete(message)
    return schemas.Message(detail="Message supprimé")
