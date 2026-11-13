"""Ask Living Memory (RAG Q&A with evidence citations) + optional Sarvam Translation & TTS."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.integrations.sarvam.client import SarvamNotConfiguredError
from app.schemas.api import AskAIRequest, TTSRequest
from app.services.memory_service import MemoryService
from app.services.transcription_service import TranscriptionService

router = APIRouter(tags=["ask_ai"])


async def _run_ask(payload: AskAIRequest, user: AuthenticatedUser) -> dict:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    svc = MemoryService(Repository())
    try:
        return await svc.ask_ai(
            user.id,
            question=payload.question,
            context_snapshot=payload.contextSnapshot,
            use_semantic_search=payload.useSemanticSearch,
            preferred_language=payload.preferredLanguage,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/api/ask-ai")
async def ask_ai_endpoint(
    payload: AskAIRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    return await _run_ask(payload, user)


@router.post("/api/ai/ask")
async def ask_ai_alias(
    payload: AskAIRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    return await _run_ask(payload, user)


@router.post("/api/ask-ai/tts")
async def ask_ai_tts(
    payload: TTSRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text is required for TTS.")
    try:
        return await TranscriptionService().synthesize_speech(
            payload.text, target_language_code=payload.languageCode, speaker=payload.speaker
        )
    except SarvamNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
