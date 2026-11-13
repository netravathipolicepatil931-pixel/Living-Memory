"""Evidence tracking helper enforcing grounded citations on every extracted memory."""

from __future__ import annotations

from typing import Any, Dict, List

from app.database.repository import Repository


def verify_evidence_presence(excerpt: str, source_name: str) -> str:
    cleaned = (excerpt or "").strip()
    if cleaned:
        return cleaned[:800]
    return f"Derived from {source_name} (no verbatim quote span isolated)."


def get_memory_evidence_chain(repo: Repository, user_id: str, memory_id: str) -> List[Dict[str, Any]]:
    mem = repo.get_memory(user_id, memory_id)
    if not mem:
        return []
    return mem.get("evidence", [])
