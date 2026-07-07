from functools import lru_cache
import json
from typing import Any

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors_origins(v: Any) -> list[str]:
    if isinstance(v, str):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
        return [x.strip() for x in v.split(",") if x.strip()]
    return v


class Settings(BaseSettings):
    api_title: str = "CodePilot AI"
    api_version: str = "1.0.0"

    postgres_url: str = Field(
        default="postgresql://codepilot:codepilot_pass_123@127.0.0.1:5435/codepilot",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL"),
    )
    redis_url: str = Field(
        default="redis://127.0.0.1:6379/0",
        validation_alias=AliasChoices("REDIS_URL"),
    )
    qdrant_host: str = Field(
        default="127.0.0.1",
        validation_alias=AliasChoices("QDRANT_HOST"),
    )
    qdrant_port: int = Field(
        default=6333,
        validation_alias=AliasChoices("QDRANT_PORT"),
    )
    cors_origins: Any = Field(
        default=[
            "http://localhost:5173",
            "https://codepilot-ai-wine.vercel.app",
            "https://codepilot-backend-wx7u.onrender.com",
        ],
        validation_alias=AliasChoices("CORS_ORIGINS"),
    )
    llm_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias=AliasChoices("LLM_BASE_URL", "OPENROUTER_BASE_URL"),
    )
    llm_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("LLM_API_KEY", "OPENROUTER_API_KEY"),
    )
    llm_model: str = Field(
        default="openai/gpt-4o-mini",
        validation_alias=AliasChoices("LLM_MODEL", "OPENROUTER_MODEL"),
    )
    llm_app_name: str = Field(
        default="CodePilot AI",
        validation_alias=AliasChoices("LLM_APP_NAME", "OPENROUTER_APP_NAME"),
    )
    llm_site_url: str = Field(
        default="https://codepilot-ai-wine.vercel.app",
        validation_alias=AliasChoices("LLM_SITE_URL", "OPENROUTER_SITE_URL"),
    )
    jwt_secret: str = Field(
        default="codepilot_secret_key_12345",
        validation_alias=AliasChoices("JWT_SECRET"),
    )
    github_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GITHUB_CLIENT_ID"),
    )
    github_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("GITHUB_CLIENT_SECRET"),
    )
    google_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLIENT_ID"),
    )
    google_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET"),
    )
    ws_heartbeat_interval: int = Field(
        default=30,
        validation_alias=AliasChoices("WS_HEARTBEAT_INTERVAL"),
    )
    ws_timeout: int = Field(
        default=45,
        validation_alias=AliasChoices("WS_TIMEOUT"),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_cors_origins(self) -> "Settings":
        self.cors_origins = parse_cors_origins(self.cors_origins)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
