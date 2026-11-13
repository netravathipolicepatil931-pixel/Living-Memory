"""Proactive Notifications feed & read/dismiss actions."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    return {"notifications": NotificationService(Repository()).list_notifications(user.id)}


@router.post("/read-all")
async def mark_all_read(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    NotificationService(Repository()).mark_read(user.id, notif_id=None)
    return {"ok": True}


@router.post("/{notif_id}/read")
async def mark_one_read(
    notif_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    NotificationService(Repository()).mark_read(user.id, notif_id=notif_id)
    return {"ok": True}


@router.delete("/{notif_id}")
async def dismiss_notification(
    notif_id: str, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    NotificationService(Repository()).dismiss(user.id, notif_id)
    return {"ok": True}


@router.delete("")
async def clear_notifications(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    NotificationService(Repository()).clear_all(user.id)
    return {"ok": True}
