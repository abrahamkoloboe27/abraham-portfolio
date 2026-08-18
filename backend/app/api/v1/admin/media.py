"""Media library: upload, browse, annotate and delete assets."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select

from app import schemas
from app.api.deps import DbSession, RequireEditor, RequireViewer
from app.core.config import settings
from app.models.enums import AuditAction, MediaFolder
from app.models.media import MediaAsset
from app.schemas.common import Page
from app.services import audit
from app.services.storage import build_key, get_storage, guess_content_type

router = APIRouter()


@router.get("", response_model=Page[schemas.MediaAssetOut], summary="Bibliothèque de médias")
async def list_media(
    db: DbSession,
    _: RequireViewer,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 40,
    folder: MediaFolder | None = None,
    search: str | None = None,
) -> Page[schemas.MediaAssetOut]:
    conditions = []
    if folder:
        conditions.append(MediaAsset.folder == folder)
    if search:
        conditions.append(func.lower(MediaAsset.filename).like(f"%{search.lower()}%"))

    total = (
        await db.execute(select(func.count()).select_from(MediaAsset).where(*conditions))
    ).scalar_one()
    rows = (
        (
            await db.execute(
                select(MediaAsset)
                .where(*conditions)
                .order_by(MediaAsset.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .unique()
        .scalars()
        .all()
    )
    return Page.build(
        [schemas.MediaAssetOut.model_validate(row) for row in rows], total, page, per_page
    )


@router.post(
    "/upload",
    response_model=schemas.MediaAssetOut,
    status_code=status.HTTP_201_CREATED,
    summary="Téléverser un fichier",
)
async def upload_media(
    db: DbSession,
    user: RequireEditor,
    request: Request,
    file: Annotated[UploadFile, File(description="Image (jpg/png/webp/svg/gif) ou PDF")],
    folder: Annotated[MediaFolder, Form()] = MediaFolder.GENERAL,
    alt_fr: Annotated[str | None, Form()] = None,
    alt_en: Annotated[str | None, Form()] = None,
) -> Any:
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE_MB} Mo)",
        )
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fichier vide")

    content_type = file.content_type or guess_content_type(file.filename or "file")
    if content_type not in settings.ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Type non autorisé : {content_type}",
        )

    storage = get_storage()
    key = build_key(str(folder), file.filename or "upload.bin")
    stored = await storage.upload(content, key, content_type)

    # Same bytes uploaded twice → reuse the existing row instead of duplicating.
    duplicate = (
        await db.execute(select(MediaAsset).where(MediaAsset.checksum == stored.checksum))
    ).scalar_one_or_none()
    if duplicate is not None:
        await storage.delete(key)
        return duplicate

    asset = MediaAsset(
        filename=file.filename or key.rsplit("/", 1)[-1],
        storage_key=stored.key,
        url=stored.url,
        mime_type=content_type,
        size_bytes=stored.size,
        width=stored.width,
        height=stored.height,
        folder=folder,
        alt_fr=alt_fr,
        alt_en=alt_en,
        checksum=stored.checksum,
        uploaded_by_id=user.id,
    )
    db.add(asset)
    await db.flush()
    await audit.record(
        db,
        action=AuditAction.UPLOAD,
        entity_type="media",
        entity_id=str(asset.id),
        entity_label=asset.filename,
        actor=user,
        changes={"size": stored.size, "folder": str(folder)},
        request=request,
    )
    return asset


@router.patch(
    "/{asset_id}", response_model=schemas.MediaAssetOut, summary="Modifier les métadonnées"
)
async def update_media(
    asset_id: uuid.UUID, payload: schemas.MediaAssetUpdate, db: DbSession, _: RequireEditor
) -> Any:
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Média introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    await db.flush()
    return asset


@router.delete("/{asset_id}", response_model=schemas.Message, summary="Supprimer un média")
async def delete_media(
    asset_id: uuid.UUID, db: DbSession, user: RequireEditor, request: Request
) -> schemas.Message:
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Média introuvable")

    await get_storage().delete(asset.storage_key)
    filename = asset.filename
    await db.delete(asset)
    await audit.record(
        db,
        action=AuditAction.DELETE,
        entity_type="media",
        entity_id=str(asset_id),
        entity_label=filename,
        actor=user,
        request=request,
    )
    return schemas.Message(detail=f"{filename} supprimé")
