from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = Field(default="Free99 API", alias="APP_NAME")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")
    allowed_email_domain: str = Field(default=".edu", alias="ALLOWED_EMAIL_DOMAIN")
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/free99",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=14, alias="REFRESH_TOKEN_EXPIRE_DAYS")


settings = Settings()
