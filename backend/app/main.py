"""FastAPI application entrypoint."""

from __future__ import annotations

import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.session import SessionLocal, engine

logger = get_logger("api")

DESCRIPTION = """
API du portfolio de **Sèdjro Abraham Zacharie KOLOBOE** — Data / ML Engineer.

* **Public** : contenus du site (bilingue FR/EN), flux RSS et sitemap.
* **Admin** (`/admin`) : gestion complète du site — réalisations, blog, sections,
  paramètres, médias, partage d'accès.

Les contenus sont renvoyés dans les deux langues (`*_fr` / `*_en`) : le front
choisit la locale sans invalider le cache.
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    logger.info("api.startup", environment=settings.ENVIRONMENT, version=app.version)
    try:
        async with SessionLocal() as session:
            await session.execute(select(1))
        logger.info("api.database.ready")
    except Exception as exc:
        logger.error("api.database.unreachable", error=str(exc))
    yield
    await engine.dispose()
    logger.info("api.shutdown")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={"name": "Abraham Z. KOLOBOE", "email": "abklb27@gmail.com"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.all_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time"] = f"{elapsed_ms:.1f}ms"
    if elapsed_ms > 1000:
        logger.warning(
            "api.slow_request",
            path=request.url.path,
            method=request.method,
            duration_ms=round(elapsed_ms),
        )
    return response


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Données invalides",
            "errors": [
                {"field": ".".join(str(part) for part in err["loc"][1:]), "message": err["msg"]}
                for err in exc.errors()
            ],
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("api.integrity_error", path=request.url.path, error=str(exc.orig))
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Conflit : cette valeur existe déjà ou viole une contrainte."},
    )


app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Local storage backend: serve uploaded files directly from the API container.
if settings.STORAGE_BACKEND == "local":
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "name": settings.PROJECT_NAME,
        "version": app.version,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    """Liveness probe used by Docker, Render and the deploy workflows."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
