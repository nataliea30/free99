from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    residence_hall: str
    pickup_preference: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class LoginRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user_id: str
    verified: bool

