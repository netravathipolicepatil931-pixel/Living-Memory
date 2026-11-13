"""Modular Sarvam AI client (Saaras STT, Indian-language transcription, Translation, Bulbul TTS)."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger("living_memory.sarvam")


class SarvamNotConfiguredError(RuntimeError):
    pass


class SarvamClient:
    """Async REST client for official Sarvam AI APIs. Keeps SARVAM_API_KEY strictly server-side."""

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def configured(self) -> bool:
        return self.settings.sarvam_configured

    def _headers(self) -> Dict[str, str]:
        if not self.configured:
            raise SarvamNotConfiguredError("SARVAM_API_KEY is not configured on the backend.")
        return {"api-subscription-key": self.settings.sarvam_api_key.strip()}

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str = "audio/wav",
        language_code: str = "unknown",
        translate_to_english: bool = False,
    ) -> Dict[str, Any]:
        """Call Sarvam Saaras Speech-to-Text (or speech-to-text-translate) for Indian & multilingual audio."""
        base = self.settings.sarvam_base_url.rstrip("/")
        endpoint = f"{base}/speech-to-text-translate" if translate_to_english else f"{base}/speech-to-text"
        files = {"file": (filename, audio_bytes, mime_type or "audio/wav")}
        data: Dict[str, str] = {"model": self.settings.sarvam_stt_model}
        if not translate_to_english and language_code:
            data["language_code"] = language_code

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(endpoint, headers=self._headers(), files=files, data=data)
            if resp.status_code >= 400:
                raise RuntimeError(f"Sarvam STT error ({resp.status_code}): {resp.text[:300]}")
            payload = resp.json()
            return {
                "transcript": payload.get("transcript", ""),
                "language_code": payload.get("language_code", language_code),
                "provider": "sarvam",
                "model": self.settings.sarvam_stt_model,
            }

    async def translate_text(
        self,
        text: str,
        source_language_code: str = "auto",
        target_language_code: str = "en-IN",
    ) -> Dict[str, Any]:
        """Translate Indian regional language text using Sarvam Mayura/Sarvam-Translate."""
        base = self.settings.sarvam_base_url.rstrip("/")
        endpoint = f"{base}/translate"
        body = {
            "input": text[:2000],
            "source_language_code": source_language_code,
            "target_language_code": target_language_code,
            "model": self.settings.sarvam_translate_model,
            "mode": "formal",
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(endpoint, headers=self._headers(), json=body)
            if resp.status_code >= 400:
                raise RuntimeError(f"Sarvam Translate error ({resp.status_code}): {resp.text[:300]}")
            data = resp.json()
            return {
                "translated_text": data.get("translated_text", text),
                "source_language_code": data.get("source_language_code", source_language_code),
                "provider": "sarvam",
            }

    async def text_to_speech(
        self,
        text: str,
        target_language_code: str = "en-IN",
        speaker: str = "anushka",
    ) -> Dict[str, Any]:
        """Optional Bulbul TTS endpoint returning base64 audio segments."""
        base = self.settings.sarvam_base_url.rstrip("/")
        endpoint = f"{base}/text-to-speech"
        body = {
            "inputs": [text[:500]],
            "target_language_code": target_language_code,
            "speaker": speaker,
            "model": self.settings.sarvam_tts_model,
            "enable_preprocessing": True,
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(endpoint, headers=self._headers(), json=body)
            if resp.status_code >= 400:
                raise RuntimeError(f"Sarvam TTS error ({resp.status_code}): {resp.text[:300]}")
            data = resp.json()
            return {
                "audios": data.get("audios", []),
                "provider": "sarvam",
                "model": self.settings.sarvam_tts_model,
            }

    async def parse_document_intelligence(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
    ) -> Optional[Dict[str, Any]]:
        """Attempt Sarvam Vision/Document Intelligence when configured; returns None cleanly if unsupported."""
        if not self.configured:
            return None
        base = self.settings.sarvam_base_url.rstrip("/")
        endpoint = f"{base}/parse/parsepdf"
        if not filename.lower().endswith(".pdf"):
            return None
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    endpoint,
                    headers=self._headers(),
                    files={"file": (filename, file_bytes, mime_type or "application/pdf")},
                )
                if resp.status_code < 400:
                    return resp.json()
        except Exception as exc:
            logger.info("Sarvam document parse fallback triggered: %s", exc)
        return None
