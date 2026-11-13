"""Memories, Memory DNA Versions, Entities, Semantic Search, Forgotten Context, & Conflicts routes."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.integrations.gemini.client import embed_text
from app.schemas.api import ConflictResolveRequest, MemoryUpdateRequest
from app.services.conflict_service import ConflictService
from app.services.memory_service import MemoryService

router = APIRouter(tags=["memories"])


@router.get("/api/memories")
async def list_memories(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=120, ge=1, le=300),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    svc = MemoryService(repo)
    return {
        "memories": svc.list_memories(user.id, category=category, limit=limit),
        "entities": repo.list_entities(user.id),
        "relationships": repo.list_relationships(user.id),
        "commitments": repo.list_commitments(user.id),
        "decisions": repo.list_decisions(user.id),
        "conflicts": repo.list_conflicts(user.id),
    }


@router.get("/api/memories/forgotten")
async def get_forgotten_memories(
    staleDays: int = Query(default=14, ge=1, le=365),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    svc = MemoryService(Repository())
    return {"items": svc.get_forgotten_memories(user.id, stale_days=staleDays)}


@router.get("/api/memories/search")
async def search_memories_semantic(
    q: str = Query(..., min_length=1),
    topK: int = Query(default=10, ge=1, le=30),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    emb = await embed_text(q)
    if emb:
        results = repo.semantic_search_memories(user.id, emb, top_k=topK)
    else:
        ql = q.lower()
        results = [
            m
            for m in repo.list_memories(user.id, limit=150)
            if ql in (m.get("title", "") + " " + m.get("current_information", "")).lower()
        ][:topK]
    return {"results": results, "semantic": bool(emb)}


@router.get("/api/memories/{memory_id}")
async def get_memory_detail(
    memory_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    svc = MemoryService(Repository())
    mem = svc.get_memory_detail(user.id, memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"memory": mem}


@router.patch("/api/memories/{memory_id}")
async def update_memory(
    memory_id: str,
    payload: MemoryUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    svc = MemoryService(Repository())
    updated = svc.update_memory_with_version(
        user.id,
        memory_id,
        verification_status=payload.verificationStatus,
        current_information=payload.currentInformation,
        reason=payload.reason,
        note=payload.note,
        importance_score=payload.importanceScore,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"memory": updated}


@router.delete("/api/memories/{memory_id}")
async def delete_memory(
    memory_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    ok = MemoryService(Repository()).delete_memory(user.id, memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"ok": True}


@router.get("/api/conflicts")
async def list_conflicts(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    return {"conflicts": ConflictService(Repository()).list_conflicts(user.id)}


@router.post("/api/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    payload: ConflictResolveRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    updated = ConflictService(Repository()).resolve_conflict(
        user.id, conflict_id, payload.status, payload.chosenValue
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Conflict not found.")
    return {"conflict": updated}
