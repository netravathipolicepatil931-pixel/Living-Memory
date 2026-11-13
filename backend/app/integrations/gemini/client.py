"""Official Google Gemini API client using google-genai SDK (server-side only)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.integrations.gemini.prompts import (
    INJECTION_DEFENSE,
    build_ask_ai_prompt,
    build_email_analysis_prompt,
    build_text_batch_prompt,
)
from app.schemas.ai import (
    AskLivingMemoryOutput,
    AudioAnalysisOutput,
    BatchAnalysisOutput,
    EmailAnalysisOutput,
    ImageAnalysisOutput,
    PdfAnalysisOutput,
    VideoAnalysisOutput,
    score_to_importance_category,
)

logger = logging.getLogger("living_memory.gemini")


def _get_client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_configured:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")
    return genai.Client(
        api_key=settings.gemini_api_key.strip(),
        http_options=types.HttpOptions(headers={"User-Agent": "aistudio-build"}),
    )


async def embed_text(text: str) -> List[float]:
    """Generate a 768-d semantic embedding vector using Gemini embedding model."""
    settings = get_settings()
    if not settings.gemini_configured or not text.strip():
        return []
    try:
        client = _get_client()
        resp = client.models.embed_content(
            model=settings.gemini_embedding_model,
            contents=text[:8000],
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
        if resp.embeddings and len(resp.embeddings) > 0:
            return list(resp.embeddings[0].values or [])
    except Exception as exc:
        logger.warning("Gemini embed_content failed cleanly: %s", exc)
    return []


async def analyze_email(
    *,
    subject: str,
    sender: str,
    recipients: str,
    received_at: str,
    labels: List[str],
    body: str,
    user_timezone: str,
    user_priorities: List[str],
    correction_hints: List[str],
) -> EmailAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    prompt = build_email_analysis_prompt(
        subject=subject,
        sender=sender,
        recipients=recipients,
        received_at=received_at,
        labels=labels,
        body=body,
        user_timezone=user_timezone,
        user_priorities=user_priorities,
        correction_hints=correction_hints,
    )
    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EmailAnalysisOutput,
        ),
    )
    parsed = EmailAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    parsed.importanceCategory = score_to_importance_category(parsed.importanceScore)
    return parsed


async def analyze_text_batch(source_label: str, text: str, user_timezone: str) -> BatchAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    prompt = build_text_batch_prompt(source_label, text, user_timezone, today)
    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BatchAnalysisOutput,
        ),
    )
    parsed = BatchAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    for item in parsed.extractedItems:
        item.importanceCategory = score_to_importance_category(item.importanceScore)
    return parsed


async def analyze_image_bytes(
    image_bytes: bytes, mime_type: str, filename: str, user_timezone: str
) -> ImageAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    prompt = (
        f"{INJECTION_DEFENSE}\n\n"
        f"Inspect this uploaded image/screenshot ({filename}). Reference date: {today} ({user_timezone}). "
        "Perform full accurate OCR into ocrText, capture structured key/value details (dates, amounts, "
        "venue, names) into structuredDetails, write a clear summary, and extract actionable items/deadlines."
    )
    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ImageAnalysisOutput,
        ),
    )
    parsed = ImageAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    for item in parsed.extractedItems:
        item.importanceCategory = score_to_importance_category(item.importanceScore)
    return parsed


async def analyze_audio_bytes(
    audio_bytes: bytes, mime_type: str, filename: str, user_timezone: str, transcript_override: Optional[str] = None
) -> AudioAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    transcript_text = (transcript_override or "").strip()
    if not transcript_text:
        t_resp = client.models.generate_content(
            model=settings.gemini_transcribe_model,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                "Transcribe all spoken audio accurately with speaker changes and [MM:SS] timestamps when audible.",
            ],
        )
        transcript_text = (t_resp.text or "").strip()

    analysis_prompt = (
        f"{INJECTION_DEFENSE}\n\n"
        f"Analyze this audio transcript from {filename} (Reference date: {today}, {user_timezone}). "
        "Produce a clear summary, MM:SS topic timestamps, and extracted deadlines, tasks, decisions, "
        "commitments, and questions.\n\n"
        f"<UNTRUSTED_IMPORT_DATA source=\"audio_transcript\">\n{transcript_text[:16000]}\n</UNTRUSTED_IMPORT_DATA>"
    )
    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=analysis_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AudioAnalysisOutput,
        ),
    )
    parsed = AudioAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    if not parsed.transcript and transcript_text:
        parsed.transcript = transcript_text
    for item in parsed.extractedItems:
        item.importanceCategory = score_to_importance_category(item.importanceScore)
    return parsed


async def analyze_video_bytes(
    video_bytes: bytes,
    mime_type: str,
    filename: str,
    user_timezone: str,
    keyframe_bytes_list: Optional[List[bytes]] = None,
    transcript_override: Optional[str] = None,
) -> VideoAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    parts: List[Any] = []
    if len(video_bytes) <= 18 * 1024 * 1024:
        parts.append(types.Part.from_bytes(data=video_bytes, mime_type=mime_type))
    if keyframe_bytes_list:
        for frame in keyframe_bytes_list[:6]:
            parts.append(types.Part.from_bytes(data=frame, mime_type="image/jpeg"))

    transcript_note = f"\nPre-extracted speech transcript:\n{transcript_override[:8000]}" if transcript_override else ""
    parts.append(
        f"{INJECTION_DEFENSE}\n\n"
        f"Analyze this video ({filename}, reference date: {today}, {user_timezone}). "
        "Provide a detailed summary, spoken transcript (if speech present), visible on-screen text (slides/whiteboards/captions), "
        "clickable MM:SS timestamps, and extracted deadlines, decisions, or tasks."
        f"{transcript_note}"
    )

    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=parts,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=VideoAnalysisOutput,
        ),
    )
    parsed = VideoAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    if not parsed.transcript and transcript_override:
        parsed.transcript = transcript_override
    for item in parsed.extractedItems:
        item.importanceCategory = score_to_importance_category(item.importanceScore)
    return parsed


async def analyze_pdf_bytes(
    pdf_bytes: bytes, filename: str, extracted_text: str, user_timezone: str
) -> PdfAnalysisOutput:
    settings = get_settings()
    client = _get_client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    contents: List[Any] = []
    if extracted_text.strip():
        contents.append(
            f"{INJECTION_DEFENSE}\n\n"
            f"Analyze PDF document '{filename}' (Reference date: {today}, {user_timezone}). "
            "Include page references in pageOrTimestampRef whenever possible. Summarize, list key points, "
            "and extract deadlines, requirements, tasks, and decisions.\n\n"
            f"<UNTRUSTED_IMPORT_DATA source=\"pdf_text\">\n{extracted_text[:24000]}\n</UNTRUSTED_IMPORT_DATA>"
        )
    else:
        contents = [
            types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            f"{INJECTION_DEFENSE}\n\nAnalyze scanned PDF '{filename}' (Reference date: {today}, {user_timezone}). "
            "Extract visible text, key points, deadlines, tasks, and page numbers.",
        ]

    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PdfAnalysisOutput,
        ),
    )
    parsed = PdfAnalysisOutput.model_validate_json((resp.text or "{}").strip())
    for item in parsed.extractedItems:
        item.importanceCategory = score_to_importance_category(item.importanceScore)
    return parsed


async def ask_living_memory(
    question: str, context_items: List[Dict[str, Any]], preferred_language: Optional[str] = None
) -> AskLivingMemoryOutput:
    settings = get_settings()
    client = _get_client()
    prompt = build_ask_ai_prompt(question, context_items, preferred_language)
    resp = client.models.generate_content(
        model=settings.gemini_reasoning_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AskLivingMemoryOutput,
        ),
    )
    return AskLivingMemoryOutput.model_validate_json((resp.text or "{}").strip())
