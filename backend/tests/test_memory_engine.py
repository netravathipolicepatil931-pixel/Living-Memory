"""Unit tests for Memory DNA versioning, Cross-Source intelligence, Conflict detection, & Impact Radar."""

from app.core.security import DEFAULT_DEMO_USER_ID
from app.database.repository import Repository
from app.memory_engine.cross_source import link_cross_source_memories
from app.memory_engine.entity_resolution import resolve_and_link_entities
from app.memory_engine.impact_radar import analyze_downstream_impact
from app.memory_engine.memory_dna import upsert_memory_with_dna
from app.services.conflict_service import ConflictService


def test_memory_dna_preserves_history_across_updates():
    repo = Repository()
    uid = DEFAULT_DEMO_USER_ID

    mem1, evolved1 = upsert_memory_with_dna(
        repo,
        user_id=uid,
        title="AI Systems Assignment Submission Deadline",
        summary="Submission due Nov 15 at 23:59.",
        category="Deadlines",
        event_time="2026-11-15",
        source_id=None,
        source_name="Class WhatsApp",
        source_type="WhatsApp Export",
        confidence="Medium",
        importance_score=82,
        importance_category="High",
        urgency="High",
        importance_reason="Initial student chat mention",
        action_required="Prepare submission",
        supporting_evidence="Alex: assignment due Nov 15",
        author="Alex",
    )
    assert evolved1 is False

    mem2, evolved2 = upsert_memory_with_dna(
        repo,
        user_id=uid,
        title="AI Systems Assignment Submission Deadline",
        summary="Official extension: submission due Nov 20 at 23:59.",
        category="Deadlines",
        event_time="2026-11-20",
        source_id=None,
        source_name="Academic Office Gmail",
        source_type="Gmail",
        confidence="High",
        importance_score=96,
        importance_category="Critical",
        urgency="High",
        importance_reason="Authoritative notice from Academic Office",
        action_required="Submit final report by Nov 20",
        supporting_evidence="Deadline extended to Nov 20.",
        author="Academic Office",
    )
    assert evolved2 is True
    assert mem2["id"] == mem1["id"]
    assert len(mem2["versions"]) == 2
    assert mem2["versions"][0]["status"] == "Superseded"
    assert mem2["versions"][1]["status"] == "Active"


def test_entities_cross_source_conflicts_and_impact_radar():
    repo = Repository()
    uid = DEFAULT_DEMO_USER_ID

    m_email, _ = upsert_memory_with_dna(
        repo,
        user_id=uid,
        title="Professor Meera Lab 304 Project Review",
        summary="Midterm project review in Innovation Lab 304 on Nov 18.",
        category="Events",
        event_time="2026-11-18",
        source_id=None,
        source_name="Gmail · Prof Meera",
        source_type="Gmail",
        confidence="High",
        importance_score=90,
        importance_category="Critical",
        urgency="High",
        importance_reason="Mandatory review",
        action_required="Prepare walkthrough",
        supporting_evidence="Meet in Lab 304 Nov 18",
        author="Prof Meera",
    )
    resolve_and_link_entities(
        repo,
        user_id=uid,
        memory_id=m_email["id"],
        people=["Professor Meera"],
        projects=["Living Memory"],
        source_name="Gmail · Prof Meera",
    )
    assert len(repo.list_entities(uid)) >= 2

    m_wa, _ = upsert_memory_with_dna(
        repo,
        user_id=uid,
        title="Lab 304 Project Review Slides Prep",
        summary="Slides needed before Prof Meera Lab 304 review.",
        category="Tasks",
        event_time="2026-11-17",
        source_id=None,
        source_name="AI Project Team WhatsApp",
        source_type="WhatsApp Export",
        confidence="High",
        importance_score=80,
        importance_category="High",
        urgency="Medium",
        importance_reason="Prep dependency",
        action_required="Review slides",
        supporting_evidence="Sarah finishing slides",
        author="Sarah",
    )
    links = link_cross_source_memories(
        repo, user_id=uid, memory=m_wa
    )
    assert len(links) >= 1

    # Conflicting deadline detection + Impact Radar
    repo.create_deadline(
        uid,
        {
            "title": "Project Review Submission",
            "due_date": "2026-11-18",
            "source_name": "Gmail",
            "source_type": "Gmail",
        },
    )
    c_svc = ConflictService(repo)
    conflict = c_svc.detect_deadline_conflict(
        uid,
        title="Project Review Submission",
        due_date="2026-11-21",
        source_name="WhatsApp Chat",
        source_type="WhatsApp Export",
        excerpt="Team wondered if review moved to Nov 21",
        memory_id=m_email["id"],
    )
    assert conflict is not None

    impact = analyze_downstream_impact(
        repo,
        user_id=uid,
        trigger_title="Project Review Schedule Shift",
        trigger_date="2026-11-18",
        trigger_memory_id="",
    )
    assert len(impact["confirmedDependencies"]) >= 1
