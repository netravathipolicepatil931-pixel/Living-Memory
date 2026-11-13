"""Pydantic schemas validating all structured AI extraction outputs (never trusting raw strings)."""

from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


ImportanceCategory = Literal["Critical", "High", "Medium", "Low", "Informational"]
UrgencyLevel = Literal["High", "Medium", "Low"]
ConfidenceLevel = Literal["High", "Medium", "Low"]
MemoryCategory = Literal[
    "Events",
    "Tasks",
    "Decisions",
    "Commitments",
    "Deadlines",
    "Announcements",
    "People",
    "Projects",
    "Relationships",
    "Preferences",
    "Questions",
    "Important conversations",
]


def score_to_importance_category(score: int) -> ImportanceCategory:
    if score >= 90:
        return "Critical"
    if score >= 75:
        return "High"
    if score >= 50:
        return "Medium"
    if score >= 25:
        return "Low"
    return "Informational"


class ExtractedDeadlineSchema(BaseModel):
    title: str
    exactDate: Optional[str] = Field(default=None, description="YYYY-MM-DD or null if ambiguous")
    time: Optional[str] = Field(default="23:59")
    isExplicit: bool = True
    needsConfirmation: bool = False
    confirmationPrompt: Optional[str] = None
    relatedTask: Optional[str] = None

    @field_validator("exactDate")
    @classmethod
    def validate_iso_date(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) == 10 and v[4] == "-" and v[7] == "-":
            return v
        return None


class ExtractedIntelligenceItemSchema(BaseModel):
    title: str
    summary: str
    memoryCategory: MemoryCategory = "Important conversations"
    importanceScore: int = Field(default=60, ge=0, le=100)
    importanceCategory: ImportanceCategory = "Medium"
    urgency: UrgencyLevel = "Medium"
    importanceReason: str = "Automated importance classification based on impact and clarity."
    actionRequired: Optional[str] = None
    confidence: ConfidenceLevel = "Medium"
    supportingEvidence: str = ""
    peopleInvolved: List[str] = Field(default_factory=list)
    projectsInvolved: List[str] = Field(default_factory=list)
    pageOrTimestampRef: Optional[str] = None
    deadline: Optional[ExtractedDeadlineSchema] = None
    commitmentOwner: Optional[str] = None
    decisionChoice: Optional[str] = None
    changesPreviousInfo: Optional[str] = None


class EmailAnalysisOutput(BaseModel):
    importanceScore: int = Field(default=55, ge=0, le=100)
    importanceCategory: ImportanceCategory = "Medium"
    urgency: UrgencyLevel = "Low"
    importanceReason: str = "Evaluated based on actionability, commitments, and sender significance."
    shortSummary: str = ""
    actionRequired: str = "Review when convenient"
    requiresReply: bool = False
    emailCategory: Literal[
        "Important emails",
        "Deadlines",
        "Meetings",
        "Follow-ups",
        "Announcements",
        "Low priority",
    ] = "Important emails"
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class BatchAnalysisOutput(BaseModel):
    summary: str = ""
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class ImageAnalysisOutput(BaseModel):
    summary: str = ""
    ocrText: str = ""
    structuredDetails: Dict[str, str] = Field(default_factory=dict)
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class MediaTimestampItem(BaseModel):
    time: str
    label: str


class AudioAnalysisOutput(BaseModel):
    summary: str = ""
    transcript: str = ""
    timestamps: List[MediaTimestampItem] = Field(default_factory=list)
    detectedLanguage: Optional[str] = None
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class VideoAnalysisOutput(BaseModel):
    summary: str = ""
    transcript: str = ""
    visibleText: str = ""
    timestamps: List[MediaTimestampItem] = Field(default_factory=list)
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class PdfAnalysisOutput(BaseModel):
    summary: str = ""
    keyPoints: List[str] = Field(default_factory=list)
    extractedItems: List[ExtractedIntelligenceItemSchema] = Field(default_factory=list)


class CitationItem(BaseModel):
    sourceName: str
    date: str
    excerpt: str
    memoryId: Optional[str] = None


class AskLivingMemoryOutput(BaseModel):
    answer: str
    confidenceLabel: ConfidenceLevel = "Medium"
    citations: List[CitationItem] = Field(default_factory=list)
    peopleMentioned: List[str] = Field(default_factory=list)
    projectsMentioned: List[str] = Field(default_factory=list)
    followUps: List[str] = Field(default_factory=list)
