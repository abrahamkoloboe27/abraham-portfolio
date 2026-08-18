"""Write-side audit trail for every admin mutation."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AuditAction
from app.models.user import AuditLog, User

# Never copy these into the audit payload.
REDACTED_FIELDS = {"password", "hashed_password", "token", "token_hash", "secret"}


def _sanitize(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not payload:
        return None
    return {
        key: ("***" if key in REDACTED_FIELDS else _jsonable(value))
        for key, value in payload.items()
    }


def _jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [_jsonable(v) for v in value]
    if isinstance(value, str | int | float | bool | type(None)):
        return value
    return str(value)


async def record(
    db: AsyncSession,
    *,
    action: AuditAction | str,
    entity_type: str,
    entity_id: str | None = None,
    entity_label: str | None = None,
    actor: User | None = None,
    changes: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    entry = AuditLog(
        created_at=datetime.now(UTC),
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        action=str(action),
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_label=entity_label,
        changes=_sanitize(changes),
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(entry)


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    # Behind Caddy/Traefik/Vercel the real IP is the first hop.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
