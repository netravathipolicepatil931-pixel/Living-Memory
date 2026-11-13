"""MEMORY DNA: Append-only memory versioning — never silently overwrite evolving deadlines or plans."""

from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple

from app.database.repository import Repository, utcnow_iso


def _normalize_title_tokens(title: str) -> set[str]:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", (title or "").lower())
    stop = {"the", "a", "an", "for", "of", "to", "in", "on", "with", "update", "notice", "email"}
    return {w for w in cleaned.split() if len(w) > 2 and w not in stop}


def find_matching_existing_memory(
    repo: Repository, user_id: str, title: str, category: str
) -> Optional[Dict[str, Any]]:
    new_tokens = _normalize_title_tokens(title)
    if len(new_tokens) < 2:
        return None
    existing = repo.list_memories(user_id, limit=150)
    best: Optional[Dict[str, Any]] = None
    best_overlap = 0.0
    for mem in existing:
        if mem.get("verification_status") == "Archived":
            continue
        if category and mem.get("category") not in (category, "Deadlines", "Events"):
            continue
        old_tokens = _normalize_title_tokens(mem.get("title", ""))
        if not old_tokens:
            continue
        jaccard = len(new_tokens & old_tokens) / max(1, len(new_tokens | old_tokens))
        if jaccard >= 0.58 and jaccard > best_overlap:
            best_overlap = jaccard
            best = mem
    return best


def upsert_memory_with_dna(
    repo: Repository,
    *,
    user_id: str,
    title: str,
    summary: str,
    category: str,
    event_time: str,
    source_id: Optional[str],
    source_name: str,
    source_type: str,
    confidence: str,
    importance_score: int,
    importance_category: str,
    urgency: str,
    importance_reason: str,
    action_required: str,
    supporting_evidence: str,
    author: str,
    page_or_timestamp_ref: str = "",
    external_ref: str = "",
    needs_confirmation: bool = False,
    embedding: Optional[list[float]] = None,
) -> Tuple[Dict[str, Any], bool]:
    """
    Create a new Memory or append a new Memory DNA version if a matching active memory evolves.
    Returns (memory_record, version_evolved_bool).
    """
    now_str = utcnow_iso()[:16].replace("T", " ")
    matched = find_matching_existing_memory(repo, user_id, title, category)

    if matched and matched.get("current_information", "").strip() != summary.strip():
        next_ver = len(matched.get("versions", [])) + 1
        repo.add_memory_version(
            user_id,
            matched["id"],
            {
                "version_number": next_ver,
                "summary": f"Updated via {source_name}",
                "value_text": summary,
                "event_time": event_time,
                "recorded_time": now_str,
                "source_name": source_name,
                "changed_by": "LIVING MEMORY AI",
                "reason": importance_reason or "New evidence updated prior memory state",
                "status": "Active",
            },
        )
        repo.add_evidence(
            user_id,
            matched["id"],
            {
                "source_id": source_id,
                "source_name": source_name,
                "source_type": source_type,
                "external_ref": external_ref,
                "excerpt": supporting_evidence or summary,
                "event_time": event_time,
                "recorded_time": now_str,
                "author": author or source_name,
                "page_or_timestamp_ref": page_or_timestamp_ref,
            },
        )
        updated = repo.update_memory_record(
            user_id,
            matched["id"],
            {
                "current_information": summary,
                "event_time": event_time or matched.get("event_time", ""),
                "recorded_time": now_str,
                "importance_score": max(int(matched.get("importance_score", 50)), importance_score),
                "importance_category": importance_category,
                "urgency": urgency,
                "importance_reason": importance_reason,
                "verification_status": "Needs Review" if needs_confirmation else "Verified",
            },
        )
        return (updated or matched), True

    mem = repo.create_memory(
        user_id,
        {
            "source_id": source_id,
            "title": title,
            "description": summary,
            "current_information": summary,
            "category": category,
            "workspace": "all",
            "event_time": event_time or now_str[:10],
            "recorded_time": now_str,
            "source_name": source_name,
            "source_type": source_type,
            "confidence": confidence,
            "verification_status": "Needs Review" if needs_confirmation else "Verified",
            "importance_score": importance_score,
            "importance_category": importance_category,
            "urgency": urgency,
            "importance_reason": importance_reason,
            "action_required": action_required or "",
            "page_or_timestamp_ref": page_or_timestamp_ref,
            "data_origin": "Live",
        },
        embedding=embedding,
    )
    repo.add_memory_version(
        user_id,
        mem["id"],
        {
            "version_number": 1,
            "summary": f"Initial capture from {source_type}",
            "value_text": summary,
            "event_time": event_time or now_str[:10],
            "recorded_time": now_str,
            "source_name": source_name,
            "changed_by": "LIVING MEMORY AI",
            "reason": importance_reason or "Initial extraction",
            "status": "Active",
        },
    )
    repo.add_evidence(
        user_id,
        mem["id"],
        {
            "source_id": source_id,
            "source_name": source_name,
            "source_type": source_type,
            "external_ref": external_ref,
            "excerpt": supporting_evidence or summary,
            "event_time": event_time or now_str[:10],
            "recorded_time": now_str,
            "author": author or source_name,
            "page_or_timestamp_ref": page_or_timestamp_ref,
        },
    )
    return mem, False
