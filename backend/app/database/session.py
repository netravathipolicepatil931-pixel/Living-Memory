"""Database connection manager supporting Supabase PostgreSQL/Storage with SQLite fallback."""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any, Optional

from app.core.config import DATA_DIR, get_settings

logger = logging.getLogger("living_memory.database")

_supabase_client: Any = None
_sqlite_initialized = False

SQLITE_DB_PATH = DATA_DIR / "living_memory.db"
LOCAL_STORAGE_DIR = DATA_DIR / "storage"


def get_supabase_client() -> Optional[Any]:
    global _supabase_client
    settings = get_settings()
    if not settings.supabase_configured:
        return None
    if _supabase_client is None:
        try:
            from supabase import create_client

            _supabase_client = create_client(
                settings.supabase_url.strip(),
                settings.supabase_service_role_key.strip(),
            )
            logger.info("Connected Supabase backend client.")
        except Exception as exc:
            logger.warning("Failed to initialize Supabase client; falling back to SQLite: %s", exc)
            return None
    return _supabase_client


def get_sqlite_conn() -> sqlite3.Connection:
    global _sqlite_initialized
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    if not _sqlite_initialized:
        _init_sqlite_schema(conn)
        _sqlite_initialized = True
    return conn


def _init_sqlite_schema(conn: sqlite3.Connection) -> None:
    """Create matching SQLite mirrors of all 17 PostgreSQL tables for local persistence."""
    statements = [
        """CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL DEFAULT 'Alex',
            role TEXT NOT NULL DEFAULT 'Personal Workspace',
            use_mode TEXT NOT NULL DEFAULT 'Academic',
            avatar_url TEXT DEFAULT '',
            onboarding_completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS connected_accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            provider_email TEXT NOT NULL DEFAULT '',
            scopes TEXT NOT NULL DEFAULT '[]',
            encrypted_access_token TEXT NOT NULL DEFAULT '',
            encrypted_refresh_token TEXT NOT NULL DEFAULT '',
            token_expires_at TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'disconnected',
            last_error TEXT DEFAULT '',
            connected_at TEXT DEFAULT '',
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, provider)
        )""",
        """CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            external_ref TEXT DEFAULT '',
            name TEXT NOT NULL,
            source_type TEXT NOT NULL,
            storage_path TEXT DEFAULT '',
            mime_type TEXT DEFAULT '',
            size_bytes INTEGER NOT NULL DEFAULT 0,
            processing_status TEXT NOT NULL DEFAULT 'Uploaded',
            record_count INTEGER NOT NULL DEFAULT 1,
            extracted_memories_count INTEGER NOT NULL DEFAULT 0,
            authority_basis TEXT DEFAULT '',
            verification_state TEXT DEFAULT 'Direct Source',
            ai_summary TEXT DEFAULT '',
            ocr_text TEXT DEFAULT '',
            transcript TEXT DEFAULT '',
            visible_text TEXT DEFAULT '',
            structured_details TEXT NOT NULL DEFAULT '{}',
            timestamps_json TEXT NOT NULL DEFAULT '[]',
            data_origin TEXT NOT NULL DEFAULT 'Live',
            error_message TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS emails (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            source_id TEXT DEFAULT '',
            gmail_message_id TEXT NOT NULL,
            thread_id TEXT NOT NULL,
            sender_name TEXT NOT NULL DEFAULT '',
            sender_email TEXT NOT NULL DEFAULT '',
            recipients TEXT NOT NULL DEFAULT '',
            subject TEXT NOT NULL DEFAULT '(No Subject)',
            snippet TEXT DEFAULT '',
            short_summary TEXT DEFAULT '',
            body_text TEXT DEFAULT '',
            labels TEXT NOT NULL DEFAULT '[]',
            attachments_metadata TEXT NOT NULL DEFAULT '[]',
            gmail_url TEXT DEFAULT '',
            received_at TEXT NOT NULL,
            importance_score INTEGER NOT NULL DEFAULT 50,
            importance_category TEXT NOT NULL DEFAULT 'Medium',
            urgency TEXT NOT NULL DEFAULT 'Low',
            importance_reason TEXT DEFAULT '',
            action_required TEXT DEFAULT '',
            requires_reply INTEGER NOT NULL DEFAULT 0,
            user_corrected_importance INTEGER NOT NULL DEFAULT 0,
            detected_deadline TEXT DEFAULT '',
            data_origin TEXT NOT NULL DEFAULT 'Live',
            created_at TEXT NOT NULL,
            UNIQUE(user_id, gmail_message_id)
        )""",
        """CREATE TABLE IF NOT EXISTS email_sync_state (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'gmail',
            history_id TEXT DEFAULT '',
            last_sync_at TEXT DEFAULT '',
            sync_status TEXT NOT NULL DEFAULT 'idle',
            messages_synced INTEGER NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT '',
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, provider)
        )""",
        """CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            source_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            current_information TEXT NOT NULL,
            category TEXT NOT NULL,
            workspace TEXT NOT NULL DEFAULT 'all',
            event_time TEXT NOT NULL DEFAULT '',
            recorded_time TEXT NOT NULL DEFAULT '',
            source_name TEXT NOT NULL DEFAULT '',
            source_type TEXT NOT NULL DEFAULT 'Text File',
            confidence TEXT NOT NULL DEFAULT 'Medium',
            verification_status TEXT NOT NULL DEFAULT 'Verified',
            importance_score INTEGER NOT NULL DEFAULT 60,
            importance_category TEXT NOT NULL DEFAULT 'Medium',
            urgency TEXT NOT NULL DEFAULT 'Medium',
            importance_reason TEXT DEFAULT '',
            action_required TEXT DEFAULT '',
            page_or_timestamp_ref TEXT DEFAULT '',
            user_notes TEXT NOT NULL DEFAULT '[]',
            embedding TEXT DEFAULT '',
            data_origin TEXT NOT NULL DEFAULT 'Live',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS memory_versions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT NOT NULL,
            version_number INTEGER NOT NULL DEFAULT 1,
            summary TEXT NOT NULL,
            value_text TEXT NOT NULL,
            event_time TEXT NOT NULL DEFAULT '',
            recorded_time TEXT NOT NULL DEFAULT '',
            source_name TEXT NOT NULL DEFAULT '',
            changed_by TEXT NOT NULL DEFAULT 'LIVING MEMORY AI',
            reason TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Active',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            role TEXT DEFAULT '',
            organization TEXT DEFAULT '',
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            UNIQUE(user_id, entity_type, normalized_name)
        )""",
        """CREATE TABLE IF NOT EXISTS relationships (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            from_entity_id TEXT DEFAULT '',
            to_entity_id TEXT DEFAULT '',
            from_memory_id TEXT DEFAULT '',
            to_memory_id TEXT DEFAULT '',
            relation_type TEXT NOT NULL,
            confidence REAL NOT NULL DEFAULT 0.85,
            evidence_summary TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT NOT NULL,
            source_id TEXT DEFAULT '',
            source_name TEXT NOT NULL,
            source_type TEXT NOT NULL,
            external_ref TEXT DEFAULT '',
            excerpt TEXT NOT NULL,
            event_time TEXT NOT NULL DEFAULT '',
            recorded_time TEXT NOT NULL DEFAULT '',
            author TEXT NOT NULL DEFAULT '',
            page_or_timestamp_ref TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS deadlines (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT DEFAULT '',
            source_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            due_date TEXT DEFAULT '',
            due_time TEXT NOT NULL DEFAULT '23:59',
            timezone TEXT NOT NULL DEFAULT 'UTC',
            source_name TEXT NOT NULL DEFAULT '',
            source_type TEXT NOT NULL DEFAULT 'Text File',
            origin_kind TEXT NOT NULL DEFAULT 'AI-Extracted',
            importance_score INTEGER NOT NULL DEFAULT 75,
            importance_category TEXT NOT NULL DEFAULT 'High',
            urgency TEXT NOT NULL DEFAULT 'Medium',
            status TEXT NOT NULL DEFAULT 'Pending',
            supporting_evidence TEXT NOT NULL DEFAULT '',
            confidence TEXT NOT NULL DEFAULT 'Medium',
            is_explicit INTEGER NOT NULL DEFAULT 1,
            needs_confirmation INTEGER NOT NULL DEFAULT 0,
            confirmation_prompt TEXT DEFAULT '',
            related_task TEXT DEFAULT '',
            history_json TEXT NOT NULL DEFAULT '[]',
            data_origin TEXT NOT NULL DEFAULT 'Live',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS commitments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            owner TEXT NOT NULL DEFAULT '',
            counterparty TEXT NOT NULL DEFAULT '',
            due_date TEXT NOT NULL DEFAULT '',
            statement TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            source_name TEXT NOT NULL DEFAULT '',
            follow_up_history TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            decision_date TEXT NOT NULL DEFAULT '',
            final_choice TEXT NOT NULL,
            alternatives TEXT NOT NULL DEFAULT '[]',
            reasoning TEXT NOT NULL DEFAULT '',
            outcomes TEXT NOT NULL DEFAULT '',
            source_name TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS conflicts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            conflict_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'High',
            status TEXT NOT NULL DEFAULT 'Unresolved',
            claims_json TEXT NOT NULL DEFAULT '[]',
            suggested_resolution TEXT NOT NULL DEFAULT '',
            detected_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            memory_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Important',
            read INTEGER NOT NULL DEFAULT 0,
            source_ref TEXT NOT NULL DEFAULT '',
            action_route TEXT NOT NULL DEFAULT '/dashboard',
            created_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS processing_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            kind TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Uploaded',
            progress INTEGER NOT NULL DEFAULT 0,
            message TEXT NOT NULL DEFAULT '',
            result_json TEXT DEFAULT '',
            error_text TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS user_preferences (
            user_id TEXT PRIMARY KEY,
            timezone TEXT NOT NULL DEFAULT 'UTC',
            preferred_language TEXT NOT NULL DEFAULT 'en-IN',
            digest_time TEXT NOT NULL DEFAULT '08:00',
            retention_policy TEXT NOT NULL DEFAULT '1 Year',
            auto_detect_conflicts INTEGER NOT NULL DEFAULT 1,
            proactive_alerts_enabled INTEGER NOT NULL DEFAULT 1,
            importance_correction_hints TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS oauth_pending_states (
            state TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""",
    ]
    for stmt in statements:
        conn.execute(stmt)
    conn.commit()
