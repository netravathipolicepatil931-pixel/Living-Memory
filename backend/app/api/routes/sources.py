"""Sources, Background Processing Jobs, & Workspace Data Management routes."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository

router = APIRouter(tags=["sources"])


class SourceCorrectionRequest(BaseModel):
    ocrText: Optional[str] = None
    aiSummary: Optional[str] = None


@router.get("/api/sources")
async def list_sources(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    return {"sources": repo.list_sources(user.id, limit=limit, offset=offset)}


@router.get("/api/sources/{source_id}")
async def get_source_detail(
    source_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    repo = Repository()
    src = repo.get_source(user.id, source_id)
    if not src:
        raise HTTPException(status_code=404, detail="Source not found.")
    return {"source": src}


@router.patch("/api/sources/{source_id}")
async def update_source_extraction(
    source_id: str,
    payload: SourceCorrectionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    src = repo.get_source(user.id, source_id)
    if not src:
        raise HTTPException(status_code=404, detail="Source not found.")
    patch = {}
    if payload.ocrText is not None:
        patch["ocr_text"] = payload.ocrText
    if payload.aiSummary is not None:
        patch["ai_summary"] = payload.aiSummary
    if patch:
        repo.update_source(user.id, source_id, patch)
    return {"source": repo.get_source(user.id, source_id)}


@router.delete("/api/sources/{source_id}")
async def delete_source(
    source_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    repo = Repository()
    repo.delete_source(user.id, source_id)
    return {"ok": True}


@router.get("/api/jobs")
async def list_jobs(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    return {"jobs": Repository().list_jobs(user.id)}


@router.get("/api/jobs/{job_id}")
async def get_job_status(
    job_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    job = Repository().get_job(user.id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found.")
    return {"job": job}


@router.post("/api/workspace/clear")
async def clear_workspace_data(
    scope: str = Query(default="all", pattern="^(all|sources|memories)$"),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    Repository().clear_user_data(user.id, scope=scope)
    return {"ok": True, "scope": scope}
