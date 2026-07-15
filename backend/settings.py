from functools import lru_cache
import json
from typing import Any

from pydantic import AliasChoices, Field, field_validator
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

    allow_sandbox_login: bool = Field(
        default=True,
        validation_alias=AliasChoices("ALLOW_DEV_SANDBOX_LOGIN", "ALLOW_SANDBOX_LOGIN"),
    )
    enforce_strict_auth: bool = Field(
        default=True,
        validation_alias=AliasChoices("ENFORCE_STRICT_AUTH"),
    )

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
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://codepilot-ai-wine.vercel.app",
            "https://codepilot-api-257937445938.us-central1.run.app",
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
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/callback/google",
        validation_alias=AliasChoices("GOOGLE_REDIRECT_URI"),
    )
    sso_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("SSO_ENABLED"),
    )
    sso_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("SSO_CLIENT_ID"),
    )
    sso_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("SSO_CLIENT_SECRET"),
    )
    sso_metadata_url: str = Field(
        default="",
        validation_alias=AliasChoices("SSO_METADATA_URL"),
    )
    sso_redirect_uri: str = Field(
        default="http://localhost:5173/auth/sso/callback",
        validation_alias=AliasChoices("SSO_REDIRECT_URI"),
    )
    s3_endpoint_url: str = Field(
        default="http://127.0.0.1:9000",
        validation_alias=AliasChoices("S3_ENDPOINT_URL"),
    )
    s3_access_key: str = Field(
        default="minio_user",
        validation_alias=AliasChoices("S3_ACCESS_KEY"),
    )
    s3_secret_key: str = Field(
        default="minio_password_123",
        validation_alias=AliasChoices("S3_SECRET_KEY"),
    )
    s3_bucket_name: str = Field(
        default="codepilot-storage",
        validation_alias=AliasChoices("S3_BUCKET_NAME"),
    )
    ws_heartbeat_interval: int = Field(
        default=30,
        validation_alias=AliasChoices("WS_HEARTBEAT_INTERVAL"),
    )
    ws_timeout: int = Field(
        default=45,
        validation_alias=AliasChoices("WS_TIMEOUT"),
    )
    ws_idle_timeout: int = Field(
        default=600,
        validation_alias=AliasChoices("WS_IDLE_TIMEOUT"),
    )
    max_ws_message_size: int = Field(
        default=1048576,
        validation_alias=AliasChoices("MAX_WS_MESSAGE_SIZE"),
    )

    # SAML 2.0 Enterprise SSO
    saml_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("SAML_ENABLED"),
    )
    saml_sp_entity_id: str = Field(
        default="codepilot-ai",
        validation_alias=AliasChoices("SAML_SP_ENTITY_ID"),
    )
    saml_acs_url: str = Field(
        default="http://localhost:8000/auth/saml/callback",
        validation_alias=AliasChoices("SAML_ACS_URL"),
    )
    saml_idp_metadata_url: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_IDP_METADATA_URL"),
    )
    saml_idp_entity_id: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_IDP_ENTITY_ID"),
    )
    saml_idp_sso_url: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_IDP_SSO_URL"),
    )
    saml_idp_x509cert: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_IDP_X509CERT"),
    )
    saml_sp_private_key: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_SP_PRIVATE_KEY"),
    )
    saml_sp_x509cert: str = Field(
        default="",
        validation_alias=AliasChoices("SAML_SP_X509CERT"),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins_field(cls, v: Any) -> list[str]:
        return parse_cors_origins(v)


@lru_cache
def get_settings() -> Settings:
    return Settings()
