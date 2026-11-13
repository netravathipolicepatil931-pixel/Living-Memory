"""Authentication, Workspace Session, Profile & Preferences routes."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Response

from app.core.security import (
    DEFAULT_DEMO_USER_ID,
    AuthenticatedUser,
    get_current_user,
    issue_session_token,
)
from app.database.repository import Repository
from app.schemas.api import LoginSessionRequest, ProfileUpdateRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _repo() -> Repository:
    return Repository()


@router.post("/session")
async def create_session(payload: LoginSessionRequest, response: Response) -> dict:
    repo = _repo()
    email = payload.email.strip() or "alex.chen@university.edu"
    name = payload.name.strip() or "Alex"
    user_id = (
        DEFAULT_DEMO_USER_ID
        if payload.mode == "demo" or email == "alex.chen@university.edu"
        else str(uuid.uuid5(uuid.NAMESPACE_DNS, email.lower()))
    )
    profile = repo.ensure_profile(user_id, email, name)
    token = issue_session_token(user_id=profile["id"], email=profile["email"], name=profile.get("full_name", name))
    response.set_cookie(
        key="lm_session",
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=86400 * 7,
    )
    return {
        "token": token,
        "user": {
            "id": profile["id"],
            "email": profile["email"],
            "name": profile.get("full_name", name),
            "role": profile.get("role", "Personal Workspace"),
            "useMode": profile.get("use_mode", "Academic"),
            "onboardingCompleted": bool(profile.get("onboarding_completed", 0)),
        },
        "preferences": repo.get_preferences(profile["id"]),
    }


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("lm_session", samesite="none", secure=True)
    return {"ok": True}


@router.get("/me")
async def get_me(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    repo = _repo()
    profile = repo.get_profile(user.id, email=user.email, full_name=user.name)
    prefs = repo.get_preferences(user.id)
    return {
        "user": {
            "id": profile["id"],
            "email": profile.get("email", user.email),
            "name": profile.get("full_name", user.name),
            "role": profile.get("role", "Personal Workspace"),
            "useMode": profile.get("use_mode", "Academic"),
            "onboardingCompleted": bool(profile.get("onboarding_completed", 0)),
            "authMode": user.auth_mode,
        },
        "preferences": prefs,
    }


@router.get("/preferences")
async def get_preferences(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    repo = _repo()
    return {"preferences": repo.get_preferences(user.id)}


@router.patch("/preferences")
async def update_preferences(
    payload: ProfileUpdateRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    repo = _repo()
    patch = payload.model_dump(exclude_none=True)
    updated = repo.update_preferences(user.id, patch)
    profile = repo.get_profile(user.id, email=user.email, full_name=user.name)
    return {"preferences": updated, "profile": profile}
