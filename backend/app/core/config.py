"""Application configuration, loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ------------------------------------------------------------------ app
    PROJECT_NAME: str = "Abraham Koloboe — Portfolio API"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ----------------------------------------------------------------- urls
    PUBLIC_SITE_URL: str = "http://localhost:3000"
    ADMIN_SITE_URL: str = "http://localhost:5173"
    API_PUBLIC_URL: str = "http://localhost:8000"

    # --------------------------------------------------------------- database
    # Supabase / Neon connection string. `postgresql+asyncpg://` is enforced.
    DATABASE_URL: str = "postgresql+asyncpg://portfolio:portfolio@localhost:5432/portfolio"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # ---------------------------------------------------------------- security
    SECRET_KEY: str = "change-me-in-production-please-use-a-64-char-random-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    INVITATION_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12

    # First admin, created automatically on `python -m app.db.seed`
    FIRST_SUPERUSER_EMAIL: str = "abklb27@gmail.com"
    FIRST_SUPERUSER_PASSWORD: str = "ChangeMe!2026"
    FIRST_SUPERUSER_NAME: str = "Abraham Zacharie KOLOBOE"

    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    )

    # ---------------------------------------------------------------- storage
    # `local` writes to ./uploads, `s3` targets Supabase Storage / MinIO / AWS S3.
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_TYPES: list[str] = Field(
        default_factory=lambda: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml",
            "application/pdf",
        ]
    )

    S3_ENDPOINT_URL: str | None = None  # https://<ref>.supabase.co/storage/v1/s3
    S3_REGION: str = "eu-west-3"
    S3_BUCKET: str = "portfolio-media"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_PUBLIC_BASE_URL: str | None = None  # https://<ref>.supabase.co/storage/v1/object/public
    S3_FORCE_PATH_STYLE: bool = True

    # ------------------------------------------------------------------ mail
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "no-reply@abrahamkoloboe.dev"
    EMAILS_FROM_NAME: str = "Abraham Koloboe"
    CONTACT_NOTIFY_EMAIL: str = "abklb27@gmail.com"

    # ------------------------------------------------------------ rate limits
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_CONTACT: str = "5/hour"
    RATE_LIMIT_LOGIN: str = "10/minute"

    # ------------------------------------------------------------- integrations
    YOUTUBE_API_KEY: str | None = None
    GITHUB_TOKEN: str | None = None
    GITHUB_USERNAME: str = "abrahamkoloboe27"

    @field_validator("DATABASE_URL")
    @classmethod
    def _reject_ambiguous_credentials(cls, v: str) -> str:
        """Catch an unencoded special character in the password.

        libpq splits the credentials at the *first* `@`, so a password
        containing one pushes the remainder into the hostname — surfacing much
        later as a baffling `failed to resolve host '…@…'` DNS error. Failing
        here, with the actual remedy, saves a long debugging detour.
        """
        _, separator, rest = v.partition("://")
        if not separator:
            return v
        netloc = rest.split("/", 1)[0]
        if netloc.count("@") > 1:
            raise ValueError(
                "DATABASE_URL ambigu : le mot de passe contient un « @ » non encodé. "
                "Encodez-le en %40 (et : / # ? % en %3A %2F %23 %3F %25), par exemple "
                "avec urllib.parse.quote(mot_de_passe, safe=''), ou régénérez un mot de "
                "passe sans caractère spécial."
            )
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def _force_async_driver(cls, v: str) -> str:
        """Accept the plain `postgres(ql)://` DSN copied from Supabase/Neon."""
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # asyncpg rejects libpq-only query params; `ssl` is negotiated in `session.py`.
        for param in ("?sslmode=require", "&sslmode=require", "?sslmode=disable"):
            v = v.replace(param, "")
        return v

    @field_validator("CORS_ORIGINS", "ALLOWED_UPLOAD_TYPES", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str) and not v.startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def sync_database_url(self) -> str:
        """Alembic runs migrations through the synchronous psycopg driver."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def all_cors_origins(self) -> list[str]:
        origins = {*self.CORS_ORIGINS, self.PUBLIC_SITE_URL, self.ADMIN_SITE_URL}
        return sorted(o.rstrip("/") for o in origins if o)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

__all__ = ["AnyHttpUrl", "Settings", "get_settings", "settings"]
