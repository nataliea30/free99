from fastapi import Header, HTTPException, status

from app.db.session import get_db


def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header (mock auth)",
        )
    return x_user_id


__all__ = ["get_current_user_id", "get_db"]
