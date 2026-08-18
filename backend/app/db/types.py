"""Portable column types — JSONB on Postgres, plain JSON everywhere else (tests)."""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# `JSONB` gives us indexing and containment operators in production while the
# SQLite-backed test suite still works with the generic JSON serializer.
JSONType = JSON().with_variant(JSONB(), "postgresql")

__all__ = ["JSONType"]
