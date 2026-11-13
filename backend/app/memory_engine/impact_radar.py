"""Impact Radar: detects downstream tasks, deadlines, and commitments affected when plans shift."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.database.repository import Repository


def analyze_downstream_impact(
    repo: Repository,
    *,
    user_id: str,
    trigger_title: str,
    trigger_date: str,
    trigger_memory_id: str = "",
) -> Dict[str, Any]:
    """Identify Confirmed Dependencies vs Possible Impacts across deadlines & commitments."""
    deadlines = repo.list_deadlines(user_id, limit=100)
    commitments = repo.list_commitments(user_id)
    confirmed: List[Dict[str, Any]] = []
    possible: List[Dict[str, Any]] = []

    trigger_tokens = {w.lower() for w in trigger_title.split() if len(w) > 3}
    ref_dt = None
    if trigger_date and len(trigger_date) == 10:
        try:
            ref_dt = datetime.strptime(trigger_date, "%Y-%m-%d")
        except ValueError:
            ref_dt = None

    for dl in deadlines:
        if dl.get("status") == "Completed":
            continue
        if trigger_memory_id and dl.get("memory_id") == trigger_memory_id:
            continue
        dl_tokens = {w.lower() for w in dl.get("title", "").split() if len(w) > 3}
        overlap = trigger_tokens & dl_tokens
        if overlap:
            confirmed.append(
                {
                    "targetType": "deadline",
                    "targetId": dl["id"],
                    "targetTitle": dl["title"],
                    "dueDate": dl.get("due_date") or "Unconfirmed",
                    "certainty": "Confirmed Dependency",
                    "reason": f"Shares topic ({', '.join(sorted(overlap)[:3])}) with {trigger_title}.",
                }
            )
        elif ref_dt and dl.get("due_date") and len(dl["due_date"]) == 10:
            try:
                dl_dt = datetime.strptime(dl["due_date"], "%Y-%m-%d")
                diff = abs((dl_dt - ref_dt).days)
                if diff <= 3:
                    possible.append(
                        {
                            "targetType": "deadline",
                            "targetId": dl["id"],
                            "targetTitle": dl["title"],
                            "dueDate": dl["due_date"],
                            "certainty": "Possible Impact",
                            "reason": f"Scheduled within {diff} day(s) of {trigger_date}; verify schedule capacity.",
                        }
                    )
            except ValueError:
                pass

    for cmt in commitments:
        if cmt.get("status") == "Completed":
            continue
        cmt_tokens = {w.lower() for w in f"{cmt.get('title', '')} {cmt.get('statement', '')}".split() if len(w) > 3}
        overlap = trigger_tokens & cmt_tokens
        if overlap:
            confirmed.append(
                {
                    "targetType": "commitment",
                    "targetId": cmt["id"],
                    "targetTitle": cmt["title"],
                    "dueDate": cmt.get("due_date") or "",
                    "certainty": "Confirmed Dependency",
                    "reason": f"Commitment by {cmt.get('owner', 'participant')} overlaps on {', '.join(sorted(overlap)[:3])}.",
                }
            )

    return {
        "triggerTitle": trigger_title,
        "triggerDate": trigger_date,
        "confirmedDependencies": confirmed,
        "possibleImpacts": possible,
    }
