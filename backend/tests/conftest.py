"""Test fixtures — everything runs on an in-memory SQLite database."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-used-anywhere-else-0123456789")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("UPLOAD_DIR", "/tmp/portfolio-test-uploads")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.main import app
from app.models.enums import UserRole
from app.models.site import SiteSettings
from app.models.user import User

# StaticPool keeps the same in-memory database across every connection.
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def _schema() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSession() as session:
        yield session
        await session.commit()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async def _override() -> AsyncGenerator[AsyncSession, None]:
        async with TestSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _make_user(role: UserRole, email: str) -> User:
    async with TestSession() as session:
        user = User(
            email=email,
            full_name=f"Test {role}",
            hashed_password=hash_password("SuperSecret123!"),
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
async def owner() -> User:
    return await _make_user(UserRole.OWNER, "owner@example.com")


@pytest.fixture
async def editor() -> User:
    return await _make_user(UserRole.EDITOR, "editor@example.com")


@pytest.fixture
async def viewer() -> User:
    return await _make_user(UserRole.VIEWER, "viewer@example.com")


@pytest.fixture
async def site_settings() -> SiteSettings:
    async with TestSession() as session:
        row = SiteSettings(site_name="Test Site", full_name="Abraham KOLOBOE")
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return row


async def auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    response = await client.post(
        "/api/v1/admin/auth/login", json={"email": email, "password": "SuperSecret123!"}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
