# LIVING MEMORY – FastAPI Backend

Production Python + FastAPI backend for **LIVING MEMORY**, providing:

- **Supabase PostgreSQL + Storage + pgvector** schema migrations with strict Row Level Security (`backend/app/database/migrations/`). When Supabase credentials are not yet configured, the repository automatically runs against an isolated local SQLite store (`backend/data/living_memory.db`) while reporting setup-required status accurately.
- **Official Google OAuth 2.0 + Gmail API** (`https://www.googleapis.com/auth/gmail.readonly`) with server-side PKCE/state validation, Fernet-encrypted refresh tokens, incremental `history.list` sync, batch `messages.get`, and revocation handling.
- **Modular & Optional Google Calendar Sync** (`https://www.googleapis.com/auth/calendar.readonly`).
- **Google Gemini AI** (`google-genai`) structured extraction with Pydantic validation, anti-prompt-injection `<UNTRUSTED_IMPORT_DATA>` fencing, and `gemini-embedding-2` semantic vectors.
- **Sarvam AI** (`saaras:v3` speech-to-text, `mayura:v1` translation, `bulbul:v2` optional TTS, Indian-language transcription).
- **WhatsApp (`.txt` / `.zip`) & Multimodal Ingestion** (PDF, DOCX, JPG, PNG, MP3, WAV, M4A, MP4, MOV, WebM) with `ffmpeg` audio/keyframe extraction.
- **Memory Engine**: Memory DNA (append-only version history), Cross-Source Intelligence, Impact Radar, Entity Resolution, Conflict Detection, and Evidence Tracking.

## Running Locally / Development

The Node entry point (`server.ts` on port `3000`) automatically launches and supervises the FastAPI Uvicorn server on `127.0.0.1:8088` and proxies `/api/*` requests to it.

To run FastAPI standalone or execute tests:

```bash
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8088 --reload
backend/.venv/bin/pytest backend/tests -v
```
