"""Authentication, JWT validation (Supabase + workspace session), and authorization."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import DATA_DIR, get_settings


DEFAULT_DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"
DEFAULT_DEMO_EMAIL = "alex.chen@university.edu"
DEFAULT_DEMO_NAME = "Alex"

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    id: str
    email: str
    name: str
    auth_mode: str  # "supabase" | "session" | "demo"


def _effective_session_secret() -> str:
    settings = get_settings()
    if settings.session_secret.strip():
        return settings.session_secret.strip()
    secret_file = DATA_DIR / ".session.key"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if secret_file.exists():
        return secret_file.read_text(encoding="utf-8").strip()
    generated = hashlib.sha256(str(time.time_ns()).encode("utf-8")).hexdigest()
    secret_file.write_text(generated, encoding="utf-8")
    return generated


def issue_session_token(user_id: str, email: str, name: str, ttl_seconds: int = 86400 * 7) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iss": "living-memory",
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(payload, _effective_session_secret(), algorithm="HS256")


def decode_token(token: str) -> Optional[AuthenticatedUser]:
    settings = get_settings()
    # 1. Try Supabase JWT secret first if configured
    if settings.supabase_jwt_secret.strip():
        try:
            claims = jwt.decode(
                token,
                settings.supabase_jwt_secret.strip(),
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            sub = str(claims.get("sub") or "")
            if sub:
                meta = claims.get("user_metadata") or {}
                return AuthenticatedUser(
                    id=sub,
                    email=str(claims.get("email") or ""),
                    name=str(meta.get("full_name") or meta.get("name") or claims.get("email") or "User"),
                    auth_mode="supabase",
                )
        except jwt.PyJWTError:
            pass

    # 2. Try local Living Memory workspace session token
    try:
        claims = jwt.decode(
            token,
            _effective_session_secret(),
            algorithms=["HS256"],
            issuer="living-memory",
        )
        sub = str(claims.get("sub") or "")
        if sub:
            return AuthenticatedUser(
                id=sub,
                email=str(claims.get("email") or ""),
                name=str(claims.get("name") or "Alex"),
                auth_mode="session",
            )
    except jwt.PyJWTError:
        pass

    return None


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedUser:
    token = creds.credentials if creds else None
    if not token:
        token = request.cookies.get("lm_session")
    if token:
        user = decode_token(token)
        if user:
            return user
        # If an explicit Authorization header was passed and is invalid, reject clearly
        if creds and creds.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            )

    # Single-tenant local workspace fallback only when explicitly in development without external JWT
    workspace_header = request.headers.get("X-Workspace-User-Id", "").strip()
    if workspace_header:
        return AuthenticatedUser(
            id=workspace_header,
            email=request.headers.get("X-Workspace-User-Email", DEFAULT_DEMO_EMAIL),
            name=request.headers.get("X-Workspace-User-Name", DEFAULT_DEMO_NAME),
            auth_mode="demo",
        )

    return AuthenticatedUser(
        id=DEFAULT_DEMO_USER_ID,
        email=DEFAULT_DEMO_EMAIL,
        name=DEFAULT_DEMO_NAME,
        auth_mode="demo",
    )
