"""Authentication, session rotation and role-based access control."""

from __future__ import annotations

from httpx import AsyncClient

from app.core.security import decode_token, hash_password, verify_password
from app.models.user import User
from tests.conftest import auth_headers

LOGIN = "/api/v1/admin/auth/login"


async def test_password_hash_roundtrip():
    hashed = hash_password("SuperSecret123!")
    assert hashed != "SuperSecret123!"
    assert verify_password("SuperSecret123!", hashed)
    assert not verify_password("wrong", hashed)


async def test_long_passphrase_is_supported():
    """bcrypt truncates at 72 bytes — we pre-hash so long passphrases still work."""
    passphrase = "e" * 200
    hashed = hash_password(passphrase)
    assert verify_password(passphrase, hashed)
    assert not verify_password("e" * 199, hashed)


async def test_login_returns_token_pair(client: AsyncClient, owner: User):
    response = await client.post(
        LOGIN, json={"email": "owner@example.com", "password": "SuperSecret123!"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    claims = decode_token(body["access_token"], expected_type="access")
    assert claims is not None
    assert claims["role"] == "owner"


async def test_login_rejects_wrong_password(client: AsyncClient, owner: User):
    response = await client.post(LOGIN, json={"email": "owner@example.com", "password": "nope"})
    assert response.status_code == 401


async def test_login_does_not_leak_unknown_accounts(client: AsyncClient, owner: User):
    unknown = await client.post(LOGIN, json={"email": "ghost@example.com", "password": "nope"})
    wrong = await client.post(LOGIN, json={"email": "owner@example.com", "password": "nope"})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]


async def test_refresh_rotates_and_invalidates_old_token(client: AsyncClient, owner: User):
    login = await client.post(
        LOGIN, json={"email": "owner@example.com", "password": "SuperSecret123!"}
    )
    refresh_token = login.json()["refresh_token"]

    first = await client.post("/api/v1/admin/auth/refresh", json={"refresh_token": refresh_token})
    assert first.status_code == 200

    replay = await client.post("/api/v1/admin/auth/refresh", json={"refresh_token": refresh_token})
    assert replay.status_code == 401, "a used refresh token must never be replayable"


async def test_me_requires_authentication(client: AsyncClient):
    assert (await client.get("/api/v1/admin/auth/me")).status_code == 401


async def test_me_returns_profile(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.get("/api/v1/admin/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "owner@example.com"
    assert "hashed_password" not in response.json()


async def test_viewer_cannot_write(client: AsyncClient, viewer: User):
    headers = await auth_headers(client, "viewer@example.com")
    response = await client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"slug": "nope", "name_fr": "Non", "name_en": "No"},
    )
    assert response.status_code == 403


async def test_viewer_can_read(client: AsyncClient, viewer: User):
    headers = await auth_headers(client, "viewer@example.com")
    assert (await client.get("/api/v1/admin/tags", headers=headers)).status_code == 200


async def test_editor_cannot_manage_team(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.get("/api/v1/admin/team/users", headers=headers)
    assert response.status_code == 403


async def test_owner_can_manage_team(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.get("/api/v1/admin/team/users", headers=headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1


async def test_password_change_revokes_sessions(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.post(
        "/api/v1/admin/auth/me/password",
        headers=headers,
        json={"current_password": "SuperSecret123!", "new_password": "BrandNewSecret456!"},
    )
    assert response.status_code == 200

    sessions = await client.get("/api/v1/admin/auth/me/sessions", headers=headers)
    assert sessions.json() == []
