from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = Field(default="Free99 API", alias="APP_NAME")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")
    allowed_email_domain: str = Field(default=".edu", alias="ALLOWED_EMAIL_DOMAIN")
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")


settings = Settings()

