"""Slugs, reading time, datetimes and Markdown-to-plain-text helpers."""

from __future__ import annotations

import re
from datetime import UTC, datetime

from slugify import slugify as _slugify


def ensure_aware(value: datetime | None) -> datetime | None:
    """Backends without a real TIMESTAMPTZ (SQLite) hand back naive datetimes."""
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=UTC)


_MD_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_MD_CODE_BLOCK = re.compile(r"```.*?```", re.DOTALL)
_MD_INLINE_CODE = re.compile(r"`([^`]*)`")
_MD_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_MD_EMPHASIS = re.compile(r"(\*\*|__|\*|_|~~)")
_MD_QUOTE = re.compile(r"^>\s?", re.MULTILINE)
_HTML_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")


def slugify(value: str, max_length: int = 160) -> str:
    return _slugify(value, max_length=max_length, word_boundary=True) or "item"


def markdown_to_text(markdown: str | None) -> str:
    if not markdown:
        return ""
    text = _MD_CODE_BLOCK.sub(" ", markdown)
    text = _MD_IMAGE.sub(" ", text)
    text = _MD_LINK.sub(r"\1", text)
    text = _MD_INLINE_CODE.sub(r"\1", text)
    text = _MD_HEADING.sub("", text)
    text = _MD_QUOTE.sub("", text)
    text = _MD_EMPHASIS.sub("", text)
    text = _HTML_TAG.sub(" ", text)
    return _WHITESPACE.sub(" ", text).strip()


def reading_minutes(markdown: str | None, wpm: int = 200) -> int:
    words = len(markdown_to_text(markdown).split())
    return max(1, round(words / wpm)) if words else 1


def excerpt(markdown: str | None, length: int = 200) -> str:
    text = markdown_to_text(markdown)
    if len(text) <= length:
        return text
    cut = text[:length].rsplit(" ", 1)[0]
    return f"{cut}…"


def youtube_playlist_id(url: str) -> str | None:
    match = re.search(r"[?&]list=([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None


def youtube_video_id(url: str) -> str | None:
    patterns = (
        r"[?&]v=([A-Za-z0-9_-]{11})",
        r"youtu\.be/([A-Za-z0-9_-]{11})",
        r"youtube\.com/embed/([A-Za-z0-9_-]{11})",
    )
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None
