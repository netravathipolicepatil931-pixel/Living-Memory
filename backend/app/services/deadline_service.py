"""Unified Deadline & Reminder Service with Impact Radar integration."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.database.repository import Repository, utcnow_iso
from app.memory_engine.impact_radar import analyze_downstream_impact
from app.schemas.ai import score_to_importance_category


class DeadlineService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    def list_deadlines(self, user_id: str) -> List[Dict[str, Any]]:
        return self.repo.list_deadlines(user_id, limit=150)

    def create_user_reminder(
        self,
        user_id: str,
        *,
        title: str,
        due_date: str,
        due_time: str = "09:00",
        timezone_name: str = "UTC",
        supporting_evidence: str = "",
        related_task: str = "",
    ) -> Dict[str, Any]:
        return self.repo.create_deadline(
            user_id,
            {
                "title": title.strip(),
                "due_date": due_date,
                "due_time": due_time or "09:00",
                "timezone": timezone_name or "UTC",
                "source_name": "Personal Reminder",
                "source_type": "Text File",
                "origin_kind": "User Reminder",
                "importance_score": 75,
                "importance_category": score_to_importance_category(75),
                "urgency": "Medium",
                "status": "Pending",
                "supporting_evidence": supporting_evidence.strip() or "User-created reminder inside Living Memory.",
                "confidence": "High",
                "is_explicit": True,
                "needs_confirmation": False,
                "related_task": related_task,
                "data_origin": "Live",
            },
        )

    def confirm_deadline(
        self,
        user_id: str,
        deadline_id: str,
        confirmed_date: str,
        confirmed_time: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        dl = self.repo.get_deadline(user_id, deadline_id)
        if not dl:
            return None
        history = list(dl.get("history_json") or [])
        history.append(
            {
                "date": confirmed_date,
                "source": "User Confirmation",
                "note": f"User confirmed exact date {confirmed_date}",
            }
        )
        patch: Dict[str, Any] = {
            "due_date": confirmed_date,
            "status": "Pending",
            "needs_confirmation": False,
            "is_explicit": True,
            "history_json": history,
        }
        if confirmed_time:
            patch["due_time"] = confirmed_time
        updated = self.repo.update_deadline(user_id, deadline_id, patch)
        impact = analyze_downstream_impact(
            self.repo,
            user_id=user_id,
            trigger_title=dl.get("title", ""),
            trigger_date=confirmed_date,
            trigger_memory_id=dl.get("memory_id") or "",
        )
        if updated:
            updated["impactRadar"] = impact
        return updated

    def toggle_complete(self, user_id: str, deadline_id: str) -> Optional[Dict[str, Any]]:
        dl = self.repo.get_deadline(user_id, deadline_id)
        if not dl:
            return None
        new_status = "Pending" if dl.get("status") == "Completed" else "Completed"
        return self.repo.update_deadline(user_id, deadline_id, {"status": new_status})

    def get_impact_for_deadline(self, user_id: str, deadline_id: str) -> Optional[Dict[str, Any]]:
        dl = self.repo.get_deadline(user_id, deadline_id)
        if not dl:
            return None
        return analyze_downstream_impact(
            self.repo,
            user_id=user_id,
            trigger_title=dl.get("title", ""),
            trigger_date=dl.get("due_date") or utcnow_iso()[:10],
            trigger_memory_id=dl.get("memory_id") or "",
        )
