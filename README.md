# LIVING MEMORY — Personal Context Intelligence Platform

**Tagline:** *Your life, continuously understood.*

LIVING MEMORY is a full-stack personal context intelligence application connecting **React + TypeScript + Tailwind** with a modular **Python FastAPI + Pydantic** backend (`backend/app/`), **Memory DNA** versioning, **Cross-Source Intelligence**, **Impact Radar**, **Conflict Detection**, **WhatsApp export ingestion**, **multimodal upload pipelines**, **Gmail read-only OAuth 2.0**, **Google Gemini**, **Sarvam AI**, and **Supabase PostgreSQL + pgvector** (with automatic local SQLite fallback).

---

## Running Without External Credentials (Zero-Secret Local Mode)

The application **starts, builds, and runs cleanly without any API keys or external database credentials**:

- Unconfigured external integrations report an explicit **`Not configured`** status in the UI and `/api/system/status` instead of crashing.
- Database storage automatically falls back to a local SQLite database inside `backend/data/living_memory.db` (ignored by Git).
- PDF, DOCX, `.txt`, and WhatsApp `.txt`/`.zip` parsing work locally without external keys; Demo Sample mode and deterministic Ask Living Memory context search also work offline.

### Start Locally in Antigravity

1. **Install Node dependencies**:
   ```bash
   npm install
   ```
2. **Set up the Python backend virtualenv**:
   ```bash
   python3 -m venv backend/.venv
   backend/.venv/bin/pip install -r backend/requirements.txt
   ```
3. **Start the full-stack server** (Express + Vite on port `3000` proxying `/api/*` to FastAPI on `127.0.0.1:8088`):
   ```bash
   npm run dev
   ```
4. **Verify build & tests**:
   ```bash
   npm run build
   npm run lint
   backend/.venv/bin/pytest backend/tests -v
   ```

---

## Where to Add Real Credentials in Antigravity (After Cloning / Opening from GitHub)

When you open this repository in **Antigravity**, create a local environment file in **either** of these locations (both are listed in `.gitignore` and automatically loaded by `server.ts` and `backend/app/core/config.py`):

- **Option A (Recommended — Single file for full-stack):** Copy `.env.example` to `.env` in the **project root** (`/.env`).
- **Option B (Backend-specific):** Copy `backend/.env.example` to `backend/.env` (`/backend/.env`).
- **Option C (Cloud / AI Studio Deployment):** Add the same variable names in the platform **Secrets** panel.

> Never put real credentials into `.env.example`, `backend/.env.example`, or source files.

### Exact Credential Checklist

| Credential Variable(s) | Service | Where to Obtain & Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | **Google Gemini API** | Google AI Studio (`aistudio.google.com`). Enables AI extraction, embeddings (`gemini-embedding-2`), audio/video transcription (`gemini-3.5-transcribe`), OCR, and Gemini-grounded Ask AI (`gemini-4-hydrogen`). |
| `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET`<br>`GOOGLE_REDIRECT_URI` | **Google OAuth 2.0 (Gmail & Calendar)** | Google Cloud Console → *APIs & Services → Credentials → OAuth 2.0 Client IDs* (enable **Gmail API** and optionally **Google Calendar API**).<br>**Authorized Redirect URIs**:<br>• Local Antigravity: `http://localhost:3000/api/integrations/gmail/callback`<br>• AI Studio Dev: `https://<your-dev-domain>/api/integrations/gmail/callback`<br>• Production: `https://<your-prod-domain>/api/integrations/gmail/callback`<br>`GOOGLE_REDIRECT_URI` is optional if `APP_URL` is set (`<APP_URL>/api/integrations/gmail/callback`). |
| `SUPABASE_URL`<br>`SUPABASE_ANON_KEY`<br>`SUPABASE_SERVICE_ROLE_KEY`<br>`SUPABASE_JWT_SECRET`<br>`SUPABASE_STORAGE_BUCKET` | **Supabase PostgreSQL + pgvector + Storage** | Supabase Project → *Settings → API* & *Project URL*.<br>After adding keys, run these 3 SQL migrations in Supabase SQL Editor in order:<br>1. `backend/app/database/migrations/001_initial_schema.sql`<br>2. `backend/app/database/migrations/002_rls_policies.sql`<br>3. `backend/app/database/migrations/003_pgvector_search.sql` |
| `SARVAM_API_KEY` | **Sarvam AI (Optional Multilingual Voice)** | Sarvam AI Dashboard. Enables Indian/multilingual Speech-to-Text (`saaras:v3`), Translation (`mayura:v1`), and Text-to-Speech (`bulbul:v2`). |
| `TOKEN_ENCRYPTION_KEY`<br>`SESSION_SECRET` | **Backend Security Keys** | Generate locally:<br>• `TOKEN_ENCRYPTION_KEY`: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` (encrypts stored Google OAuth tokens).<br>• `SESSION_SECRET`: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` (signs workspace JWTs & OAuth CSRF state). |
| `APP_URL` | **Public Base URL** | Set to `http://localhost:3000` locally in Antigravity, or your hosted HTTPS origin in production. |

---

## Verifying Configuration Status

- Visit **`/settings`** inside the app or call `GET /api/system/status` to inspect live readiness for **Gemini API**, **Sarvam AI**, **Supabase Database**, and **Google OAuth 2.0** (`Configured` vs `Not configured`).
