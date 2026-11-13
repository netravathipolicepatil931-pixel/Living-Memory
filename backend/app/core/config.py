"""Centralized backend configuration loaded strictly from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import List
import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"


def _load_dotenv_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv_file(ROOT_DIR / ".env")
_load_dotenv_file(BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    app_env: str = Field(default="development", alias="APP_ENV")
    app_url: str = Field(
        default="https://ais-dev-6zidvvfixbtu5iuknyze5i-129547639717.asia-southeast1.run.app",
        alias="APP_URL",
    )
    backend_host: str = Field(default="127.0.0.1", alias="BACKEND_HOST")
    backend_port: int = Field(default=8088, alias="BACKEND_PORT")
    cors_origins_raw: str = Field(
        default="http://localhost:3000,https://ais-dev-6zidvvfixbtu5iuknyze5i-129547639717.asia-southeast1.run.app,https://ais-pre-6zidvvfixbtu5iuknyze5i-129547639717.asia-southeast1.run.app",
        alias="CORS_ORIGINS",
    )

    session_secret: str = Field(default="", alias="SESSION_SECRET")
    token_encryption_key: str = Field(default="", alias="TOKEN_ENCRYPTION_KEY")

    # Supabase
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")
    supabase_storage_bucket: str = Field(default="living-memory-sources", alias="SUPABASE_STORAGE_BUCKET")
    database_url: str = Field(default="", alias="DATABASE_URL")

    # Google OAuth 2.0
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(default="", alias="GOOGLE_REDIRECT_URI")

    # Google Gemini
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_reasoning_model: str = Field(default="gemini-4-hydrogen", alias="GEMINI_REASONING_MODEL")
    gemini_transcribe_model: str = Field(default="gemini-3.5-transcribe", alias="GEMINI_TRANSCRIBE_MODEL")
    gemini_embedding_model: str = Field(default="gemini-embedding-2", alias="GEMINI_EMBEDDING_MODEL")

    # Sarvam AI
    sarvam_api_key: str = Field(default="", alias="SARVAM_API_KEY")
    sarvam_base_url: str = Field(default="https://api.sarvam.ai", alias="SARVAM_BASE_URL")
    sarvam_stt_model: str = Field(default="saaras:v3", alias="SARVAM_STT_MODEL")
    sarvam_tts_model: str = Field(default="bulbul:v2", alias="SARVAM_TTS_MODEL")
    sarvam_translate_model: str = Field(default="mayura:v1", alias="SARVAM_TRANSLATE_MODEL")

    @property
    def cors_origins(self) -> List[str]:
        items = [x.strip() for x in self.cors_origins_raw.split(",") if x.strip()]
        if self.app_url and self.app_url not in items:
            items.append(self.app_url)
        return items

    @property
    def effective_google_redirect_uri(self) -> str:
        if self.google_redirect_uri:
            return self.google_redirect_uri.strip()
        base = self.app_url.rstrip("/")
        return f"{base}/api/integrations/gmail/callback"

    @property
    def effective_calendar_redirect_uri(self) -> str:
        base = self.app_url.rstrip("/")
        return f"{base}/api/integrations/calendar/callback"

    @property
    def gemini_configured(self) -> bool:
        val = self.gemini_api_key.strip()
        return bool(val and val != "MY_GEMINI_API_KEY")

    @property
    def sarvam_configured(self) -> bool:
        return bool(self.sarvam_api_key.strip())

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id.strip() and self.google_client_secret.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
