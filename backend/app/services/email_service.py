"""Gmail synchronization, incremental history sync, AI importance scoring, and user feedback."""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from app.core.config import get_settings
from app.database.repository import Repository, utcnow_iso
from app.integrations.gemini.client import analyze_email
from app.integrations.gmail.client import (
    HistoryExpiredError,
    fetch_gmail_message_detail,
    fetch_gmail_profile,
    list_gmail_history_added_ids,
    list_gmail_message_ids_paginated,
)
from app.integrations.gmail.oauth import get_valid_gmail_access_token
from app.schemas.ai import score_to_importance_category
from app.services.memory_service import MemoryService

logger = logging.getLogger("living_memory.email_service")


class EmailService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo
        self.settings = get_settings()
        self.memory_service = MemoryService(repo)

    async def sync_gmail_account(
        self,
        user_id: str,
        *,
        max_messages: int = 20,
        after_date: Optional[str] = None,
        before_date: Optional[str] = None,
        user_timezone: str = "UTC",
        user_priorities: Optional[List[str]] = None,
        correction_hints: Optional[List[str]] = None,
        force_full_sync: bool = False,
        progress_cb: Optional[Callable[[str, int, str], None]] = None,
    ) -> Dict[str, Any]:
        if progress_cb:
            progress_cb("Processing", 20, "Verifying Gmail OAuth token...")

        access_token = await get_valid_gmail_access_token(user_id, self.repo)
        profile = await fetch_gmail_profile(access_token)
        email_address = profile.get("emailAddress") or ""
        profile_history_id = str(profile.get("historyId") or "")

        sync_state = self.repo.get_sync_state(user_id, "gmail")
        stored_history_id = (sync_state.get("history_id") or "").strip()
        prefs = self.repo.get_preferences(user_id)
        merged_hints = list(prefs.get("importance_correction_hints") or []) + list(correction_hints or [])
        priorities = user_priorities or ["Deadlines", "Decisions", "Commitments"]

        self.repo.upsert_sync_state(
            user_id,
            "gmail",
            stored_history_id or profile_history_id,
            "syncing",
            int(sync_state.get("messages_synced") or 0),
        )

        if progress_cb:
            progress_cb("Processing", 35, "Fetching Gmail message list (read-only)...")

        sync_mode = "full"
        candidate_ids: List[str] = []
        latest_history_id = profile_history_id

        if stored_history_id and not force_full_sync and not after_date and not before_date:
            try:
                hist = await list_gmail_history_added_ids(access_token, stored_history_id)
                candidate_ids = hist["messageIds"][:max_messages]
                latest_history_id = hist.get("historyId") or profile_history_id
                sync_mode = "incremental"
            except HistoryExpiredError:
                candidate_ids = []
                sync_mode = "full"

        if sync_mode == "full":
            candidate_ids = await list_gmail_message_ids_paginated(
                access_token,
                max_messages=max_messages,
                after_date=after_date,
                before_date=before_date,
            )

        existing_ids = set(self.repo.list_existing_gmail_ids(user_id))
        new_ids = [mid for mid in candidate_ids if mid not in existing_ids]
        skipped_duplicates = len(candidate_ids) - len(new_ids)

        source_row = self.repo.create_source(
            user_id,
            {
                "name": f"Gmail ({email_address or 'Connected'})",
                "source_type": "Gmail",
                "external_ref": email_address,
                "processing_status": "Processing",
                "record_count": len(new_ids),
                "authority_basis": f"Official Gmail API read-only {sync_mode} sync.",
                "verification_state": "Direct Source",
                "data_origin": "Live",
            },
        )

        synced_emails: List[Dict[str, Any]] = []
        extracted_count = 0
        needs_attention = False
        total = max(1, len(new_ids))

        for idx, msg_id in enumerate(new_ids):
            if progress_cb:
                pct = 40 + int(((idx + 1) / total) * 50)
                progress_cb("Processing", pct, f"Analyzing email {idx + 1} of {len(new_ids)}...")

            detail = await fetch_gmail_message_detail(access_token, msg_id)
            if detail.get("history_id"):
                latest_history_id = detail["history_id"]

            analysis_data: Dict[str, Any] = {
                "importanceScore": 55,
                "importanceCategory": "Medium",
                "urgency": "Low",
                "importanceReason": "Synced via Gmail API (Gemini API key unconfigured for semantic scoring).",
                "shortSummary": detail.get("snippet") or detail.get("subject"),
                "actionRequired": "Review email",
                "requiresReply": False,
                "emailCategory": "Important emails",
                "extractedItems": [],
            }

            if self.settings.gemini_configured:
                try:
                    analyzed = await analyze_email(
                        subject=detail["subject"],
                        sender=f"{detail['sender_name']} <{detail['sender_email']}>",
                        recipients=detail["recipients"],
                        received_at=detail["received_at"],
                        labels=detail["labels"],
                        body=detail["body_text"],
                        user_timezone=user_timezone,
                        user_priorities=priorities,
                        correction_hints=merged_hints,
                    )
                    analysis_data = analyzed.model_dump()
                except Exception as exc:
                    logger.warning("Gemini analysis failed on email %s: %s", msg_id, exc)
                    analysis_data["importanceReason"] = f"Fallback score (Gemini error: {exc})"

            extracted_items = analysis_data.get("extractedItems") or []
            detected_deadline = next(
                (it["deadline"]["exactDate"] for it in extracted_items if it.get("deadline") and it["deadline"].get("exactDate")),
                None,
            )

            stored_email = self.repo.upsert_email(
                user_id,
                {
                    "source_id": source_row["id"],
                    "gmail_message_id": detail["gmail_message_id"],
                    "thread_id": detail["thread_id"],
                    "sender_name": detail["sender_name"],
                    "sender_email": detail["sender_email"],
                    "recipients": detail["recipients"],
                    "subject": detail["subject"],
                    "snippet": detail["snippet"],
                    "short_summary": analysis_data["shortSummary"],
                    "body_text": detail["body_text"],
                    "labels": detail["labels"],
                    "attachments_metadata": detail["attachments_metadata"],
                    "gmail_url": detail["gmail_url"],
                    "received_at": detail["received_at"],
                    "importance_score": analysis_data["importanceScore"],
                    "importance_category": analysis_data["importanceCategory"],
                    "urgency": analysis_data["urgency"],
                    "importance_reason": analysis_data["importanceReason"],
                    "action_required": analysis_data["actionRequired"],
                    "requires_reply": analysis_data["requiresReply"],
                    "detected_deadline": detected_deadline,
                    "data_origin": "Live",
                },
            )

            for item in extracted_items:
                res = await self.memory_service.persist_extracted_item(
                    user_id,
                    item=item,
                    source_id=source_row["id"],
                    source_name=f"Gmail · {detail['subject']}",
                    source_type="Gmail",
                    user_timezone=user_timezone,
                    external_ref=detail["gmail_url"],
                )
                extracted_count += 1
                if res.get("deadline") and res["deadline"].get("needs_confirmation"):
                    needs_attention = True

            synced_emails.append(
                {
                    "id": stored_email["id"],
                    "gmailMessageId": detail["gmail_message_id"],
                    "threadId": detail["thread_id"],
                    "from": detail["sender_name"],
                    "fromEmail": detail["sender_email"],
                    "recipients": detail["recipients"],
                    "subject": detail["subject"],
                    "preview": analysis_data["shortSummary"] or detail["snippet"],
                    "body": detail["body_text"],
                    "date": detail["received_at"][:10],
                    "labels": detail["labels"],
                    "attachmentsMetadata": detail["attachments_metadata"],
                    "gmailUrl": detail["gmail_url"],
                    "importanceScore": analysis_data["importanceScore"],
                    "importanceCategory": analysis_data["importanceCategory"],
                    "urgency": analysis_data["urgency"],
                    "importanceReason": analysis_data["importanceReason"],
                    "shortSummary": analysis_data["shortSummary"],
                    "actionRequired": analysis_data["actionRequired"],
                    "requiresReply": analysis_data["requiresReply"],
                    "emailCategory": analysis_data["emailCategory"],
                    "detectedDeadline": detected_deadline,
                    "extractedItems": extracted_items,
                }
            )

        total_synced = int(sync_state.get("messages_synced") or 0) + len(synced_emails)
        self.repo.upsert_sync_state(
            user_id,
            "gmail",
            latest_history_id or profile_history_id,
            "idle",
            total_synced,
        )
        self.repo.update_source(
            user_id,
            source_row["id"],
            {
                "processing_status": "Needs attention" if needs_attention else "Completed",
                "record_count": len(synced_emails),
                "extracted_memories_count": extracted_count,
                "ai_summary": f"Synced {len(synced_emails)} new emails ({skipped_duplicates} duplicates skipped).",
            },
        )

        return {
            "emailAddress": email_address,
            "syncMode": sync_mode,
            "historyId": latest_history_id,
            "skippedDuplicates": skipped_duplicates,
            "emails": synced_emails,
            "job_status": "Needs attention" if needs_attention else "Completed",
            "job_message": f"Synced {len(synced_emails)} emails ({extracted_count} memories extracted).",
        }

    def list_emails(self, user_id: str, min_importance: int = 0) -> List[Dict[str, Any]]:
        return self.repo.list_emails(user_id, min_importance=min_importance)

    def get_email(self, user_id: str, email_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get_email(user_id, email_id)

    def correct_email_importance(
        self, user_id: str, email_id: str, score: int, reason: str
    ) -> Optional[Dict[str, Any]]:
        clamped = max(0, min(100, int(score)))
        cat = score_to_importance_category(clamped)
        updated = self.repo.update_email_importance(user_id, email_id, clamped, cat, reason)
        if not updated:
            return None
        prefs = self.repo.get_preferences(user_id)
        hints = list(prefs.get("importance_correction_hints") or [])
        hints.append(
            f"For emails like '{updated.get('subject')}' from {updated.get('sender_name')}: "
            f"score {clamped}/100 ({cat}) because: {reason}"
        )
        self.repo.update_preferences(user_id, {"importance_correction_hints": hints[-12:]})
        return updated
