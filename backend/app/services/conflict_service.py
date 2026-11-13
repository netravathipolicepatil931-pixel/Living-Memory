"""Conflict detection and resolution service across emails, chats, calendar, and documents."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from app.database.repository import Repository, utcnow_iso
from app.services.notification_service import NotificationService


def _topic_tokens(text: str) -> set[str]:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    stop = {"the", "for", "and", "with", "due", "deadline", "meeting", "submission", "update"}
    return {w for w in cleaned.split() if len(w) > 2 and w not in stop}


class ConflictService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo
        self.notifications = NotificationService(repo)

    def list_conflicts(self, user_id: str) -> List[Dict[str, Any]]:
        return self.repo.list_conflicts(user_id)

    def detect_deadline_conflict(
        self,
        user_id: str,
        *,
        title: str,
        due_date: str,
        source_name: str,
        source_type: str,
        excerpt: str,
        memory_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Detect when a new extracted deadline shares a topic with an existing deadline on a different date."""
        if not due_date:
            return None
        new_tokens = _topic_tokens(title)
        if len(new_tokens) < 2:
            return None

        existing_deadlines = self.repo.list_deadlines(user_id, limit=100)
        existing_conflicts = self.repo.list_conflicts(user_id)
        now_date = utcnow_iso()[:10]

        for dl in existing_deadlines:
            old_date = (dl.get("due_date") or "").strip()
            if not old_date or old_date == due_date:
                continue
            old_tokens = _topic_tokens(dl.get("title", ""))
            overlap = new_tokens & old_tokens
            if len(overlap) / max(1, len(new_tokens | old_tokens)) < 0.45:
                continue

            # Avoid duplicate unresolved conflict on same title/date pair
            already = any(
                c.get("status") == "Unresolved" and title.lower() in (c.get("title") or "").lower()
                for c in existing_conflicts
            )
            if already:
                continue

            conflict = self.repo.create_conflict(
                user_id,
                {
                    "memory_id": memory_id or dl.get("memory_id"),
                    "title": f"Date conflict: {title}",
                    "conflict_type": "Schedule & Deadline Conflict",
                    "severity": "High",
                    "status": "Unresolved",
                    "claims_json": [
                        {
                            "sourceName": dl.get("source_name") or "Previous Source",
                            "sourceType": dl.get("source_type") or "Text File",
                            "value": old_date,
                            "timestamp": dl.get("created_at", now_date)[:10],
                            "excerpt": dl.get("supporting_evidence") or dl.get("title"),
                        },
                        {
                            "sourceName": source_name,
                            "sourceType": source_type,
                            "value": due_date,
                            "timestamp": now_date,
                            "excerpt": excerpt or title,
                        },
                    ],
                    "suggested_resolution": (
                        f"{source_name} ({due_date}) differs from {dl.get('source_name', 'earlier record')} ({old_date}). "
                        "Confirm which date is authoritative."
                    ),
                },
            )
            self.notifications.create_alert(
                user_id,
                title=f"Conflict detected: {title}",
                message=f"{source_name} lists {due_date}, conflicting with {old_date} in {dl.get('source_name', 'existing schedule')}.",
                category="Conflict",
                source_ref=source_name,
                action_route="/insights",
                memory_id=memory_id,
            )
            return conflict
        return None

    def resolve_conflict(
        self, user_id: str, conflict_id: str, status: str, chosen_value: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        updated = self.repo.resolve_conflict(user_id, conflict_id, status)
        if not updated:
            return None
        if status == "Confirmed Latest" and chosen_value and updated.get("memory_id"):
            mem_id = updated["memory_id"]
            mem = self.repo.get_memory(user_id, mem_id)
            if mem:
                next_ver = len(mem.get("versions", [])) + 1
                now_str = utcnow_iso()[:16].replace("T", " ")
                self.repo.add_memory_version(
                    user_id,
                    mem_id,
                    {
                        "version_number": next_ver,
                        "summary": "User resolved cross-source conflict",
                        "value_text": f"Confirmed current value: {chosen_value}",
                        "event_time": chosen_value if len(chosen_value) == 10 else mem.get("event_time", ""),
                        "recorded_time": now_str,
                        "source_name": "User Verification",
                        "changed_by": "User",
                        "reason": "Conflict resolution inside Insights",
                        "status": "Active",
                    },
                )
                self.repo.update_memory_record(
                    user_id,
                    mem_id,
                    {
                        "verification_status": "Verified",
                        "current_information": f"Confirmed current value: {chosen_value}. Prior values preserved in version history.",
                    },
                )
        return updated
