"""File storage abstraction — local disk in dev, S3-compatible in production.

The S3 backend targets Supabase Storage (which exposes an S3 API), MinIO or AWS S3
without any code change: only the `S3_*` environment variables differ.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import mimetypes
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger
from app.utils.text import slugify

logger = get_logger("storage")


@dataclass(slots=True)
class StoredFile:
    key: str
    url: str
    size: int
    checksum: str
    width: int | None = None
    height: int | None = None


def build_key(folder: str, filename: str) -> str:
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower() or ".bin"
    return f"{folder}/{uuid.uuid4().hex[:12]}-{slugify(stem, max_length=60)}{suffix}"


def probe_image(content: bytes) -> tuple[int | None, int | None]:
    try:
        from PIL import Image

        with Image.open(io.BytesIO(content)) as img:
            return img.width, img.height
    except Exception:
        return None, None


class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, content: bytes, key: str, content_type: str) -> StoredFile: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...

    @abstractmethod
    def public_url(self, key: str) -> str: ...


class LocalStorage(StorageBackend):
    """Writes under `UPLOAD_DIR`; FastAPI serves it at `/uploads`."""

    def __init__(self) -> None:
        self.root = Path(settings.UPLOAD_DIR).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    async def upload(self, content: bytes, key: str, content_type: str) -> StoredFile:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, content)
        width, height = probe_image(content)
        return StoredFile(
            key=key,
            url=self.public_url(key),
            size=len(content),
            checksum=hashlib.sha256(content).hexdigest(),
            width=width,
            height=height,
        )

    async def delete(self, key: str) -> None:
        path = (self.root / key).resolve()
        # Never let a crafted key escape the upload directory.
        if self.root in path.parents and path.is_file():
            await asyncio.to_thread(path.unlink)

    def public_url(self, key: str) -> str:
        return f"{settings.API_PUBLIC_URL.rstrip('/')}/uploads/{key}"


class S3Storage(StorageBackend):
    def __init__(self) -> None:
        import boto3
        from botocore.config import Config

        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path" if settings.S3_FORCE_PATH_STYLE else "auto"},
            ),
        )
        self._bucket = settings.S3_BUCKET

    async def upload(self, content: bytes, key: str, content_type: str) -> StoredFile:
        await asyncio.to_thread(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
        width, height = probe_image(content)
        return StoredFile(
            key=key,
            url=self.public_url(key),
            size=len(content),
            checksum=hashlib.sha256(content).hexdigest(),
            width=width,
            height=height,
        )

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self._client.delete_object, Bucket=self._bucket, Key=key)

    def public_url(self, key: str) -> str:
        if settings.S3_PUBLIC_BASE_URL:
            return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{self._bucket}/{key}"
        endpoint = (settings.S3_ENDPOINT_URL or "").rstrip("/")
        return f"{endpoint}/{self._bucket}/{key}"


_backend: StorageBackend | None = None


def get_storage() -> StorageBackend:
    global _backend
    if _backend is None:
        if settings.STORAGE_BACKEND == "s3" and settings.S3_ACCESS_KEY_ID:
            _backend = S3Storage()
            logger.info("storage.backend", backend="s3", bucket=settings.S3_BUCKET)
        else:
            _backend = LocalStorage()
            logger.info("storage.backend", backend="local", path=settings.UPLOAD_DIR)
    return _backend


def guess_content_type(filename: str, fallback: str | None = None) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or fallback or "application/octet-stream"
