"""Multimodal file upload & async processing routes (images, audio, video, PDF, DOCX, text)."""

from __future__ import annotations

import os
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.services.file_service import FileService
from app.utils.media_utils import validate_upload_file
from app.workers.job_runner import schedule_background_job

router = APIRouter(tags=["uploads"])


def _ext_to_job_kind(ext: str) -> str:
    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return "image"
    if ext in {".mp3", ".wav", ".m4a", ".aac", ".ogg"}:
        return "audio"
    if ext in {".mp4", ".mov", ".webm"}:
        return "video"
    return "document"


async def _enqueue_media_upload(
    file: UploadFile,
    user_timezone: str,
    language_hint: str,
    user: AuthenticatedUser,
) -> dict:
    content = await file.read()
    filename = file.filename or "upload.bin"

    try:
        ext, detected_mime = validate_upload_file(filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    mime_type = file.content_type or detected_mime
    job_kind = _ext_to_job_kind(ext)
    repo = Repository()
    job = repo.create_job(user.id, filename, job_kind, f"Uploaded {filename}; queued for AI analysis")
    svc = FileService(repo)

    async def work(progress_cb):
        return await svc.ingest_uploaded_file(
            user.id,
            filename=filename,
            content=content,
            mime_type=mime_type,
            user_timezone=user_timezone,
            language_hint=language_hint,
            progress_cb=progress_cb,
        )

    schedule_background_job(repo, user.id, job["id"], work)
    return {"jobId": job["id"], "status": "Queued"}


@router.post("/api/uploads")
async def upload_file(
    file: UploadFile = File(...),
    userTimezone: str = Form(default="UTC"),
    languageHint: str = Form(default="unknown"),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _enqueue_media_upload(file, userTimezone, languageHint, user)


@router.post("/api/ingest/media")
async def upload_media_alias(
    file: UploadFile = File(...),
    userTimezone: str = Form(default="UTC"),
    languageHint: str = Form(default="unknown"),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _enqueue_media_upload(file, userTimezone, languageHint, user)
