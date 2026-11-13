"""Unit tests for Gmail OAuth state handling, token encryption storage, and read-only sync fallback."""

from datetime import datetime, timedelta, timezone
import pytest

from app.core.encryption import encrypt_secret
from app.core.security import DEFAULT_DEMO_USER_ID
from app.database.repository import Repository
from app.integrations.gmail.client import HistoryExpiredError
from app.integrations.gmail.oauth import (
    OAuthConfigurationError,
    build_gmail_authorization_url,
    get_valid_gmail_access_token,
)
from app.services.email_service import EmailService


def test_gmail_connect_requires_oauth_credentials(monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "google_client_id", "")
    monkeypatch.setattr(settings, "google_client_secret", "")
    repo = Repository()
    with pytest.raises(OAuthConfigurationError):
        build_gmail_authorization_url(DEFAULT_DEMO_USER_ID, repo)


def test_gmail_connect_builds_readonly_url_with_csrf_state(monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "google_client_id", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")
    repo = Repository()
    url, state = build_gmail_authorization_url(DEFAULT_DEMO_USER_ID, repo)
    assert "gmail.readonly" in url
    assert "access_type=offline" in url
    from urllib.parse import parse_qs, urlparse
    qs = parse_qs(urlparse(url).query)
    assert qs["state"][0] == state
    pending = repo.consume_pending_oauth_state(state)
    assert pending is not None
    assert pending["user_id"] == DEFAULT_DEMO_USER_ID


@pytest.mark.asyncio
async def test_valid_token_returns_decrypted_unexpired_token():
    repo = Repository()
    exp = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    repo.upsert_connected_account(
        user_id=DEFAULT_DEMO_USER_ID,
        provider="gmail",
        provider_email="student@uni.edu",
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
        encrypted_access_token=encrypt_secret("ya29.valid_secret_token"),
        encrypted_refresh_token=encrypt_secret("1//refresh_secret"),
        token_expires_at=exp,
        status="connected",
    )
    tok = await get_valid_gmail_access_token(DEFAULT_DEMO_USER_ID, repo)
    assert tok == "ya29.valid_secret_token"


@pytest.mark.asyncio
async def test_gmail_sync_history_expired_falls_back_to_full_sync(monkeypatch):
    repo = Repository()
    uid = DEFAULT_DEMO_USER_ID
    exp = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    repo.upsert_connected_account(
        user_id=uid,
        provider="gmail",
        provider_email="student@uni.edu",
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
        encrypted_access_token=encrypt_secret("ya29.valid"),
        encrypted_refresh_token=encrypt_secret("1//refresh"),
        token_expires_at=exp,
        status="connected",
    )
    repo.upsert_sync_state(uid, "gmail", "old-expired-history-1", "idle", 0)

    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "")

    import app.services.email_service as es_mod

    async def fake_profile(tok):
        return {"emailAddress": "student@uni.edu", "historyId": "9999"}

    async def fake_history(tok, start_hid):
        raise HistoryExpiredError("404 expired")

    async def fake_list(tok, **kwargs):
        return ["msg-100"]

    async def fake_detail(tok, mid):
        return {
            "gmail_message_id": mid,
            "thread_id": "thr-100",
            "labels": ["INBOX"],
            "sender_name": "Prof Meera",
            "sender_email": "meera@uni.edu",
            "recipients": "student@uni.edu",
            "subject": "Midterm Evaluation Lab 304",
            "snippet": "Scheduled Nov 18",
            "body_text": "Evaluation is in Lab 304 on Nov 18.",
            "attachments_metadata": [],
            "received_at": "2026-11-12T10:00:00+00:00",
            "gmail_url": "https://mail.google.com/mail/u/0/#inbox/thr-100",
            "history_id": "9999",
        }

    monkeypatch.setattr(es_mod, "fetch_gmail_profile", fake_profile)
    monkeypatch.setattr(es_mod, "list_gmail_history_added_ids", fake_history)
    monkeypatch.setattr(es_mod, "list_gmail_message_ids_paginated", fake_list)
    monkeypatch.setattr(es_mod, "fetch_gmail_message_detail", fake_detail)

    svc = EmailService(repo)
    res = await svc.sync_gmail_account(uid, max_messages=10)
    assert res["syncMode"] == "full"
    assert len(res["emails"]) == 1
    assert res["emails"][0]["subject"] == "Midterm Evaluation Lab 304"
