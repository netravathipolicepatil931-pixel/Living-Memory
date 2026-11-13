"""Server-side Google OAuth 2.0 flow with CSRF state validation, offline refresh tokens, and encryption."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings
from app.core.encryption import decrypt_secret, encrypt_secret, sign_oauth_state, verify_oauth_state
from app.database.repository import Repository


GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"


class OAuthConfigurationError(RuntimeError):
    pass


class OAuthRevokedError(RuntimeError):
    pass


def build_gmail_authorization_url(user_id: str, repo: Repository, extra_scopes: Optional[List[str]] = None) -> Tuple[str, str]:
    settings = get_settings()
    if not settings.google_oauth_configured:
        raise OAuthConfigurationError(
            "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured on the backend."
        )

    scopes = [GMAIL_READONLY_SCOPE, "openid", "email", "profile"]
    if extra_scopes:
        for s in extra_scopes:
            if s not in scopes:
                scopes.append(s)

    state = sign_oauth_state({"user_id": user_id, "provider": "gmail"})
    repo.save_pending_oauth_state(state, user_id, "gmail")

    params = {
        "client_id": settings.google_client_id.strip(),
        "redirect_uri": settings.effective_google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}", state


async def exchange_code_and_store(code: str, state: str, repo: Repository) -> Dict[str, Any]:
    settings = get_settings()
    state_data = verify_oauth_state(state)
    pending = repo.consume_pending_oauth_state(state)
    if not state_data or not pending:
        raise ValueError("Invalid or expired OAuth CSRF state parameter.")

    user_id = pending["user_id"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": settings.google_client_id.strip(),
                "client_secret": settings.google_client_secret.strip(),
                "redirect_uri": settings.effective_google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        if token_resp.status_code >= 400 or "access_token" not in token_data:
            raise RuntimeError(token_data.get("error_description") or token_data.get("error") or "OAuth token exchange failed.")

        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token", "")
        expires_in = int(token_data.get("expires_in", 3500))
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
        granted_scopes = str(token_data.get("scope", GMAIL_READONLY_SCOPE)).split()

        profile_resp = await client.get(
            GOOGLE_USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_email = ""
        if profile_resp.status_code == 200:
            profile_email = profile_resp.json().get("email", "")

    enc_access = encrypt_secret(access_token)
    enc_refresh = encrypt_secret(refresh_token) if refresh_token else None

    account = repo.upsert_connected_account(
        user_id=user_id,
        provider="gmail",
        provider_email=profile_email,
        scopes=granted_scopes,
        encrypted_access_token=enc_access,
        encrypted_refresh_token=enc_refresh,
        token_expires_at=expires_at,
        status="connected",
        last_error="",
    )
    return {
        "user_id": user_id,
        "email": profile_email,
        "scopes": granted_scopes,
        "status": account.get("status", "connected"),
    }


async def get_valid_gmail_access_token(user_id: str, repo: Repository) -> str:
    """Decrypt access token; refresh silently via encrypted refresh_token when expired."""
    account = repo.get_connected_account(user_id, "gmail")
    if not account or account.get("status") != "connected":
        raise OAuthRevokedError("Gmail account is not connected. Authorize Gmail first.")

    expires_at_raw = account.get("token_expires_at") or ""
    access_token = decrypt_secret(account.get("encrypted_access_token", ""))
    needs_refresh = True
    if expires_at_raw and access_token:
        try:
            exp_dt = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
            if exp_dt > datetime.now(timezone.utc) + timedelta(seconds=90):
                needs_refresh = False
        except ValueError:
            needs_refresh = True

    if not needs_refresh:
        return access_token

    refresh_token = decrypt_secret(account.get("encrypted_refresh_token", ""))
    if not refresh_token:
        raise OAuthRevokedError("Gmail session expired and no refresh token is stored. Reconnect Gmail.")

    settings = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "client_id": settings.google_client_id.strip(),
                "client_secret": settings.google_client_secret.strip(),
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        data = resp.json()
        if resp.status_code >= 400 or "access_token" not in data:
            err_code = data.get("error", "")
            msg = data.get("error_description") or err_code or "Failed to refresh Gmail token."
            repo.upsert_connected_account(
                user_id=user_id,
                provider="gmail",
                provider_email=account.get("provider_email", ""),
                scopes=account.get("scopes", []),
                encrypted_access_token="",
                encrypted_refresh_token=None,
                token_expires_at="",
                status="revoked" if err_code == "invalid_grant" else "error",
                last_error=msg,
            )
            raise OAuthRevokedError(f"Gmail permission revoked or expired ({msg}). Please reconnect.")

        new_access = data["access_token"]
        expires_in = int(data.get("expires_in", 3500))
        new_exp = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
        repo.upsert_connected_account(
            user_id=user_id,
            provider="gmail",
            provider_email=account.get("provider_email", ""),
            scopes=account.get("scopes", []),
            encrypted_access_token=encrypt_secret(new_access),
            encrypted_refresh_token=None,
            token_expires_at=new_exp,
            status="connected",
            last_error="",
        )
        return new_access


async def revoke_and_disconnect_gmail(user_id: str, repo: Repository) -> None:
    account = repo.get_connected_account(user_id, "gmail")
    if account:
        token_to_revoke = ""
        try:
            token_to_revoke = decrypt_secret(account.get("encrypted_refresh_token") or account.get("encrypted_access_token") or "")
        except Exception:
            token_to_revoke = ""
        if token_to_revoke:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    await client.post(GOOGLE_REVOKE_ENDPOINT, params={"token": token_to_revoke})
            except Exception:
                pass
    repo.delete_connected_account(user_id, "gmail")
