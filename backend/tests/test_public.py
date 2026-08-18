"""Public API: visibility rules, contact form, feeds and the site bundle."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select

from app.models.content import Project
from app.models.media import ContactMessage
from app.models.site import SiteSettings
from app.models.user import User
from tests.conftest import TestSession, auth_headers


async def _add_project(**overrides) -> Project:
    payload = {
        "slug": "projet-public",
        "title_fr": "Projet public",
        "title_en": "Public project",
        "status": "published",
        "is_visible": True,
        "published_at": datetime.now(UTC) - timedelta(days=1),
    }
    payload.update(overrides)
    async with TestSession() as session:
        project = Project(**payload)
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project


async def test_health_is_open(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_site_bundle_needs_settings(client: AsyncClient):
    assert (await client.get("/api/v1/site")).status_code == 503


async def test_site_bundle(client: AsyncClient, site_settings: SiteSettings):
    response = await client.get("/api/v1/site")
    assert response.status_code == 200
    body = response.json()
    assert body["settings"]["site_name"] == "Test Site"
    for key in ("sections", "socials", "experiences", "playlists", "featured_projects"):
        assert key in body
    assert "max-age" in response.headers["cache-control"]


async def test_only_published_projects_are_public(client: AsyncClient):
    await _add_project(slug="publie", status="published")
    await _add_project(slug="brouillon", status="draft")

    response = await client.get("/api/v1/projects")
    slugs = [item["slug"] for item in response.json()["items"]]
    assert slugs == ["publie"]


async def test_future_publication_stays_hidden(client: AsyncClient):
    await _add_project(slug="programme", published_at=datetime.now(UTC) + timedelta(days=7))
    response = await client.get("/api/v1/projects")
    assert response.json()["total"] == 0


async def test_invisible_project_stays_hidden(client: AsyncClient):
    await _add_project(slug="cache", is_visible=False)
    assert (await client.get("/api/v1/projects")).json()["total"] == 0


async def test_editor_sees_drafts_in_preview(client: AsyncClient, editor: User):
    await _add_project(slug="brouillon", status="draft")
    headers = await auth_headers(client, "editor@example.com")

    anonymous = await client.get("/api/v1/projects")
    preview = await client.get("/api/v1/projects", headers=headers)

    assert anonymous.json()["total"] == 0
    assert preview.json()["total"] == 1


async def test_project_detail_by_slug(client: AsyncClient):
    await _add_project(slug="detail", content_fr="# Titre")
    response = await client.get("/api/v1/projects/detail")
    assert response.status_code == 200
    assert response.json()["content_fr"] == "# Titre"


async def test_missing_project_returns_404(client: AsyncClient):
    assert (await client.get("/api/v1/projects/inexistant")).status_code == 404


async def test_contact_form_stores_message(client: AsyncClient):
    response = await client.post(
        "/api/v1/contact",
        json={
            "name": "Recruteuse",
            "email": "hello@example.com",
            "subject": "Mission data",
            "message": "Bonjour, parlons d'une mission de data engineering.",
        },
    )
    assert response.status_code == 201
    async with TestSession() as session:
        messages = (await session.execute(select(ContactMessage))).scalars().all()
    assert len(messages) == 1
    assert messages[0].is_spam is False


async def test_contact_honeypot_flags_spam(client: AsyncClient):
    response = await client.post(
        "/api/v1/contact",
        json={
            "name": "Bot",
            "email": "bot@example.com",
            "message": "Acheter des liens pas chers maintenant",
            "honeypot": "http://spam.example",
        },
    )
    assert response.status_code == 201
    async with TestSession() as session:
        message = (await session.execute(select(ContactMessage))).scalars().one()
    assert message.is_spam is True


async def test_contact_validates_message_length(client: AsyncClient):
    response = await client.post(
        "/api/v1/contact", json={"name": "A", "email": "not-an-email", "message": "court"}
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Données invalides"


async def test_tracking_increments_project_views(client: AsyncClient):
    await _add_project(slug="vue")
    await client.post(
        "/api/v1/track",
        json={"path": "/fr/projects/vue", "entity_type": "project", "entity_id": "vue"},
    )
    async with TestSession() as session:
        project = (await session.execute(select(Project).where(Project.slug == "vue"))).scalar_one()
    assert project.view_count == 1


async def test_sitemap_lists_published_content(client: AsyncClient):
    await _add_project(slug="visible-sitemap")
    response = await client.get("/api/v1/sitemap.xml")
    assert response.status_code == 200
    assert "/fr/projects/visible-sitemap" in response.text
    assert "/en/projects/visible-sitemap" in response.text


async def test_rss_feed_is_valid_xml(client: AsyncClient, site_settings: SiteSettings):
    from xml.etree import ElementTree

    response = await client.get("/api/v1/rss.xml")
    assert response.status_code == 200
    ElementTree.fromstring(response.text)  # raises if malformed


async def test_security_headers_are_present(client: AsyncClient):
    response = await client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
