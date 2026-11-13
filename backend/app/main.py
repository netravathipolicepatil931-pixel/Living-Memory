"""LIVING MEMORY FastAPI Application Entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
import time
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    ask_ai,
    auth,
    deadlines,
    gmail,
    memories,
    notifications,
    sources,
    uploads,
    whatsapp,
)
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.database.session import get_sqlite_conn, get_supabase_client

logger = configure_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_sqlite_conn()
    sb = get_supabase_client()
    logger.info(
        "LIVING MEMORY backend started (db=%s, gemini=%s, sarvam=%s, google_oauth=%s)",
        "supabase" if sb else "sqlite_fallback",
        settings.gemini_configured,
        settings.sarvam_configured,
        settings.google_oauth_configured,
    )
    yield


app = FastAPI(
    title="LIVING MEMORY Intelligence API",
    version="2.0.0",
    description="Personal Context Intelligence Platform Backend (FastAPI + Gemini + Sarvam + Gmail OAuth + Supabase/pgvector).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    if request.url.path != "/api/health":
        logger.info("%s %s -> %s (%dms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.get("/api/health")
def health_check() -> dict:
    s = get_settings()
    sb = get_supabase_client()
    return {
        "ok": True,
        "geminiConfigured": s.gemini_configured,
        "sarvamConfigured": s.sarvam_configured,
        "supabaseConfigured": bool(sb),
        "googleOAuthConfigured": s.google_oauth_configured,
        "googleWorkspaceConfigured": s.google_oauth_configured,
        "databaseMode": "supabase_postgres" if sb else "sqlite_local",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/system/status")
def system_status() -> dict:
    s = get_settings()
    sb = get_supabase_client()
    missing_env = []
    if not s.gemini_configured:
        missing_env.append("GEMINI_API_KEY")
    if not s.google_oauth_configured:
        missing_env.extend(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])
    if not s.supabase_configured:
        missing_env.extend(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"])
    if not s.sarvam_configured:
        missing_env.append("SARVAM_API_KEY")

    return {
        "ok": True,
        "databaseMode": "supabase_postgres" if sb else "sqlite_local",
        "geminiConfigured": s.gemini_configured,
        "sarvamConfigured": s.sarvam_configured,
        "supabaseConfigured": bool(sb),
        "googleOAuthConfigured": s.google_oauth_configured,
        "googleRedirectUri": s.effective_google_redirect_uri,
        "models": {
            "geminiReasoning": s.gemini_reasoning_model,
            "geminiTranscribe": s.gemini_transcribe_model,
            "geminiEmbedding": s.gemini_embedding_model,
            "sarvamStt": s.sarvam_stt_model,
            "sarvamTranslate": s.sarvam_translate_model,
            "sarvamTts": s.sarvam_tts_model,
        },
        "missingCredentials": missing_env,
    }


app.include_router(auth.router)
app.include_router(gmail.router)
app.include_router(sources.router)
app.include_router(whatsapp.router)
app.include_router(uploads.router)
app.include_router(memories.router)
app.include_router(deadlines.router)
app.include_router(notifications.router)
app.include_router(ask_ai.router)
