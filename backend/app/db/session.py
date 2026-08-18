"""Async engine + session factory."""

from __future__ import annotations

import ssl
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _connect_args() -> dict[str, Any]:
    """Supabase/Neon require TLS; local Postgres and SQLite must not get an ssl kwarg."""
    url = settings.DATABASE_URL
    if "sqlite" in url:
        return {}
    needs_tls = any(host in url for host in ("supabase.co", "supabase.com", "neon.tech", "aws"))
    if not needs_tls:
        return {}
    ctx = ssl.create_default_context()
    return {"ssl": ctx}


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "echo": settings.DB_ECHO,
        "future": True,
        "pool_pre_ping": True,
        "connect_args": _connect_args(),
    }
    if "sqlite" in settings.DATABASE_URL:
        kwargs["poolclass"] = NullPool
    else:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
        kwargs["pool_recycle"] = 1800
    return kwargs


engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs())

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — commits on success, rolls back on any exception."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
