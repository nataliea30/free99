from datetime import datetime, timedelta
from hashlib import sha256
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.db import UserDB, VerificationTokenDB
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, VerifyEmailRequest

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not payload.email.endswith(settings.allowed_email_domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email must end with {settings.allowed_email_domain}",
        )

    existing = db.execute(select(UserDB).where(UserDB.email == payload.email)).scalar_one_or_none()
    if existing:
        return AuthResponse(token=f"mock-token-{existing.id}", user_id=existing.id, verified=existing.is_verified)

    user = UserDB(
        id=str(uuid4()),
        full_name=payload.full_name,
        email=payload.email,
        residence_hall=payload.residence_hall,
        pickup_preference=payload.pickup_preference,
        is_verified=False,
    )
    verification_code = "123456"
    token = VerificationTokenDB(
        user_id=user.id,
        code_hash=sha256(verification_code.encode("utf-8")).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(user)
    db.flush()
    db.add(token)
    db.commit()
    return AuthResponse(token=f"mock-token-{user.id}", user_id=user.id, verified=user.is_verified)


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict[str, str | bool]:
    user = db.execute(select(UserDB).where(UserDB.email == payload.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    latest_token = db.execute(
        select(VerificationTokenDB)
        .where(VerificationTokenDB.user_id == user.id)
        .order_by(VerificationTokenDB.created_at.desc())
    ).scalars().first()

    if not latest_token or latest_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")

    if sha256(payload.code.encode("utf-8")).hexdigest() != latest_token.code_hash:
        latest_token.attempts += 1
        db.add(latest_token)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.is_verified = True
    db.add(user)
    db.commit()
    return {"verified": True, "message": "Email verified"}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.execute(select(UserDB).where(UserDB.email == payload.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return AuthResponse(token=f"mock-token-{user.id}", user_id=user.id, verified=user.is_verified)
