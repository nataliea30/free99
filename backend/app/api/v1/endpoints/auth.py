from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.models.entities import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, VerifyEmailRequest
from app.services.store import store

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> AuthResponse:
    if not payload.email.endswith(settings.allowed_email_domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email must end with {settings.allowed_email_domain}",
        )

    existing = next((u for u in store.users.values() if u.email == payload.email), None)
    if existing:
        return AuthResponse(token=f"mock-token-{existing.id}", user_id=existing.id, verified=existing.is_verified)

    user = User(
        id=str(uuid4()),
        full_name=payload.full_name,
        email=payload.email,
        residence_hall=payload.residence_hall,
        pickup_preference=payload.pickup_preference,
        is_verified=False,
    )
    store.users[user.id] = user
    store.verification_codes[payload.email] = "123456"
    return AuthResponse(token=f"mock-token-{user.id}", user_id=user.id, verified=user.is_verified)


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest) -> dict[str, str | bool]:
    expected_code = store.verification_codes.get(payload.email)
    if not expected_code or payload.code != expected_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user = next((u for u in store.users.values() if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    return {"verified": True, "message": "Email verified"}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    user = next((u for u in store.users.values() if u.email == payload.email), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return AuthResponse(token=f"mock-token-{user.id}", user_id=user.id, verified=user.is_verified)

