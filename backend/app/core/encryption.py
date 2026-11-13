"""Symmetric token encryption (Fernet) and CSRF OAuth state signing."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import DATA_DIR, get_settings


def _resolve_fernet_key() -> bytes:
    settings = get_settings()
    raw = settings.token_encryption_key.strip()
    if raw:
        try:
            Fernet(raw.encode("utf-8"))
            return raw.encode("utf-8")
        except Exception:
            digest = hashlib.sha256(raw.encode("utf-8")).digest()
            return base64.urlsafe_b64encode(digest)

    # Local persistent key in backend/data/.fernet.key when env var is omitted
    key_file: Path = DATA_DIR / ".fernet.key"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if key_file.exists():
        stored = key_file.read_bytes().strip()
        try:
            Fernet(stored)
            return stored
        except Exception:
            pass
    generated = Fernet.generate_key()
    key_file.write_bytes(generated)
    try:
        os_chmod = __import__("os").chmod
        os_chmod(key_file, 0o600)
    except OSError:
        pass
    return generated


def get_fernet() -> Fernet:
    return Fernet(_resolve_fernet_key())


def encrypt_secret(plaintext: str) -> str:
    if not plaintext:
        return ""
    return get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        return get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt stored credential; verify TOKEN_ENCRYPTION_KEY.") from exc


def _signing_secret() -> bytes:
    settings = get_settings()
    if settings.session_secret.strip():
        return settings.session_secret.strip().encode("utf-8")
    return _resolve_fernet_key()


def sign_oauth_state(payload: Dict[str, Any], ttl_seconds: int = 600) -> str:
    body = {
        **payload,
        "nonce": secrets.token_urlsafe(16),
        "exp": int(time.time()) + ttl_seconds,
    }
    raw = base64.urlsafe_b64encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(_signing_secret(), raw, hashlib.sha256).hexdigest()
    return f"{raw.decode('utf-8')}.{sig}"


def verify_oauth_state(state_token: str) -> Optional[Dict[str, Any]]:
    if not state_token or "." not in state_token:
        return None
    raw_b64, sig = state_token.rsplit(".", 1)
    expected = hmac.new(_signing_secret(), raw_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(raw_b64.encode("utf-8")).decode("utf-8"))
    except Exception:
        return None
    if int(data.get("exp", 0)) < int(time.time()):
        return None
    return data
