"""Hand-written admin routes: settings, team, media, messages, dashboard.

These endpoints mutate a row and return it. Every one of them is exercised here
because a flush expires the database-computed `updated_at`, and reading it back
during serialization must never emit lazy IO (`MissingGreenlet`).
"""

from __future__ import annotations

import io

from httpx import AsyncClient
from sqlalchemy import select

from app.models.media import ContactMessage
from app.models.site import SiteSettings
from app.models.user import User
from tests.conftest import TestSession, auth_headers

SETTINGS = "/api/v1/admin/dashboard/settings"


def _png() -> bytes:
    """Smallest valid PNG, so Pillow can read real dimensions."""
    import struct
    import zlib

    width = height = 4
    raw = b"".join(b"\x00" + bytes([37, 99, 235] * width) for _ in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


# ------------------------------------------------------------------ settings
async def test_settings_are_created_on_first_read(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.get(SETTINGS, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["site_name"]

    async with TestSession() as session:
        rows = (await session.execute(select(SiteSettings))).scalars().all()
    assert len(rows) == 1


async def test_settings_update_persists(
    client: AsyncClient, editor: User, site_settings: SiteSettings
):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.patch(
        SETTINGS,
        headers=headers,
        json={"tagline_fr": "Des pipelines fiables", "seo_keywords": ["data", "airflow"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tagline_fr"] == "Des pipelines fiables"
    assert body["seo_keywords"] == ["data", "airflow"]
    # Serialization must have produced the timestamps without lazy IO.
    assert body["updated_at"]

    reread = await client.get("/api/v1/settings")
    assert reread.json()["tagline_fr"] == "Des pipelines fiables"


async def test_settings_update_requires_editor(
    client: AsyncClient, viewer: User, site_settings: SiteSettings
):
    headers = await auth_headers(client, "viewer@example.com")
    response = await client.patch(SETTINGS, headers=headers, json={"tagline_fr": "nope"})
    assert response.status_code == 403


# ---------------------------------------------------------------------- self
async def test_update_own_profile(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.patch(
        "/api/v1/admin/auth/me", headers=headers, json={"full_name": "Nouveau Nom"}
    )
    assert response.status_code == 200, response.text
    assert response.json()["full_name"] == "Nouveau Nom"
    assert response.json()["updated_at"]


async def test_cannot_escalate_own_role(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.patch("/api/v1/admin/auth/me", headers=headers, json={"role": "owner"})
    assert response.status_code == 200
    assert response.json()["role"] == "editor"


# ---------------------------------------------------------------------- team
async def test_owner_creates_member(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.post(
        "/api/v1/admin/team/users",
        headers=headers,
        json={
            "email": "nouvelle@example.com",
            "full_name": "Nouvelle Éditrice",
            "password": "MotDePasseSolide1!",
            "role": "editor",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "editor"
    assert response.json()["created_at"]


async def test_duplicate_email_is_rejected(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    payload = {
        "email": "owner@example.com",
        "full_name": "Doublon",
        "password": "MotDePasseSolide1!",
    }
    response = await client.post("/api/v1/admin/team/users", headers=headers, json=payload)
    assert response.status_code == 409


async def test_member_role_can_be_changed(client: AsyncClient, owner: User, editor: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.patch(
        f"/api/v1/admin/team/users/{editor.id}", headers=headers, json={"role": "viewer"}
    )
    assert response.status_code == 200, response.text
    assert response.json()["role"] == "viewer"


async def test_admin_cannot_promote_above_own_role(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    created = await client.post(
        "/api/v1/admin/team/users",
        headers=headers,
        json={
            "email": "admin@example.com",
            "full_name": "Admin",
            "password": "MotDePasseSolide1!",
            "role": "admin",
        },
    )
    admin_headers = {
        "Authorization": (
            "Bearer "
            + (
                await client.post(
                    "/api/v1/admin/auth/login",
                    json={"email": "admin@example.com", "password": "MotDePasseSolide1!"},
                )
            ).json()["access_token"]
        )
    }
    response = await client.patch(
        f"/api/v1/admin/team/users/{created.json()['id']}",
        headers=admin_headers,
        json={"role": "owner"},
    )
    assert response.status_code == 403


async def test_last_owner_cannot_be_demoted(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    response = await client.patch(
        f"/api/v1/admin/team/users/{owner.id}", headers=headers, json={"role": "editor"}
    )
    assert response.status_code == 400


# --------------------------------------------------------------- invitations
async def test_invitation_flow(client: AsyncClient, owner: User):
    headers = await auth_headers(client, "owner@example.com")
    created = await client.post(
        "/api/v1/admin/team/invitations",
        headers=headers,
        json={"email": "invitee@example.com", "role": "editor"},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "pending"
    # No SMTP in tests: the link is returned once so it can be shared manually.
    assert body["invite_url"]

    token = body["invite_url"].split("token=")[1]
    verified = await client.get(f"/api/v1/admin/team/invitations/verify?token={token}")
    assert verified.status_code == 200
    assert verified.json()["email"] == "invitee@example.com"

    accepted = await client.post(
        "/api/v1/admin/team/invitations/accept",
        json={"token": token, "full_name": "Invitée", "password": "MotDePasseSolide1!"},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["access_token"]

    # A single-use token cannot be replayed.
    replay = await client.post(
        "/api/v1/admin/team/invitations/accept",
        json={"token": token, "full_name": "Bis", "password": "MotDePasseSolide1!"},
    )
    assert replay.status_code in (400, 409)


async def test_editor_cannot_invite(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(
        "/api/v1/admin/team/invitations",
        headers=headers,
        json={"email": "x@example.com", "role": "editor"},
    )
    assert response.status_code == 403


# --------------------------------------------------------------------- media
async def test_upload_and_update_media(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(
        "/api/v1/admin/media/upload",
        headers=headers,
        files={"file": ("visuel.png", io.BytesIO(_png()), "image/png")},
        data={"folder": "projects"},
    )
    assert response.status_code == 201, response.text
    asset = response.json()
    assert asset["width"] == 4 and asset["height"] == 4
    assert asset["folder"] == "projects"
    assert asset["created_at"]

    patched = await client.patch(
        f"/api/v1/admin/media/{asset['id']}",
        headers=headers,
        json={"alt_fr": "Capture du tableau de bord"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["alt_fr"] == "Capture du tableau de bord"

    deleted = await client.delete(f"/api/v1/admin/media/{asset['id']}", headers=headers)
    assert deleted.status_code == 200


async def test_upload_rejects_unsupported_type(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(
        "/api/v1/admin/media/upload",
        headers=headers,
        files={"file": ("script.sh", io.BytesIO(b"#!/bin/sh\nrm -rf /"), "application/x-sh")},
    )
    assert response.status_code == 415


async def test_identical_upload_is_deduplicated(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    payload = {"file": ("a.png", io.BytesIO(_png()), "image/png")}
    first = await client.post("/api/v1/admin/media/upload", headers=headers, files=payload)
    second = await client.post(
        "/api/v1/admin/media/upload",
        headers=headers,
        files={"file": ("b.png", io.BytesIO(_png()), "image/png")},
    )
    assert first.json()["storage_key"] == second.json()["storage_key"]

    listing = await client.get("/api/v1/admin/media", headers=headers)
    assert listing.json()["total"] == 1


# ------------------------------------------------------------------ messages
async def test_message_is_marked_read_and_updated(client: AsyncClient, editor: User):
    await client.post(
        "/api/v1/contact",
        json={
            "name": "Recruteuse",
            "email": "rh@example.com",
            "message": "Bonjour, une mission de data engineering vous intéresse-t-elle ?",
        },
    )
    async with TestSession() as session:
        message = (await session.execute(select(ContactMessage))).scalars().one()
        message_id = message.id

    headers = await auth_headers(client, "editor@example.com")
    read = await client.get(f"/api/v1/admin/messages/{message_id}", headers=headers)
    assert read.status_code == 200
    assert read.json()["is_read"] is True

    updated = await client.patch(
        f"/api/v1/admin/messages/{message_id}",
        headers=headers,
        json={"is_archived": True, "notes": "Relancer la semaine prochaine"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["is_archived"] is True
    assert updated.json()["notes"] == "Relancer la semaine prochaine"
    assert updated.json()["updated_at"]


# ----------------------------------------------------------------- dashboard
async def test_dashboard_stats(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.get("/api/v1/admin/dashboard/stats", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    for key in ("projects_total", "posts_total", "messages_unread", "users_total", "views_30d"):
        assert key in body
    assert isinstance(body["views_timeseries"], list)


async def test_audit_log_requires_admin(client: AsyncClient, editor: User, owner: User):
    editor_headers = await auth_headers(client, "editor@example.com")
    assert (
        await client.get("/api/v1/admin/dashboard/audit", headers=editor_headers)
    ).status_code == 403

    owner_headers = await auth_headers(client, "owner@example.com")
    response = await client.get("/api/v1/admin/dashboard/audit", headers=owner_headers)
    assert response.status_code == 200
    # The two logins above are themselves auditable events.
    assert response.json()["total"] >= 1


# ------------------------------------------------------- configuration guard
def test_database_url_rejects_unencoded_password_at_sign():
    """libpq splits credentials at the first `@`, so an unencoded one in the
    password lands in the hostname and only fails much later as a DNS error."""
    import pytest
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError, match="non encodé"):
        Settings(
            DATABASE_URL=(
                "postgresql://postgres.abc:Pass@Suffix"
                "@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
            )
        )


def test_database_url_accepts_encoded_password():
    from app.core.config import Settings

    settings = Settings(
        DATABASE_URL=(
            "postgresql://postgres.abc:Pass%40Suffix"
            "@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
        )
    )
    assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")
    assert "Pass%40Suffix" in settings.DATABASE_URL
