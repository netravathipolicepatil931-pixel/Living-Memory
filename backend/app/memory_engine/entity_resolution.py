"""Entity resolution across emails, chats, media, and documents."""

from __future__ import annotations

from typing import Dict, List

from app.database.repository import Repository


def resolve_and_link_entities(
    repo: Repository,
    *,
    user_id: str,
    memory_id: str,
    people: List[str],
    projects: List[str],
    source_name: str,
) -> List[Dict[str, str]]:
    resolved: List[Dict[str, str]] = []
    seen = set()

    for person in people:
        clean = (person or "").strip()
        if not clean or clean.lower() in seen:
            continue
        seen.add(clean.lower())
        ent = repo.upsert_entity(user_id, "person", clean)
        resolved.append(ent)
        repo.add_relationship(
            user_id,
            {
                "from_entity_id": ent.get("id"),
                "from_memory_id": memory_id,
                "relation_type": "involved_in",
                "confidence": 0.9,
                "evidence_summary": f"Mentioned in {source_name}",
            },
        )

    for proj in projects:
        clean = (proj or "").strip()
        if not clean or clean.lower() in seen:
            continue
        seen.add(clean.lower())
        ent = repo.upsert_entity(user_id, "project", clean)
        resolved.append(ent)
        repo.add_relationship(
            user_id,
            {
                "from_entity_id": ent.get("id"),
                "from_memory_id": memory_id,
                "relation_type": "belongs_to_project",
                "confidence": 0.9,
                "evidence_summary": f"Project link from {source_name}",
            },
        )
    return resolved
