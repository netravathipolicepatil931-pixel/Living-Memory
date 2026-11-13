"""Audio/Video transcription & multilingual translation routing (Sarvam Saaras + Gemini fallback)."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict

from app.core.config import get_settings
from app.integrations.gemini.client import analyze_audio_bytes
from app.integrations.sarvam.client import SarvamClient, SarvamNotConfiguredError
from app.utils.media_utils import extract_video_audio_and_keyframes

logger = logging.getLogger("living_memory.transcription")


class TranscriptionService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.sarvam = SarvamClient()

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language_hint: str = "unknown",
        translate_to_english: bool = False,
    ) -> Dict[str, Any]:
        """Prefer Sarvam Saaras when configured (especially for Indian languages), else Gemini Audio."""
        if self.sarvam.configured:
            try:
                ext = os.path.splitext(filename.lower())[1] or ".mp3"
                wav_bytes = None
                if ext in {".mp4", ".mov", ".webm", ".m4a", ".ogg"}:
                    wav_bytes, _ = extract_video_audio_and_keyframes(audio_bytes, ext)
                send_bytes = wav_bytes or audio_bytes
                send_name = f"{filename}.wav" if wav_bytes else filename
                send_mime = "audio/wav" if wav_bytes else mime_type
                res = await self.sarvam.speech_to_text(
                    send_bytes,
                    filename=send_name,
                    mime_type=send_mime,
                    language_code=language_hint,
                    translate_to_english=translate_to_english,
                )
                if res.get("transcript"):
                    return res
            except Exception as exc:
                logger.warning("Sarvam STT fallback to Gemini: %s", exc)

        if self.settings.gemini_configured:
            analyzed = await analyze_audio_bytes(
                audio_bytes, mime_type, filename, user_timezone="UTC"
            )
            return {
                "transcript": analyzed.transcript,
                "language_code": analyzed.detectedLanguage or language_hint,
                "provider": "gemini",
                "model": self.settings.gemini_transcribe_model,
                "analysis": analyzed.model_dump(),
            }

        raise RuntimeError(
            "Neither SARVAM_API_KEY nor GEMINI_API_KEY is configured for audio transcription."
        )

    async def translate_text(
        self, text: str, source_language_code: str = "auto", target_language_code: str = "en-IN"
    ) -> Dict[str, Any]:
        if not self.sarvam.configured:
            raise SarvamNotConfiguredError("SARVAM_API_KEY is not configured for translation.")
        return await self.sarvam.translate_text(text, source_language_code, target_language_code)

    async def synthesize_speech(
        self, text: str, target_language_code: str = "en-IN", speaker: str = "anushka"
    ) -> Dict[str, Any]:
        if not self.sarvam.configured:
            raise SarvamNotConfiguredError("SARVAM_API_KEY is not configured for Bulbul TTS.")
        return await self.sarvam.text_to_speech(text, target_language_code=target_language_code, speaker=speaker)
