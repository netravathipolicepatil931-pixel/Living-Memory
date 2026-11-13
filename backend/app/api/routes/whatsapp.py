"""WhatsApp exported chat (.txt / .zip) preview and intelligence extraction routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.schemas.api import WhatsAppAnalyzeRequest
from app.services.file_service import FileService
from app.utils.whatsapp_parser import parse_whatsapp_text, parse_whatsapp_zip
from app.workers.job_runner import schedule_background_job

router = APIRouter(tags=["whatsapp"])


async def _handle_whatsapp_upload(file: UploadFile) -> dict:
    raw = await file.read()
    filename = file.filename or "chat.txt"
    if filename.lower().endswith(".zip"):
        parsed = parse_whatsapp_zip(raw, filename)
        media_files = [
            {
                "filename": a["filename"],
                "kind": a["kind"],
                "mimeType": a["mimeType"],
                "sizeBytes": a["sizeBytes"],
            }
            for a in parsed.get("attachments", [])
        ]
        preview = {
            "groupName": parsed["groupName"],
            "participants": parsed["participants"],
            "messageCount": parsed["messageCount"],
            "dateRange": parsed["dateRange"],
            "mediaCount": parsed["mediaCount"],
            "mediaFiles": media_files,
            "sampleMessages": parsed["messages"][:12],
            "messages": parsed["messages"][:250],
            "rawText": parsed["rawText"],
            "attachments": media_files,
        }
    elif filename.lower().endswith(".txt"):
        txt = raw.decode("utf-8", errors="replace")
        parsed = parse_whatsapp_text(txt, filename)
        preview = {
            "groupName": parsed["groupName"],
            "participants": parsed["participants"],
            "messageCount": parsed["messageCount"],
            "dateRange": parsed["dateRange"],
            "mediaCount": 0,
            "mediaFiles": [],
            "sampleMessages": parsed["messages"][:12],
            "messages": parsed["messages"][:250],
            "rawText": txt,
            "attachments": [],
        }
    else:
        raise HTTPException(status_code=400, detail="Only WhatsApp .txt or .zip exports are supported.")
    return {"preview": preview}


@router.post("/api/whatsapp/upload")
async def whatsapp_upload_preview(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _handle_whatsapp_upload(file)


@router.post("/api/ingest/whatsapp/preview")
async def whatsapp_preview_alias(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _handle_whatsapp_upload(file)


async def _start_whatsapp_job(payload: WhatsAppAnalyzeRequest, user: AuthenticatedUser) -> dict:
    repo = Repository()
    job = repo.create_job(user.id, f"WhatsApp · {payload.groupName}", "whatsapp", "Queued WhatsApp analysis")
    svc = FileService(repo)

    async def work(progress_cb):
        return await svc.ingest_whatsapp_analysis(
            user.id,
            group_name=payload.groupName,
            raw_text=payload.rawText,
            include_media=payload.includeMedia,
            attachments=payload.attachments,
            user_timezone=payload.userTimezone,
            progress_cb=progress_cb,
        )

    schedule_background_job(repo, user.id, job["id"], work)
    return {"jobId": job["id"], "status": "Queued"}


@router.post("/api/whatsapp/analyze")
async def whatsapp_analyze(
    payload: WhatsAppAnalyzeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _start_whatsapp_job(payload, user)


@router.post("/api/ingest/whatsapp/analyze")
async def whatsapp_analyze_alias(
    payload: WhatsAppAnalyzeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return await _start_whatsapp_job(payload, user)
