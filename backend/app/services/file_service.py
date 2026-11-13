"""Multimodal File & WhatsApp Ingestion Service (Images, Audio, Video, PDF, DOCX, Text, WhatsApp)."""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from app.core.config import get_settings
from app.database.repository import Repository
from app.integrations.gemini.client import (
    analyze_audio_bytes,
    analyze_image_bytes,
    analyze_pdf_bytes,
    analyze_text_batch,
    analyze_video_bytes,
)
from app.integrations.sarvam.client import SarvamClient
from app.services.memory_service import MemoryService
from app.services.transcription_service import TranscriptionService
from app.utils.document_parser import extract_docx_text, extract_pdf_text_with_pages
from app.utils.media_utils import extract_video_audio_and_keyframes, validate_upload_file

logger = logging.getLogger("living_memory.file_service")


def _classify_kind(ext: str) -> str:
    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return "image"
    if ext in {".mp3", ".wav", ".m4a", ".aac", ".ogg"}:
        return "audio"
    if ext in {".mp4", ".mov", ".webm"}:
        return "video"
    if ext == ".pdf":
        return "pdf"
    if ext == ".docx":
        return "docx"
    return "text"


def _kind_to_source_type(kind: str, ext: str) -> str:
    if kind == "image":
        return "Image"
    if kind == "audio":
        return "Audio"
    if kind == "video":
        return "Video"
    if ext == ".pdf":
        return "PDF Document"
    if ext == ".docx":
        return "DOCX Document"
    return "Text File"


class FileService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo
        self.settings = get_settings()
        self.memory_service = MemoryService(repo)
        self.transcription = TranscriptionService()
        self.sarvam = SarvamClient()

    async def ingest_uploaded_file(
        self,
        user_id: str,
        *,
        filename: str,
        content: bytes,
        mime_type: str,
        user_timezone: str = "UTC",
        language_hint: str = "unknown",
        progress_cb: Optional[Callable[[str, int, str], None]] = None,
    ) -> Dict[str, Any]:
        ext, detected_mime = validate_upload_file(filename, content)
        effective_mime = mime_type or detected_mime
        kind = _classify_kind(ext)
        source_type = _kind_to_source_type(kind, ext)

        if progress_cb:
            progress_cb("Uploaded", 15, f"Stored {filename}; preparing extraction...")

        storage_path = self.repo.store_uploaded_bytes(user_id, filename, content, effective_mime)
        source_row = self.repo.create_source(
            user_id,
            {
                "name": filename,
                "source_type": source_type,
                "storage_path": storage_path,
                "mime_type": effective_mime,
                "size_bytes": len(content),
                "processing_status": "Processing",
                "record_count": 1,
                "authority_basis": f"User-uploaded {source_type} stored securely and analyzed on backend.",
                "verification_state": "Direct Source",
                "data_origin": "Live",
            },
        )

        if progress_cb:
            progress_cb("Processing", 40, f"Extracting intelligence from {source_type}...")

        summary = ""
        ocr_text = ""
        transcript = ""
        visible_text: List[str] = []
        structured_details: Dict[str, Any] = {}
        timestamps: List[Dict[str, str]] = []
        extracted_items: List[Dict[str, Any]] = []

        error_message = ""

        if kind == "image":
            if self.settings.gemini_configured:
                out = await analyze_image_bytes(content, effective_mime, filename, user_timezone)
                summary = out.summary
                ocr_text = out.ocrText
                structured_details = out.structuredDetails
                extracted_items = [it.model_dump() for it in out.extractedItems]
            else:
                error_message = "Gemini API: Not configured. Image stored locally; configure GEMINI_API_KEY for OCR and AI extraction."
                summary = f"Stored image '{filename}' locally (Gemini AI OCR not configured)."

        elif kind == "audio":
            transcript_override: Optional[str] = None
            stt_meta: Dict[str, Any] = {}
            if self.sarvam.configured:
                try:
                    stt_meta = await self.transcription.transcribe_audio(
                        content, filename, effective_mime, language_hint=language_hint
                    )
                    transcript_override = stt_meta.get("transcript") or None
                except Exception as exc:
                    logger.info("Sarvam audio STT fallback to Gemini: %s", exc)

            if self.settings.gemini_configured:
                out = await analyze_audio_bytes(
                    content,
                    effective_mime,
                    filename,
                    user_timezone,
                    transcript_override=transcript_override,
                )
                summary = out.summary
                transcript = out.transcript or transcript_override or ""
                timestamps = [{"time": t.time, "topic": t.label} for t in out.timestamps]
                extracted_items = [it.model_dump() for it in out.extractedItems]
                if stt_meta.get("provider"):
                    structured_details["transcriptionProvider"] = stt_meta["provider"]
            elif transcript_override:
                transcript = transcript_override
                summary = f"Transcribed via Sarvam {stt_meta.get('model', 'saaras:v3')} (Gemini extraction not configured)."
            else:
                error_message = "Gemini API & Sarvam AI: Not configured. Audio stored locally; configure GEMINI_API_KEY or SARVAM_API_KEY for transcription."
                summary = f"Stored audio '{filename}' locally (AI transcription not configured)."

        elif kind == "video":
            audio_wav, keyframes = extract_video_audio_and_keyframes(content, ext)
            transcript_override = None
            if self.sarvam.configured and audio_wav:
                try:
                    stt = await self.sarvam.speech_to_text(
                        audio_wav, f"{filename}.wav", "audio/wav", language_code=language_hint
                    )
                    transcript_override = stt.get("transcript") or None
                except Exception:
                    pass
            if self.settings.gemini_configured:
                out = await analyze_video_bytes(
                    content,
                    effective_mime,
                    filename,
                    user_timezone,
                    keyframe_bytes_list=keyframes,
                    transcript_override=transcript_override,
                )
                summary = out.summary
                transcript = out.transcript
                visible_text = [out.visibleText] if out.visibleText else []
                timestamps = [{"time": t.time, "topic": t.label} for t in out.timestamps]
                extracted_items = [it.model_dump() for it in out.extractedItems]
            else:
                transcript = transcript_override or ""
                structured_details = {"extractedKeyframes": str(len(keyframes))}
                error_message = "Gemini API: Not configured. Video stored locally; configure GEMINI_API_KEY for multimodal video analysis."
                summary = f"Stored video '{filename}' locally ({len(keyframes)} keyframes extracted; Gemini AI not configured)."

        elif kind == "pdf":
            raw_pdf_text, page_count = extract_pdf_text_with_pages(content)
            if self.sarvam.configured and not raw_pdf_text.strip():
                sarvam_doc = await self.sarvam.parse_document_intelligence(content, filename, effective_mime)
                if sarvam_doc and sarvam_doc.get("text"):
                    raw_pdf_text = sarvam_doc["text"]
            if self.settings.gemini_configured:
                out = await analyze_pdf_bytes(content, filename, raw_pdf_text, user_timezone)
                summary = out.summary
                ocr_text = raw_pdf_text[:8000]
                structured_details = {
                    "pageCount": str(page_count),
                    "keyPoints": "; ".join(out.keyPoints[:5]),
                }
                extracted_items = [it.model_dump() for it in out.extractedItems]
            else:
                ocr_text = raw_pdf_text[:8000]
                summary = f"Extracted text from {page_count} PDF pages."

        elif kind == "docx":
            doc_text = extract_docx_text(content)
            if self.settings.gemini_configured:
                out = await analyze_text_batch(f"DOCX Document: {filename}", doc_text, user_timezone)
                summary = out.summary
                ocr_text = doc_text[:8000]
                extracted_items = [it.model_dump() for it in out.extractedItems]
            else:
                ocr_text = doc_text[:8000]
                summary = f"Parsed DOCX document ({len(doc_text)} chars)."

        else:
            txt = content.decode("utf-8", errors="replace")
            if self.settings.gemini_configured:
                out = await analyze_text_batch(f"Text Document: {filename}", txt, user_timezone)
                summary = out.summary
                ocr_text = txt[:8000]
                extracted_items = [it.model_dump() for it in out.extractedItems]
            else:
                ocr_text = txt[:8000]
                summary = f"Loaded text file ({len(txt)} chars)."

        if progress_cb:
            progress_cb("Analyzed", 80, f"Persisting {len(extracted_items)} discoveries into Memory DNA...")

        needs_attention = False
        for item in extracted_items:
            res = await self.memory_service.persist_extracted_item(
                user_id,
                item=item,
                source_id=source_row["id"],
                source_name=filename,
                source_type=source_type,
                user_timezone=user_timezone,
                external_ref=storage_path,
            )
            if res.get("deadline") and res["deadline"].get("needs_confirmation"):
                needs_attention = True

        final_status = "Needs attention" if (needs_attention or error_message) else "Completed"
        self.repo.update_source(
            user_id,
            source_row["id"],
            {
                "processing_status": final_status,
                "extracted_memories_count": len(extracted_items),
                "ai_summary": summary,
                "ocr_text": ocr_text,
                "transcript": transcript,
                "visible_text": "\n".join(visible_text) if visible_text else "",
                "structured_details": structured_details,
                "timestamps_json": timestamps,
                "error_message": error_message,
            },
        )

        return {
            "sourceId": source_row["id"],
            "sourceType": source_type,
            "summary": summary,
            "ocrText": ocr_text or None,
            "transcript": transcript or None,
            "visibleText": visible_text or None,
            "structuredDetails": structured_details or None,
            "timestamps": timestamps or None,
            "extractedItems": extracted_items,
            "job_status": final_status,
            "job_message": error_message or f"Extracted {len(extracted_items)} items from {filename}.",
        }

    async def ingest_whatsapp_analysis(
        self,
        user_id: str,
        *,
        group_name: str,
        raw_text: str,
        include_media: bool = False,
        attachments: Optional[List[Dict[str, Any]]] = None,
        user_timezone: str = "UTC",
        progress_cb: Optional[Callable[[str, int, str], None]] = None,
    ) -> Dict[str, Any]:
        if progress_cb:
            progress_cb("Processing", 30, f"Analyzing WhatsApp export '{group_name}'...")

        storage_path = self.repo.store_uploaded_bytes(
            user_id, f"{group_name}.txt", raw_text.encode("utf-8", errors="replace"), "text/plain"
        )
        source_row = self.repo.create_source(
            user_id,
            {
                "name": f"WhatsApp · {group_name}",
                "source_type": "WhatsApp Export",
                "storage_path": storage_path,
                "mime_type": "text/plain",
                "size_bytes": len(raw_text.encode("utf-8", errors="replace")),
                "processing_status": "Processing",
                "record_count": max(1, len(raw_text.splitlines())),
                "authority_basis": "User-exported WhatsApp chat transcript analyzed explicitly.",
                "verification_state": "Peer Discussion",
                "data_origin": "Live",
            },
        )

        if not self.settings.gemini_configured:
            msg = (
                f"Stored WhatsApp chat '{group_name}' locally. "
                "Gemini API: Not configured (set GEMINI_API_KEY to run AI extraction)."
            )
            self.repo.update_source(
                user_id,
                source_row["id"],
                {
                    "processing_status": "Needs attention",
                    "extracted_memories_count": 0,
                    "ai_summary": msg,
                    "ocr_text": raw_text[:8000],
                    "error_message": msg,
                },
            )
            return {
                "sourceId": source_row["id"],
                "summary": msg,
                "extractedItems": [],
                "job_status": "Needs attention",
                "job_message": msg,
            }

        out = await analyze_text_batch(
            f"WhatsApp Export ({group_name})", raw_text, user_timezone
        )
        extracted_items = [it.model_dump() for it in out.extractedItems]

        if progress_cb:
            progress_cb("Analyzed", 80, f"Storing {len(extracted_items)} memories & deadlines...")

        needs_attention = False
        for item in extracted_items:
            res = await self.memory_service.persist_extracted_item(
                user_id,
                item=item,
                source_id=source_row["id"],
                source_name=f"WhatsApp · {group_name}",
                source_type="WhatsApp Export",
                user_timezone=user_timezone,
                external_ref=storage_path,
            )
            if res.get("deadline") and res["deadline"].get("needs_confirmation"):
                needs_attention = True

        final_status = "Needs attention" if needs_attention else "Completed"
        self.repo.update_source(
            user_id,
            source_row["id"],
            {
                "processing_status": final_status,
                "extracted_memories_count": len(extracted_items),
                "ai_summary": out.summary,
            },
        )

        return {
            "sourceId": source_row["id"],
            "summary": out.summary,
            "extractedItems": extracted_items,
            "job_status": final_status,
            "job_message": f"Extracted {len(extracted_items)} items from WhatsApp '{group_name}'.",
        }
