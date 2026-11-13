"""Gmail OAuth 2.0, Sync, Email Intelligence & Optional Calendar routes."""

from __future__ import annotations

import html
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import HTMLResponse

from app.core.config import get_settings
from app.core.security import AuthenticatedUser, get_current_user
from app.database.repository import Repository
from app.integrations.calendar.client import fetch_calendar_events_readonly
from app.integrations.gmail.oauth import (
    OAuthConfigurationError,
    build_gmail_authorization_url,
    exchange_code_and_store,
    revoke_and_disconnect_gmail,
)
from app.schemas.api import GmailSyncRequest, ImportanceCorrectionRequest
from app.services.email_service import EmailService
from app.workers.job_runner import schedule_background_job

router = APIRouter(tags=["gmail"])


def _oauth_popup_html(success: bool, payload: dict) -> str:
    msg_type = "OAUTH_AUTH_SUCCESS" if success else "OAUTH_AUTH_ERROR"
    safe_email = html.escape(str(payload.get("email") or ""))
    safe_err = html.escape(str(payload.get("error") or ""))
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LIVING MEMORY · Google Authorization</title>
  <style>
    body {{ font-family: system-ui, -apple-system, sans-serif; background: #F8F9FA; color: #202124; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }}
    .card {{ background:#fff; border:1px solid #DADCE0; border-radius:16px; padding:28px; max-width:420px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.06); }}
    .badge {{ display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; background:{'#CEEAD6' if success else '#FCE8E6'}; color:{'#137333' if success else '#C5221F'}; }}
    h2 {{ font-size:18px; margin:12px 0 8px; }}
    p {{ font-size:13px; color:#5F6368; line-height:1.5; }}
    button {{ margin-top:16px; background:#1A73E8; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-size:13px; font-weight:600; cursor:pointer; }}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">{'Connected (Read-Only)' if success else 'Authorization Cancelled'}</span>
    <h2>{'Gmail Connected to LIVING MEMORY' if success else 'Could Not Connect Gmail'}</h2>
    <p>{f'Authorized {safe_email}. Closing this window...' if success else safe_err}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    try {{
      if (window.opener) {{
        window.opener.postMessage({{
          type: '{msg_type}',
          provider: 'gmail',
          email: '{safe_email}',
          error: '{safe_err}'
        }}, '*');
      }}
    }} catch (e) {{}}
    setTimeout(function() {{ window.close(); }}, 1200);
  </script>
</body>
</html>"""


@router.get("/api/integrations/gmail/connect")
async def gmail_connect(
    includeCalendar: bool = Query(default=True),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    extra_scopes = ["https://www.googleapis.com/auth/calendar.readonly"] if includeCalendar else []
    try:
        auth_url, state = build_gmail_authorization_url(user.id, repo, extra_scopes=extra_scopes)
        return {
            "configured": True,
            "authUrl": auth_url,
            "state": state,
            "redirectUri": get_settings().effective_google_redirect_uri,
        }
    except OAuthConfigurationError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": str(exc),
                "redirectUri": get_settings().effective_google_redirect_uri,
            },
        )


@router.get("/api/integrations/gmail/callback", response_class=HTMLResponse)
async def gmail_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
) -> HTMLResponse:
    if error:
        return HTMLResponse(_oauth_popup_html(False, {"error": error}), status_code=200)
    if not code or not state:
        return HTMLResponse(_oauth_popup_html(False, {"error": "Missing OAuth authorization code or state."}), status_code=400)
    repo = Repository()
    try:
        res = await exchange_code_and_store(code, state, repo)
        return HTMLResponse(_oauth_popup_html(True, {"email": res.get("email", "")}), status_code=200)
    except Exception as exc:
        return HTMLResponse(_oauth_popup_html(False, {"error": str(exc)}), status_code=400)


@router.get("/api/integrations/gmail/status")
async def gmail_status(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    settings = get_settings()
    repo = Repository()
    acc = repo.get_connected_account(user.id, "gmail")
    sync_state = repo.get_sync_state(user.id, "gmail")
    connected = bool(acc and acc.get("status") == "connected")
    return {
        "oauthConfigured": settings.google_oauth_configured,
        "redirectUri": settings.effective_google_redirect_uri,
        "connected": connected,
        "status": acc.get("status") if acc else ("setup_required" if not settings.google_oauth_configured else "disconnected"),
        "email": acc.get("provider_email") if acc else None,
        "scopes": acc.get("scopes", []) if acc else [],
        "lastError": acc.get("last_error") if acc else "",
        "syncState": sync_state,
    }


@router.post("/api/integrations/gmail/sync")
async def trigger_gmail_sync(
    payload: GmailSyncRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    acc = repo.get_connected_account(user.id, "gmail")
    if not acc or acc.get("status") != "connected":
        raise HTTPException(status_code=401, detail="Gmail is not connected. Authorize Gmail OAuth first.")

    job = repo.create_job(user.id, "Gmail Read-Only Sync", "gmail", "Queued Gmail sync")
    svc = EmailService(repo)

    async def work(progress_cb):
        return await svc.sync_gmail_account(
            user.id,
            max_messages=payload.maxMessages,
            after_date=payload.afterDate,
            before_date=payload.beforeDate,
            user_timezone=payload.userTimezone,
            user_priorities=payload.userPriorities,
            correction_hints=payload.correctionHints,
            force_full_sync=payload.forceFullSync,
            progress_cb=progress_cb,
        )

    schedule_background_job(repo, user.id, job["id"], work)
    return {"jobId": job["id"], "status": "Queued"}


@router.post("/api/integrations/gmail/disconnect")
async def disconnect_gmail(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    repo = Repository()
    await revoke_and_disconnect_gmail(user.id, repo)
    return {"ok": True, "connected": False}


@router.get("/api/emails")
async def list_emails(
    minImportance: int = Query(default=0, ge=0, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    svc = EmailService(Repository())
    return {"emails": svc.list_emails(user.id, min_importance=minImportance)}


@router.get("/api/emails/important")
async def list_important_emails(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    svc = EmailService(Repository())
    return {"emails": svc.list_emails(user.id, min_importance=75)}


@router.get("/api/emails/{email_id}")
async def get_email_detail(email_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    svc = EmailService(Repository())
    em = svc.get_email(user.id, email_id)
    if not em:
        raise HTTPException(status_code=404, detail="Email record not found.")
    return {"email": em}


@router.post("/api/emails/{email_id}/importance")
async def correct_email_importance(
    email_id: str,
    payload: ImportanceCorrectionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    svc = EmailService(Repository())
    updated = svc.correct_email_importance(user.id, email_id, payload.importanceScore, payload.reason)
    if not updated:
        raise HTTPException(status_code=404, detail="Email record not found.")
    return {"email": updated}


@router.post("/api/calendar/sync")
async def sync_calendar(
    authorization: Optional[str] = Header(default=None),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    repo = Repository()
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization.split(" ", 1)[1].strip()
        # Only use raw bearer as Google token if no server-side Gmail token is stored
        acc = repo.get_connected_account(user.id, "gmail")
        if not acc or acc.get("status") != "connected":
            token = candidate

    if not token:
        from app.integrations.gmail.oauth import get_valid_gmail_access_token

        try:
            token = await get_valid_gmail_access_token(user.id, repo)
        except Exception as exc:
            raise HTTPException(status_code=401, detail=str(exc))

    events = await fetch_calendar_events_readonly(token)
    return {"events": events}
