"""Proactive Notification management service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.database.repository import Repository


class NotificationService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    def list_notifications(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return self.repo.list_notifications(user_id, limit=limit)

    def create_alert(
        self,
        user_id: str,
        *,
        title: str,
        message: str,
        category: str = "Important",
        source_ref: str = "",
        action_route: str = "/dashboard",
        memory_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.create_notification(
            user_id,
            {
                "title": title,
                "message": message,
                "category": category,
                "source_ref": source_ref,
                "action_route": action_route,
                "memory_id": memory_id,
            },
        )

    def mark_read(self, user_id: str, notif_id: Optional[str] = None) -> None:
        self.repo.mark_notification_read(user_id, notif_id=notif_id)

    def dismiss(self, user_id: str, notif_id: str) -> None:
        self.repo.delete_notification(user_id, notif_id=notif_id)

    def clear_all(self, user_id: str) -> None:
        self.repo.delete_notification(user_id, notif_id=None)
