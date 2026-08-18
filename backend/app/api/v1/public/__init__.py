"""Aggregated public (unauthenticated) API."""

from fastapi import APIRouter

from app.api.v1.public import content, feeds, site

router = APIRouter()
router.include_router(site.router, tags=["public • site"])
router.include_router(content.router, tags=["public • contenus"])
router.include_router(feeds.router, tags=["public • flux"])

__all__ = ["router"]
