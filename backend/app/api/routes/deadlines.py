"""Unified Deadlines, Reminders, Confirmation, and Impact Radar routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.schemas.api import DeadlineConfirmRequest, DeadlineCreateRequest
from app.services.deadline_service import DeadlineService

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])


@router.get("")
async def list_deadlines(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    return {"deadlines": DeadlineService(Repository()).list_deadlines(user.id)}


@router.post("")
async def create_deadline(
    payload: DeadlineCreateRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    dl = DeadlineService(Repository()).create_user_reminder(
        user.id,
        title=payload.title,
        due_date=payload.date,
        due_time=payload.time,
        timezone_name=payload.timezone,
        supporting_evidence=payload.supportingEvidence,
        related_task=payload.relatedTask,
    )
    return {"deadline": dl}


@router.post("/{deadline_id}/confirm")
async def confirm_deadline(
    deadline_id: str,
    payload: DeadlineConfirmRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    updated = DeadlineService(Repository()).confirm_deadline(
        user.id, deadline_id, payload.confirmedDate, payload.confirmedTime
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return {"deadline": updated}


@router.post("/{deadline_id}/toggle")
async def toggle_deadline(
    deadline_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    updated = DeadlineService(Repository()).toggle_complete(user.id, deadline_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return {"deadline": updated}


@router.get("/{deadline_id}/impact")
async def deadline_impact_radar(
    deadline_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    impact = DeadlineService(Repository()).get_impact_for_deadline(user.id, deadline_id)
    if not impact:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return {"impact": impact}
