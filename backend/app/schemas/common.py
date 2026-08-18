"""Shared schema plumbing: ORM base, generic pagination, reorder payloads."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TimestampedOut(ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class OrderedOut(TimestampedOut):
    position: int = 0
    is_visible: bool = True


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int

    @classmethod
    def build(cls, items: list[T], total: int, page: int, per_page: int) -> Page[T]:
        pages = max(1, -(-total // per_page)) if per_page else 1
        return cls(items=items, total=total, page=page, per_page=per_page, pages=pages)


class PaginationParams(BaseModel):
    page: Annotated[int, Field(ge=1)] = 1
    per_page: Annotated[int, Field(ge=1, le=100)] = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class ReorderItem(BaseModel):
    id: uuid.UUID
    position: int


class ReorderPayload(BaseModel):
    """Sent by the admin after a drag-and-drop, in a single request."""

    items: list[ReorderItem] = Field(min_length=1)


class Message(BaseModel):
    detail: str


class BulkResult(BaseModel):
    updated: int = 0
    deleted: int = 0
    created: int = 0


LocaleStr = Annotated[str, Field(pattern="^(fr|en)$")]
