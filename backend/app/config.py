from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/regulatoryradar"
    ANTHROPIC_API_KEY: str = ""
    SECRET_KEY: str = "regulatoryradar-secret-key-change-in-prod"
    SMTP_HOST: str = "mail.smtp2go.com"
    SMTP_PORT: int = 2525
    SMTP_USER: str = "steveipwatcher"
    SMTP_PASS: str = ""
    SMTP_FROM: str = "steve@ipwatcher.com"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
