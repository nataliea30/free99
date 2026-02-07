from fastapi import APIRouter

from app.api.v1.endpoints import auth, listings, messages

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])

