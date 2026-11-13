"""Cross-Source Intelligence: links emails, chats, audio, images, and docs referring to the same topic/project."""

from __future__ import annotations

import re
from typing import Any, Dict, List

from app.database.repository import Repository


def _keywords(text: str) -> set[str]:
    stop = {"the", "and", "for", "with", "that", "this", "from", "will", "have", "your", "about", "date", "time"}
    words = re.findall(r"[a-z0-9]{4,}", (text or "").lower())
    return {w for w in words if w not in stop}


def link_cross_source_memories(
    repo: Repository,
    *,
    user_id: str,
    memory: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Find related memories from DIFFERENT sources and create cross-source relationships."""
    new_kw = _keywords(f"{memory.get('title', '')} {memory.get('current_information', '')}")
    if len(new_kw) < 2:
        return []

    created_links: List[Dict[str, Any]] = []
    others = repo.list_memories(user_id, limit=120)
    for other in others:
        if other["id"] == memory["id"]:
            continue
        # Emphasize cross-source linking across different channels or filenames
        if other.get("source_name") == memory.get("source_name"):
            continue
        other_kw = _keywords(f"{other.get('title', '')} {other.get('current_information', '')}")
        shared = new_kw & other_kw
        if len(shared) >= 2:
            confidence = min(0.95, 0.55 + 0.1 * len(shared))
            rel = repo.add_relationship(
                user_id,
                {
                    "from_memory_id": memory["id"],
                    "to_memory_id": other["id"],
                    "relation_type": "cross_source_related",
                    "confidence": round(confidence, 2),
                    "evidence_summary": f"Shared context ({', '.join(sorted(shared)[:4])}) between {memory.get('source_name')} and {other.get('source_name')}",
                },
            )
            created_links.append(rel)
            if len(created_links) >= 5:
                break
    return created_links
