"""Core Memory Service: Memory DNA, Semantic Search, Forgotten Context, Cross-Source Linking, & Ask AI RAG."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.database.repository import Repository, utcnow_iso
from app.integrations.gemini.client import ask_living_memory, embed_text
from app.memory_engine.cross_source import link_cross_source_memories
from app.memory_engine.entity_resolution import resolve_and_link_entities
from app.memory_engine.evidence import get_memory_evidence_chain
from app.memory_engine.impact_radar import analyze_downstream_impact
from app.memory_engine.memory_dna import upsert_memory_with_dna
from app.schemas.ai import score_to_importance_category
from app.services.conflict_service import ConflictService
from app.services.notification_service import NotificationService

logger = logging.getLogger("living_memory.memory_service")


class MemoryService:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo
        self.settings = get_settings()
        self.conflicts = ConflictService(repo)
        self.notifications = NotificationService(repo)

    def list_memories(self, user_id: str, category: Optional[str] = None, limit: int = 120) -> List[Dict[str, Any]]:
        return self.repo.list_memories(user_id, category=category, limit=limit)

    def get_memory_detail(self, user_id: str, memory_id: str) -> Optional[Dict[str, Any]]:
        mem = self.repo.get_memory(user_id, memory_id)
        if not mem:
            return None
        mem["evidenceChain"] = get_memory_evidence_chain(self.repo, user_id, memory_id)
        mem["impactRadar"] = analyze_downstream_impact(
            self.repo,
            user_id=user_id,
            trigger_title=mem.get("title", ""),
            trigger_date=mem.get("event_time", ""),
            trigger_memory_id=memory_id,
        )
        return mem

    async def persist_extracted_item(
        self,
        user_id: str,
        *,
        item: Dict[str, Any],
        source_id: Optional[str],
        source_name: str,
        source_type: str,
        user_timezone: str = "UTC",
        external_ref: str = "",
    ) -> Dict[str, Any]:
        """Persist a single extracted intelligence item into Memory DNA + Entities + Deadlines + Commitments + Decisions."""
        title = item.get("title") or "Captured Context"
        summary = item.get("summary") or title
        category = item.get("memoryCategory") or "Important conversations"
        score = int(item.get("importanceScore") or 60)
        imp_cat = item.get("importanceCategory") or score_to_importance_category(score)
        urgency = item.get("urgency") or "Medium"
        imp_reason = item.get("importanceReason") or "Extracted based on actionability and impact."
        action_req = item.get("actionRequired") or ""
        confidence = item.get("confidence") or "Medium"
        supporting = item.get("supportingEvidence") or summary
        people = item.get("peopleInvolved") or []
        projects = item.get("projectsInvolved") or []
        page_ref = item.get("pageOrTimestampRef") or ""
        dl = item.get("deadline") or None
        event_time = (dl.get("exactDate") if dl else None) or utcnow_iso()[:10]
        needs_confirm = bool(dl and (dl.get("needsConfirmation") or not dl.get("exactDate")))

        embedding: List[float] = []
        if self.settings.gemini_configured:
            embedding = await embed_text(f"{title}\n{summary}\n{supporting}")

        mem, evolved = upsert_memory_with_dna(
            self.repo,
            user_id=user_id,
            title=title,
            summary=summary,
            category=category,
            event_time=event_time,
            source_id=source_id,
            source_name=source_name,
            source_type=source_type,
            confidence=confidence,
            importance_score=score,
            importance_category=imp_cat,
            urgency=urgency,
            importance_reason=imp_reason,
            action_required=action_req,
            supporting_evidence=supporting,
            author=people[0] if people else source_name,
            page_or_timestamp_ref=page_ref,
            external_ref=external_ref,
            needs_confirmation=needs_confirm,
            embedding=embedding,
        )

        # Entities & Relationships
        resolve_and_link_entities(
            self.repo,
            user_id=user_id,
            memory_id=mem["id"],
            people=people,
            projects=projects,
            source_name=source_name,
        )

        # Cross-source intelligence linking
        link_cross_source_memories(
            self.repo,
            user_id=user_id,
            memory=mem,
        )

        # Deadline extraction + conflict scan
        created_deadline = None
        if dl:
            dl_date = dl.get("exactDate") or ""
            created_deadline = self.repo.create_deadline(
                user_id,
                {
                    "memory_id": mem["id"],
                    "source_id": source_id,
                    "title": dl.get("title") or title,
                    "due_date": dl_date or None,
                    "due_time": dl.get("time") or "23:59",
                    "timezone": user_timezone,
                    "source_name": source_name,
                    "source_type": source_type,
                    "origin_kind": "AI-Extracted",
                    "importance_score": score,
                    "importance_category": imp_cat,
                    "urgency": urgency,
                    "status": "Needs Confirmation" if needs_confirm else "Pending",
                    "supporting_evidence": supporting,
                    "confidence": confidence,
                    "is_explicit": bool(dl.get("isExplicit", True)),
                    "needs_confirmation": needs_confirm,
                    "confirmation_prompt": dl.get("confirmationPrompt") or "",
                    "related_task": dl.get("relatedTask") or action_req,
                    "data_origin": "Live",
                },
            )
            if dl_date:
                self.conflicts.detect_deadline_conflict(
                    user_id,
                    title=dl.get("title") or title,
                    due_date=dl_date,
                    source_name=source_name,
                    source_type=source_type,
                    excerpt=supporting,
                    memory_id=mem["id"],
                )

        # Commitments & Decisions tables
        if item.get("commitmentOwner") or category == "Commitments":
            self.repo.create_commitment(
                user_id,
                {
                    "memory_id": mem["id"],
                    "title": title,
                    "owner": item.get("commitmentOwner") or (people[0] if people else "Owner"),
                    "due_date": event_time,
                    "statement": supporting or summary,
                    "status": "Pending",
                    "source_name": source_name,
                },
            )

        if item.get("decisionChoice") or category == "Decisions":
            self.repo.create_decision(
                user_id,
                {
                    "memory_id": mem["id"],
                    "title": title,
                    "decision_date": utcnow_iso()[:10],
                    "final_choice": item.get("decisionChoice") or summary,
                    "reasoning": imp_reason,
                    "source_name": source_name,
                },
            )

        # Proactive notification for critical/high/evolving items
        if score >= 75 or needs_confirm or evolved:
            notif_title = (
                f"Confirm date: {title}"
                if needs_confirm
                else (f"Plan updated: {title}" if evolved else f"{imp_cat}: {title}")
            )
            self.notifications.create_alert(
                user_id,
                title=notif_title,
                message=summary,
                category="Urgent" if score >= 90 else ("Schedule Change" if evolved else "Important"),
                source_ref=source_name,
                action_route="/deadlines" if dl else "/information",
                memory_id=mem["id"],
            )

        return {"memory": mem, "deadline": created_deadline, "versionEvolved": evolved}

    def update_memory_with_version(
        self,
        user_id: str,
        memory_id: str,
        *,
        verification_status: Optional[str] = None,
        current_information: Optional[str] = None,
        reason: Optional[str] = None,
        note: Optional[str] = None,
        importance_score: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        mem = self.repo.get_memory(user_id, memory_id)
        if not mem:
            return None
        patch: Dict[str, Any] = {}
        now_str = utcnow_iso()[:16].replace("T", " ")

        if verification_status:
            patch["verification_status"] = verification_status

        if current_information and current_information.strip() != mem.get("current_information", "").strip():
            next_ver = len(mem.get("versions", [])) + 1
            self.repo.add_memory_version(
                user_id,
                memory_id,
                {
                    "version_number": next_ver,
                    "summary": "User corrected interpretation",
                    "value_text": current_information.strip(),
                    "event_time": mem.get("event_time", now_str[:10]),
                    "recorded_time": now_str,
                    "source_name": "User Correction",
                    "changed_by": "User",
                    "reason": reason or "Manual verification / correction",
                    "status": "Active",
                },
            )
            patch["current_information"] = current_information.strip()
            patch["verification_status"] = verification_status or "Verified"

        if note and note.strip():
            notes = list(mem.get("user_notes") or [])
            notes.append(note.strip())
            patch["user_notes"] = notes

        if importance_score is not None:
            patch["importance_score"] = importance_score
            patch["importance_category"] = score_to_importance_category(importance_score)

        if not patch:
            return mem
        return self.repo.update_memory_record(user_id, memory_id, patch)

    def delete_memory(self, user_id: str, memory_id: str) -> bool:
        return self.repo.delete_memory(user_id, memory_id)

    def get_forgotten_memories(self, user_id: str, stale_days: int = 14) -> List[Dict[str, Any]]:
        memories = self.repo.list_memories(user_id, limit=150)
        now = datetime.now(timezone.utc)
        forgotten = []
        for mem in memories:
            if mem.get("verification_status") == "Archived":
                continue
            updated = mem.get("updated_at") or mem.get("created_at") or ""
            days_idle = 0
            try:
                dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                days_idle = (now - dt).days
            except Exception:
                days_idle = 0
            if days_idle >= stale_days or mem.get("verification_status") == "Needs Review":
                forgotten.append(
                    {
                        **mem,
                        "daysUnvisited": days_idle,
                        "whyRelevant": f"Unvisited for {days_idle}d · Category: {mem.get('category')}",
                    }
                )
        return forgotten[:25]

    async def ask_ai(
        self,
        user_id: str,
        *,
        question: str,
        context_snapshot: Optional[Dict[str, Any]] = None,
        use_semantic_search: bool = True,
        preferred_language: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.settings.gemini_configured:
            raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

        # Gather semantic memories from DB
        db_memories: List[Dict[str, Any]] = []
        if use_semantic_search:
            q_emb = await embed_text(question)
            db_memories = self.repo.semantic_search_memories(user_id, q_emb, top_k=10)
        if not db_memories:
            db_memories = self.repo.list_memories(user_id, limit=15)

        context_items: List[Dict[str, Any]] = []
        for m in db_memories:
            context_items.append(
                {
                    "type": "memory",
                    "id": m["id"],
                    "title": m.get("title"),
                    "category": m.get("category"),
                    "currentInformation": m.get("current_information"),
                    "sourceName": m.get("source_name"),
                    "sourceType": m.get("source_type"),
                    "eventTime": m.get("event_time"),
                    "importanceScore": m.get("importance_score"),
                }
            )

        for em in self.repo.list_emails(user_id, limit=12):
            context_items.append(
                {
                    "type": "email",
                    "id": em["id"],
                    "from": f"{em.get('sender_name')} <{em.get('sender_email')}>",
                    "subject": em.get("subject"),
                    "date": em.get("received_at"),
                    "summary": em.get("short_summary") or em.get("snippet"),
                    "importanceScore": em.get("importance_score"),
                }
            )

        for dl in self.repo.list_deadlines(user_id, limit=15):
            context_items.append(
                {
                    "type": "deadline",
                    "title": dl.get("title"),
                    "date": dl.get("due_date"),
                    "status": dl.get("status"),
                    "source": dl.get("source_name"),
                }
            )

        if context_snapshot:
            for item in (context_snapshot.get("memories") or [])[:20]:
                context_items.append({"type": "workspace_memory", **item})
            for item in (context_snapshot.get("emails") or [])[:12]:
                context_items.append({"type": "workspace_email", **item})
            for item in (context_snapshot.get("deadlines") or [])[:12]:
                context_items.append({"type": "workspace_deadline", **item})
            for item in (context_snapshot.get("conflicts") or [])[:6]:
                context_items.append({"type": "workspace_conflict", **item})

        result = await ask_living_memory(
            question=question,
            context_items=context_items,
            preferred_language=preferred_language,
        )
        return result.model_dump()
