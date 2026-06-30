from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_title: str = "CodePilot AI"
    api_version: str = "1.0.0"
    cors_origins: list[str] = Field(
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
