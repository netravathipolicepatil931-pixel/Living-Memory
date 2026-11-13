"""Tests for Fernet token encryption, OAuth CSRF HMAC state, and JWT workspace security."""

from app.core.encryption import (
    decrypt_secret,
    encrypt_secret,
    sign_oauth_state,
    verify_oauth_state,
)
from app.core.security import decode_token, issue_session_token


def test_fernet_encryption_roundtrip():
    secret = "ya29.test_refresh_token_secret_12345"
    cipher = encrypt_secret(secret)
    assert cipher != secret
    assert decrypt_secret(cipher) == secret
    assert decrypt_secret("") == ""


def test_oauth_state_signing_and_tamper_rejection():
    state = sign_oauth_state({"user_id": "user-123", "provider": "gmail"})
    decoded = verify_oauth_state(state)
    assert decoded is not None
    assert decoded["user_id"] == "user-123"
    assert decoded["provider"] == "gmail"

    # Tampered signature must fail
    tampered = state[:-4] + "XXXX"
    assert verify_oauth_state(tampered) is None


def test_jwt_session_issue_and_decode():
    token = issue_session_token("00000000-0000-4000-8000-000000000001", "alex@uni.edu", "Alex")
    user = decode_token(token)
    assert user is not None
    assert user.email == "alex@uni.edu"
    assert user.name == "Alex"
    assert decode_token("not-a-valid-jwt") is None
