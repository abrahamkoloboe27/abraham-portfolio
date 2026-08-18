"""API v1 aggregation: public endpoints at the root, admin under `/admin`."""

from fastapi import APIRouter

from app.api.v1 import admin, public

router = APIRouter()
router.include_router(public.router)
router.include_router(admin.router, prefix="/admin")

__all__ = ["router"]
