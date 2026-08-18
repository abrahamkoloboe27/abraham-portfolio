"""Generates a complete admin CRUD router for any model/schema triple.

Every managed entity gets list + search + filter + pagination, create, read,
update, delete and drag-and-drop reordering, with RBAC and audit logging applied
consistently — instead of eighteen near-identical routers.
"""

# NOTE: `from __future__ import annotations` must NOT be added here. The generated
# routes annotate their body with the `create_schema` / `update_schema` *variables*,
# which only resolve when annotations are evaluated eagerly at definition time.

import uuid
from collections.abc import Awaitable, Callable, Sequence
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, RequireEditor, RequireViewer, unique_or_409
from app.db.base import Base
from app.models.enums import AuditAction
from app.models.user import User
from app.schemas.common import BulkResult, Message, Page, ReorderPayload
from app.services import audit

Hook = Callable[[AsyncSession, Any, dict[str, Any]], Awaitable[None]]


def _label_of(obj: Any) -> str | None:
    for attr in ("title_fr", "name", "slug", "key", "label", "full_name", "email", "company"):
        value = getattr(obj, attr, None)
        if isinstance(value, str) and value:
            return value[:255]
    return None


def _diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    changed: dict[str, Any] = {}
    for key, new_value in after.items():
        old_value = before.get(key)
        if old_value != new_value:
            changed[key] = {"from": old_value, "to": new_value}
    return changed


def _snapshot(obj: Any, fields: Sequence[str]) -> dict[str, Any]:
    return {field: getattr(obj, field, None) for field in fields}


def make_crud_router(
    *,
    model: type[Base],
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    out_schema: type[BaseModel],
    entity: str,
    tags: list[str],
    search_fields: Sequence[str] = (),
    filter_fields: Sequence[str] = (),
    default_order: Sequence[Any] | None = None,
    unique_fields: Sequence[str] = (),
    on_create: Hook | None = None,
    on_update: Hook | None = None,
    list_options: Sequence[Any] = (),
) -> APIRouter:
    router = APIRouter(tags=tags)
    orderable = default_order or (
        [model.position, model.created_at.desc()]  # type: ignore[attr-defined]
        if hasattr(model, "position")
        else [model.created_at.desc()]  # type: ignore[attr-defined]
    )

    def _base_stmt():
        stmt = select(model)
        for option in list_options:
            stmt = stmt.options(option)
        return stmt

    async def _reload(db: AsyncSession, item_id: uuid.UUID) -> Any:
        """Re-select through `list_options` so relationships are eagerly loaded.

        `session.refresh()` restores columns but leaves relationships unloaded,
        which would make Pydantic trigger lazy IO outside the async context.
        """
        return (
            (await db.execute(_base_stmt().where(model.id == item_id)))  # type: ignore[attr-defined]
            .unique()
            .scalar_one()
        )

    def _apply_filters(stmt, search: str | None, filters: dict[str, str]):
        if search and search_fields:
            pattern = f"%{search.lower()}%"
            clauses = [
                func.lower(func.cast(getattr(model, field), String)).like(pattern)
                for field in search_fields
                if hasattr(model, field)
            ]
            if clauses:
                stmt = stmt.where(or_(*clauses))
        for field, raw in filters.items():
            if raw is None or not hasattr(model, field):
                continue
            column = getattr(model, field)
            if raw.lower() in {"true", "false"}:
                stmt = stmt.where(column.is_(raw.lower() == "true"))
            else:
                stmt = stmt.where(column == raw)
        return stmt

    @router.get("", response_model=Page[out_schema], summary=f"Lister les {entity}")
    async def list_items(  # type: ignore[misc]
        db: DbSession,
        _: RequireViewer,
        request: Request,
        page: int = Query(1, ge=1),
        per_page: int = Query(20, ge=1, le=100),
        search: str | None = Query(None, description="Recherche plein texte simple"),
        order_by: str | None = Query(None, description="Ex: `-created_at`, `position`"),
    ):
        filters = {
            field: request.query_params[field]
            for field in filter_fields
            if field in request.query_params
        }
        stmt = _apply_filters(_base_stmt(), search, filters)

        count_stmt = _apply_filters(select(func.count()).select_from(model), search, filters)
        total = (await db.execute(count_stmt)).scalar_one()

        if order_by:
            descending = order_by.startswith("-")
            column_name = order_by.lstrip("-")
            if hasattr(model, column_name):
                column = getattr(model, column_name)
                stmt = stmt.order_by(column.desc() if descending else column.asc())
            else:
                stmt = stmt.order_by(*orderable)
        else:
            stmt = stmt.order_by(*orderable)

        rows = (
            (await db.execute(stmt.offset((page - 1) * per_page).limit(per_page)))
            .unique()
            .scalars()
            .all()
        )
        return Page.build([out_schema.model_validate(row) for row in rows], total, page, per_page)

    @router.post(
        "",
        response_model=out_schema,
        status_code=status.HTTP_201_CREATED,
        summary=f"Créer un élément ({entity})",
    )
    async def create_item(  # type: ignore[misc]
        payload: create_schema,  # type: ignore[valid-type]
        db: DbSession,
        user: RequireEditor,
        request: Request,
    ):
        data = payload.model_dump(exclude_unset=True)
        for field in unique_fields:
            if field in data and data[field] is not None:
                await unique_or_409(db, model, field, data[field])

        extras = {key: data.pop(key) for key in list(data) if not hasattr(model, key)}
        obj = model(**data)
        db.add(obj)
        if on_create:
            await on_create(db, obj, extras)
        await db.flush()
        obj = await _reload(db, obj.id)

        await audit.record(
            db,
            action=AuditAction.CREATE,
            entity_type=entity,
            entity_id=str(obj.id),
            entity_label=_label_of(obj),
            actor=user,
            changes={"created": data},
            request=request,
        )
        return out_schema.model_validate(obj)

    @router.get("/{item_id}", response_model=out_schema, summary=f"Détail ({entity})")
    async def get_item(item_id: uuid.UUID, db: DbSession, _: RequireViewer):  # type: ignore[misc]
        obj = (
            (await db.execute(_base_stmt().where(model.id == item_id)))  # type: ignore[attr-defined]
            .unique()
            .scalar_one_or_none()
        )
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{entity} introuvable")
        return out_schema.model_validate(obj)

    @router.patch("/{item_id}", response_model=out_schema, summary=f"Modifier ({entity})")
    async def update_item(  # type: ignore[misc]
        item_id: uuid.UUID,
        payload: update_schema,  # type: ignore[valid-type]
        db: DbSession,
        user: RequireEditor,
        request: Request,
    ):
        obj = await db.get(model, item_id)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{entity} introuvable")

        data = payload.model_dump(exclude_unset=True)
        for field in unique_fields:
            if field in data and data[field] is not None:
                await unique_or_409(db, model, field, data[field], exclude_id=item_id)

        extras = {key: data.pop(key) for key in list(data) if not hasattr(model, key)}
        before = _snapshot(obj, list(data))
        for key, value in data.items():
            setattr(obj, key, value)
        if on_update:
            await on_update(db, obj, extras)
        await db.flush()
        obj = await _reload(db, item_id)

        changes = _diff(before, data)
        if changes or extras:
            await audit.record(
                db,
                action=AuditAction.UPDATE,
                entity_type=entity,
                entity_id=str(obj.id),
                entity_label=_label_of(obj),
                actor=user,
                changes=changes,
                request=request,
            )
        return out_schema.model_validate(obj)

    @router.delete("/{item_id}", response_model=Message, summary=f"Supprimer ({entity})")
    async def delete_item(  # type: ignore[misc]
        item_id: uuid.UUID, db: DbSession, user: RequireEditor, request: Request
    ):
        obj = await db.get(model, item_id)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{entity} introuvable")
        label = _label_of(obj)
        await db.delete(obj)
        await audit.record(
            db,
            action=AuditAction.DELETE,
            entity_type=entity,
            entity_id=str(item_id),
            entity_label=label,
            actor=user,
            request=request,
        )
        return Message(detail=f"{entity} supprimé")

    if hasattr(model, "position"):

        @router.post("/reorder", response_model=BulkResult, summary=f"Réordonner ({entity})")
        async def reorder(  # type: ignore[misc]
            payload: ReorderPayload, db: DbSession, user: RequireEditor, request: Request
        ):
            ids = [item.id for item in payload.items]
            rows = (await db.execute(select(model).where(model.id.in_(ids)))).scalars().all()
            by_id = {row.id: row for row in rows}
            updated = 0
            for item in payload.items:
                obj = by_id.get(item.id)
                if obj is not None:
                    obj.position = item.position
                    updated += 1
            await audit.record(
                db,
                action=AuditAction.REORDER,
                entity_type=entity,
                actor=user,
                changes={"count": updated},
                request=request,
            )
            return BulkResult(updated=updated)

    return router


def owner_only_guard(user: User) -> User:
    """Used by routes that must stay reserved to the portfolio owner."""
    if not user.is_owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Réservé au propriétaire du site")
    return user


__all__ = ["Depends", "make_crud_router", "owner_only_guard"]
