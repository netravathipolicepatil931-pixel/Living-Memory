"""API request & response Pydantic schemas."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LoginSessionRequest(BaseModel):
    email: str
    name: str = "Alex"
    password: Optional[str] = None
    mode: str = "demo"


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    use_mode: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    timezone: Optional[str] = None
    preferred_language: Optional[str] = None
    digest_time: Optional[str] = None
    retention_policy: Optional[str] = None
    auto_detect_conflicts: Optional[bool] = None
    proactive_alerts_enabled: Optional[bool] = None


class GmailSyncRequest(BaseModel):
    maxMessages: int = Field(default=500, ge=1, le=500)
    afterDate: Optional[str] = None
    beforeDate: Optional[str] = None
    userTimezone: str = "UTC"
    userPriorities: List[str] = Field(default_factory=lambda: ["Deadlines", "Decisions", "Commitments"])
    correctionHints: List[str] = Field(default_factory=list)
    forceFullSync: bool = False


class ImportanceCorrectionRequest(BaseModel):
    importanceScore: int = Field(ge=0, le=100)
    reason: str = ""


class WhatsAppAnalyzeRequest(BaseModel):
    groupName: str
    rawText: str
    includeMedia: bool = False
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    userTimezone: str = "UTC"
    selectedParticipants: List[str] = Field(default_factory=list)


class MemoryUpdateRequest(BaseModel):
    verificationStatus: Optional[str] = None
    currentInformation: Optional[str] = None
    reason: Optional[str] = None
    note: Optional[str] = None
    importanceScore: Optional[int] = Field(default=None, ge=0, le=100)


class DeadlineCreateRequest(BaseModel):
    title: str
    date: str
    time: str = "09:00"
    timezone: str = "UTC"
    supportingEvidence: str = ""
    relatedTask: str = ""


class DeadlineConfirmRequest(BaseModel):
    confirmedDate: str
    confirmedTime: Optional[str] = None


class ConflictResolveRequest(BaseModel):
    status: str = "Confirmed Latest"
    chosenValue: Optional[str] = None


class AskAIRequest(BaseModel):
    question: str
    contextSnapshot: Optional[Dict[str, Any]] = None
    useSemanticSearch: bool = True
    preferredLanguage: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    languageCode: str = "en-IN"
    speaker: str = "anushka"
