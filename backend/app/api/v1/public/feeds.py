"""RSS feeds and sitemap generated from published content."""

from __future__ import annotations

from datetime import UTC, datetime
from xml.sax.saxutils import escape

from fastapi import APIRouter, Query, Response
from sqlalchemy import or_, select

from app.api.deps import DbSession
from app.core.config import settings
from app.models.content import Post, Project
from app.models.enums import ContentStatus
from app.models.site import SiteSettings
from app.utils.text import excerpt

router = APIRouter()

FEED_CACHE = "public, max-age=600, s-maxage=3600"


def _site_url() -> str:
    return settings.PUBLIC_SITE_URL.rstrip("/")


def _published(model):
    return [
        model.is_visible.is_(True),
        model.status == ContentStatus.PUBLISHED,
        or_(model.published_at.is_(None), model.published_at <= datetime.now(UTC)),
    ]


def _rfc2822(value: datetime | None) -> str:
    moment = value or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.strftime("%a, %d %b %Y %H:%M:%S %z")


@router.get("/rss.xml", summary="Flux RSS du blog", response_class=Response)
async def rss_feed(db: DbSession, locale: str = Query("fr", pattern="^(fr|en)$")) -> Response:
    site = (await db.execute(select(SiteSettings).limit(1))).scalar_one_or_none()
    posts = (
        (
            await db.execute(
                select(Post)
                .where(*_published(Post))
                .order_by(Post.published_at.desc().nulls_last())
                .limit(50)
            )
        )
        .scalars()
        .all()
    )

    base = _site_url()
    title = escape(getattr(site, f"seo_title_{locale}", None) or "Abraham Z. KOLOBOE — Blog")
    description = escape(
        getattr(site, f"seo_description_{locale}", None) or "Data & IA, pipelines et MLOps."
    )

    items = []
    for post in posts:
        post_title = escape(getattr(post, f"title_{locale}") or post.title_fr)
        summary = getattr(post, f"excerpt_{locale}", None) or excerpt(
            getattr(post, f"content_{locale}", None)
        )
        link = f"{base}/{locale}/blog/{post.slug}"
        items.append(
            f"""    <item>
      <title>{post_title}</title>
      <link>{link}</link>
      <guid isPermaLink="true">{link}</guid>
      <pubDate>{_rfc2822(post.published_at)}</pubDate>
      <description>{escape(summary or "")}</description>
    </item>"""
        )

    self_url = (
        f"{settings.API_PUBLIC_URL.rstrip('/')}{settings.API_V1_PREFIX}/rss.xml?locale={locale}"
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{title}</title>
    <link>{base}/{locale}</link>
    <description>{description}</description>
    <language>{locale}</language>
    <lastBuildDate>{_rfc2822(None)}</lastBuildDate>
    <atom:link href="{self_url}" rel="self" type="application/rss+xml"/>
{chr(10).join(items)}
  </channel>
</rss>"""
    return Response(
        content=xml,
        media_type="application/rss+xml; charset=utf-8",
        headers={"Cache-Control": FEED_CACHE},
    )


@router.get("/sitemap.xml", summary="Sitemap multilingue", response_class=Response)
async def sitemap(db: DbSession) -> Response:
    base = _site_url()
    locales = ("fr", "en")
    static_paths = ("", "/about", "/projects", "/blog", "/talks", "/contact")

    urls: list[str] = []

    def add(path: str, lastmod: datetime | None = None, priority: str = "0.7") -> None:
        alternates = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{loc}" href="{base}/{loc}{path}"/>'
            for loc in locales
        )
        stamp = (lastmod or datetime.now(UTC)).strftime("%Y-%m-%d")
        for loc in locales:
            urls.append(
                f"""  <url>
    <loc>{base}/{loc}{path}</loc>
    <lastmod>{stamp}</lastmod>
    <priority>{priority}</priority>{alternates}
  </url>"""
            )

    for path in static_paths:
        add(path, priority="1.0" if path == "" else "0.8")

    projects = (await db.execute(select(Project).where(*_published(Project)))).scalars().all()
    for project in projects:
        add(f"/projects/{project.slug}", project.updated_at, "0.9")

    posts = (await db.execute(select(Post).where(*_published(Post)))).scalars().all()
    for post in posts:
        add(f"/blog/{post.slug}", post.updated_at, "0.8")

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
{chr(10).join(urls)}
</urlset>"""
    return Response(
        content=xml,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": FEED_CACHE},
    )
