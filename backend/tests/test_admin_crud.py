"""Generated CRUD routes: create, update, reorder, delete, uniqueness, audit."""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy import select

from app.models.content import Post, Project
from app.models.user import AuditLog, User
from tests.conftest import TestSession, auth_headers

PROJECTS = "/api/v1/admin/projects"


def project_payload(**overrides):
    payload = {
        "slug": "pipeline-bigquery",
        "title_fr": "Pipeline BigQuery",
        "title_en": "BigQuery pipeline",
        "summary_fr": "Un pipeline analytique",
        "summary_en": "An analytics pipeline",
        "category": "data-engineering",
        "status": "published",
        "tech": ["BigQuery", "Airflow"],
    }
    payload.update(overrides)
    return payload


async def test_create_project(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(PROJECTS, headers=headers, json=project_payload())
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["slug"] == "pipeline-bigquery"
    assert body["tech"] == ["BigQuery", "Airflow"]


async def test_duplicate_slug_is_rejected(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    await client.post(PROJECTS, headers=headers, json=project_payload())
    duplicate = await client.post(PROJECTS, headers=headers, json=project_payload())
    assert duplicate.status_code == 409


async def test_invalid_slug_is_rejected(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(
        PROJECTS, headers=headers, json=project_payload(slug="Not A Slug!")
    )
    assert response.status_code == 422


async def test_update_project(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    created = await client.post(PROJECTS, headers=headers, json=project_payload())
    project_id = created.json()["id"]

    response = await client.patch(
        f"{PROJECTS}/{project_id}", headers=headers, json={"title_fr": "Nouveau titre"}
    )
    assert response.status_code == 200
    assert response.json()["title_fr"] == "Nouveau titre"
    # untouched fields survive a partial update
    assert response.json()["title_en"] == "BigQuery pipeline"


async def test_delete_project(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    created = await client.post(PROJECTS, headers=headers, json=project_payload())
    project_id = created.json()["id"]

    assert (await client.delete(f"{PROJECTS}/{project_id}", headers=headers)).status_code == 200
    assert (await client.get(f"{PROJECTS}/{project_id}", headers=headers)).status_code == 404


async def test_reorder(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    first = await client.post(PROJECTS, headers=headers, json=project_payload(slug="a"))
    second = await client.post(PROJECTS, headers=headers, json=project_payload(slug="b"))

    response = await client.post(
        f"{PROJECTS}/reorder",
        headers=headers,
        json={
            "items": [
                {"id": first.json()["id"], "position": 5},
                {"id": second.json()["id"], "position": 1},
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["updated"] == 2

    listing = await client.get(PROJECTS, headers=headers)
    slugs = [item["slug"] for item in listing.json()["items"]]
    assert slugs == ["b", "a"]


async def test_search_and_filter(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    await client.post(PROJECTS, headers=headers, json=project_payload(slug="airflow-dags"))
    await client.post(
        PROJECTS,
        headers=headers,
        json=project_payload(slug="ml-model", title_fr="Modèle ML", status="draft"),
    )

    found = await client.get(f"{PROJECTS}?search=airflow", headers=headers)
    assert found.json()["total"] == 1

    drafts = await client.get(f"{PROJECTS}?status=draft", headers=headers)
    assert drafts.json()["total"] == 1


async def test_mutations_are_audited(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    await client.post(PROJECTS, headers=headers, json=project_payload())

    async with TestSession() as session:
        entries = (
            (await session.execute(select(AuditLog).where(AuditLog.entity_type == "réalisation")))
            .scalars()
            .all()
        )
    assert len(entries) == 1
    assert entries[0].action == "create"
    assert entries[0].actor_email == "editor@example.com"


async def test_post_reading_time_is_computed(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    body = " ".join(["mot"] * 600)
    response = await client.post(
        "/api/v1/admin/posts",
        headers=headers,
        json={
            "slug": "article-long",
            "title_fr": "Article",
            "title_en": "Article",
            "content_fr": body,
            "content_en": body,
        },
    )
    assert response.status_code == 201
    assert response.json()["reading_minutes"] == 3
    assert response.json()["excerpt_fr"].startswith("mot")


async def test_tags_are_attached(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    tag = await client.post(
        "/api/v1/admin/tags",
        headers=headers,
        json={"slug": "airflow", "name_fr": "Airflow", "name_en": "Airflow"},
    )
    response = await client.post(
        PROJECTS, headers=headers, json=project_payload(tag_ids=[tag.json()["id"]])
    )
    assert response.status_code == 201
    assert [t["slug"] for t in response.json()["tags"]] == ["airflow"]


async def test_unknown_id_returns_404(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    missing = "00000000-0000-0000-0000-000000000000"
    assert (await client.get(f"{PROJECTS}/{missing}", headers=headers)).status_code == 404


async def test_crud_requires_authentication(client: AsyncClient):
    assert (await client.get(PROJECTS)).status_code == 401
    assert (await client.post(PROJECTS, json=project_payload())).status_code == 401


async def test_section_can_be_added(client: AsyncClient, editor: User):
    """Adding a new site section is a plain CRUD insert — no code change needed."""
    headers = await auth_headers(client, "editor@example.com")
    response = await client.post(
        "/api/v1/admin/sections",
        headers=headers,
        json={
            "key": "podcasts",
            "type": "custom",
            "title_fr": "Podcasts",
            "title_en": "Podcasts",
            "config": {"columns": 2},
        },
    )
    assert response.status_code == 201
    assert response.json()["config"] == {"columns": 2}


async def test_models_stay_consistent(client: AsyncClient, editor: User):
    headers = await auth_headers(client, "editor@example.com")
    await client.post(PROJECTS, headers=headers, json=project_payload())
    async with TestSession() as session:
        assert (await session.execute(select(Project))).scalars().all()
        assert (await session.execute(select(Post))).scalars().all() == []
