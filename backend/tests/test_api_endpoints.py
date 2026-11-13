"""Integration tests across FastAPI endpoints using TestClient."""

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_and_system_status():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True

    sys_res = client.get("/api/system/status")
    assert sys_res.status_code == 200
    assert "googleRedirectUri" in sys_res.json()


def test_auth_session_and_preferences_flow():
    sess = client.post(
        "/api/auth/session",
        json={"email": "alex.chen@university.edu", "name": "Alex", "mode": "demo"},
    )
    assert sess.status_code == 200
    token = sess.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "alex.chen@university.edu"

    pref = client.patch(
        "/api/auth/preferences",
        headers=headers,
        json={"timezone": "Asia/Kolkata", "digest_time": "09:00"},
    )
    assert pref.status_code == 200
    assert pref.json()["preferences"]["timezone"] == "Asia/Kolkata"


def test_deadlines_crud_confirm_toggle_and_impact():
    created = client.post(
        "/api/deadlines",
        json={
            "title": "Project Demo Prep",
            "date": "2026-11-17",
            "time": "16:00",
            "timezone": "UTC",
            "supportingEvidence": "Check Lab 304 projector",
        },
    )
    assert created.status_code == 200
    dl_id = created.json()["deadline"]["id"]

    confirmed = client.post(
        f"/api/deadlines/{dl_id}/confirm",
        json={"confirmedDate": "2026-11-18", "confirmedTime": "14:00"},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["deadline"]["due_date"] == "2026-11-18"

    toggled = client.post(f"/api/deadlines/{dl_id}/toggle")
    assert toggled.status_code == 200
    assert toggled.json()["deadline"]["status"] == "Completed"

    impact = client.get(f"/api/deadlines/{dl_id}/impact")
    assert impact.status_code == 200
    assert "confirmedDependencies" in impact.json()["impact"]


def test_whatsapp_upload_preview_and_gmail_status():
    txt_bytes = b"12/11/2026, 09:00 - Sarah: Finalize report by Nov 19."
    up = client.post(
        "/api/whatsapp/upload",
        files={"file": ("Project Chat.txt", txt_bytes, "text/plain")},
    )
    assert up.status_code == 200
    preview = up.json()["preview"]
    assert preview["messageCount"] == 1
    assert preview["participants"] == ["Sarah"]

    gm = client.get("/api/integrations/gmail/status")
    assert gm.status_code == 200
    assert "oauthConfigured" in gm.json()


def test_upload_rejects_unsupported_extension():
    res = client.post(
        "/api/uploads",
        files={"file": ("malware.exe", b"binary", "application/octet-stream")},
    )
    assert res.status_code == 400


def test_zero_credentials_upload_graceful_fallback(monkeypatch):
    import asyncio
    from app.core.config import get_settings
    from app.database.repository import Repository
    from app.services.file_service import FileService

    monkeypatch.setenv("GEMINI_API_KEY", "")
    get_settings.cache_clear()
    try:
        svc = FileService(Repository())
        wa_res = asyncio.run(
            svc.ingest_whatsapp_analysis(
                "00000000-0000-4000-8000-000000000001",
                group_name="ZeroKeyTest",
                raw_text="12/11/2026, 09:00 - Alex: Test offline message",
            )
        )
        assert wa_res["job_status"] == "Needs attention"
        assert "Not configured" in wa_res["job_message"]
    finally:
        get_settings.cache_clear()

