"""Unified Repository Layer for all 17 domain tables + Storage + Vector Search."""

from __future__ import annotations

import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.database.session import LOCAL_STORAGE_DIR, get_sqlite_conn, get_supabase_client


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_uuid() -> str:
    return str(uuid.uuid4())


def _safe_json_loads(val: Any, default: Any) -> Any:
    if val is None or val == "":
        return default
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class Repository:
    """Thread-safe repository backed by Supabase when configured, else local SQLite."""

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def sb(self) -> Optional[Any]:
        return get_supabase_client()

    # ------------------------------------------------------------------
    # Profiles & Preferences
    # ------------------------------------------------------------------
    def ensure_profile(self, user_id: str, email: str, full_name: str = "Alex") -> Dict[str, Any]:
        now = utcnow_iso()
        if self.sb:
            existing = self.sb.table("profiles").select("*").eq("id", user_id).execute()
            if existing.data:
                return existing.data[0]
            payload = {
                "id": user_id,
                "email": email or f"{user_id}@local.livingmemory",
                "full_name": full_name or "Alex",
                "created_at": now,
                "updated_at": now,
            }
            res = self.sb.table("profiles").upsert(payload).execute()
            self.sb.table("user_preferences").upsert({"user_id": user_id, "updated_at": now}).execute()
            return res.data[0] if res.data else payload

        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
        if row:
            return dict(row)
        conn.execute(
            """INSERT OR IGNORE INTO profiles
               (id, email, full_name, role, use_mode, avatar_url, onboarding_completed, created_at, updated_at)
               VALUES (?, ?, ?, 'Personal Workspace', 'Academic', '', 0, ?, ?)""",
            (user_id, email or f"{user_id}@local.livingmemory", full_name or "Alex", now, now),
        )
        conn.execute(
            """INSERT OR IGNORE INTO user_preferences (user_id, updated_at) VALUES (?, ?)""",
            (user_id, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else {"id": user_id, "email": email, "full_name": full_name}

    def get_profile(self, user_id: str, email: str = "", full_name: str = "Alex") -> Dict[str, Any]:
        prof = self.ensure_profile(user_id, email, full_name)
        prof["onboarding_completed"] = bool(prof.get("onboarding_completed", 0))
        return prof

    def get_preferences(self, user_id: str) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        if self.sb:
            res = self.sb.table("user_preferences").select("*").eq("user_id", user_id).execute()
            return res.data[0] if res.data else {}
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM user_preferences WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            return {}
        d = dict(row)
        d["importance_correction_hints"] = _safe_json_loads(d.get("importance_correction_hints"), [])
        d["auto_detect_conflicts"] = bool(d.get("auto_detect_conflicts", 1))
        d["proactive_alerts_enabled"] = bool(d.get("proactive_alerts_enabled", 1))
        return d

    def update_preferences(self, user_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        if self.sb:
            profile_fields = {k: v for k, v in patch.items() if k in {"full_name", "role", "use_mode", "onboarding_completed"}}
            pref_fields = {
                k: v
                for k, v in patch.items()
                if k
                in {
                    "timezone",
                    "preferred_language",
                    "digest_time",
                    "retention_policy",
                    "auto_detect_conflicts",
                    "proactive_alerts_enabled",
                    "importance_correction_hints",
                }
            }
            if profile_fields:
                profile_fields["updated_at"] = now
                self.sb.table("profiles").update(profile_fields).eq("id", user_id).execute()
            if pref_fields:
                pref_fields["updated_at"] = now
                self.sb.table("user_preferences").upsert({"user_id": user_id, **pref_fields}).execute()
            return self.get_preferences(user_id)

        conn = get_sqlite_conn()
        for col in ("full_name", "role", "use_mode", "onboarding_completed"):
            if col in patch and patch[col] is not None:
                val = int(bool(patch[col])) if col == "onboarding_completed" else patch[col]
                conn.execute(f"UPDATE profiles SET {col} = ?, updated_at = ? WHERE id = ?", (val, now, user_id))
        for col in (
            "timezone",
            "preferred_language",
            "digest_time",
            "retention_policy",
            "auto_detect_conflicts",
            "proactive_alerts_enabled",
            "importance_correction_hints",
        ):
            if col in patch and patch[col] is not None:
                val = patch[col]
                if col in ("auto_detect_conflicts", "proactive_alerts_enabled"):
                    val = int(bool(val))
                elif col == "importance_correction_hints":
                    val = json.dumps(val)
                conn.execute(f"UPDATE user_preferences SET {col} = ?, updated_at = ? WHERE user_id = ?", (val, now, user_id))
        conn.commit()
        return self.get_preferences(user_id)

    # ------------------------------------------------------------------
    # Connected Accounts & OAuth Sync State
    # ------------------------------------------------------------------
    def upsert_connected_account(
        self,
        user_id: str,
        provider: str,
        provider_email: str,
        scopes: List[str],
        encrypted_access_token: str,
        encrypted_refresh_token: Optional[str],
        token_expires_at: str,
        status: str = "connected",
        last_error: str = "",
    ) -> Dict[str, Any]:
        self.ensure_profile(user_id, provider_email or "", "Alex")
        now = utcnow_iso()
        existing = self.get_connected_account(user_id, provider)
        refresh_to_store = encrypted_refresh_token or (existing.get("encrypted_refresh_token", "") if existing else "")

        if self.sb:
            payload = {
                "id": existing["id"] if existing else new_uuid(),
                "user_id": user_id,
                "provider": provider,
                "provider_email": provider_email,
                "scopes": scopes,
                "encrypted_access_token": encrypted_access_token,
                "encrypted_refresh_token": refresh_to_store,
                "token_expires_at": token_expires_at or None,
                "status": status,
                "last_error": last_error,
                "connected_at": existing.get("connected_at") if existing else now,
                "updated_at": now,
            }
            res = self.sb.table("connected_accounts").upsert(payload, on_conflict="user_id,provider").execute()
            return res.data[0] if res.data else payload

        conn = get_sqlite_conn()
        acc_id = existing["id"] if existing else new_uuid()
        connected_at = existing.get("connected_at") if existing else now
        conn.execute(
            """INSERT INTO connected_accounts
               (id, user_id, provider, provider_email, scopes, encrypted_access_token,
                encrypted_refresh_token, token_expires_at, status, last_error, connected_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, provider) DO UPDATE SET
                 provider_email=excluded.provider_email,
                 scopes=excluded.scopes,
                 encrypted_access_token=excluded.encrypted_access_token,
                 encrypted_refresh_token=excluded.encrypted_refresh_token,
                 token_expires_at=excluded.token_expires_at,
                 status=excluded.status,
                 last_error=excluded.last_error,
                 updated_at=excluded.updated_at""",
            (
                acc_id,
                user_id,
                provider,
                provider_email,
                json.dumps(scopes),
                encrypted_access_token,
                refresh_to_store,
                token_expires_at,
                status,
                last_error,
                connected_at,
                now,
            ),
        )
        conn.commit()
        return self.get_connected_account(user_id, provider) or {}

    def get_connected_account(self, user_id: str, provider: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = (
                self.sb.table("connected_accounts")
                .select("*")
                .eq("user_id", user_id)
                .eq("provider", provider)
                .execute()
            )
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        row = conn.execute(
            "SELECT * FROM connected_accounts WHERE user_id = ? AND provider = ?",
            (user_id, provider),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["scopes"] = _safe_json_loads(d.get("scopes"), [])
        return d

    def delete_connected_account(self, user_id: str, provider: str) -> None:
        if self.sb:
            self.sb.table("connected_accounts").delete().eq("user_id", user_id).eq("provider", provider).execute()
            self.sb.table("email_sync_state").delete().eq("user_id", user_id).eq("provider", provider).execute()
            return
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM connected_accounts WHERE user_id = ? AND provider = ?", (user_id, provider))
        conn.execute("DELETE FROM email_sync_state WHERE user_id = ? AND provider = ?", (user_id, provider))
        conn.commit()

    def get_sync_state(self, user_id: str, provider: str = "gmail") -> Dict[str, Any]:
        if self.sb:
            res = self.sb.table("email_sync_state").select("*").eq("user_id", user_id).eq("provider", provider).execute()
            return res.data[0] if res.data else {"history_id": "", "sync_status": "idle", "messages_synced": 0, "last_sync_at": ""}
        conn = get_sqlite_conn()
        row = conn.execute(
            "SELECT * FROM email_sync_state WHERE user_id = ? AND provider = ?", (user_id, provider)
        ).fetchone()
        return dict(row) if row else {"history_id": "", "sync_status": "idle", "messages_synced": 0, "last_sync_at": ""}

    def upsert_sync_state(
        self,
        user_id: str,
        provider: str,
        history_id: str,
        sync_status: str,
        messages_synced: int,
        last_error: str = "",
    ) -> None:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        if self.sb:
            self.sb.table("email_sync_state").upsert(
                {
                    "id": new_uuid(),
                    "user_id": user_id,
                    "provider": provider,
                    "history_id": history_id,
                    "last_sync_at": now,
                    "sync_status": sync_status,
                    "messages_synced": messages_synced,
                    "last_error": last_error,
                    "updated_at": now,
                },
                on_conflict="user_id,provider",
            ).execute()
            return
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO email_sync_state
               (id, user_id, provider, history_id, last_sync_at, sync_status, messages_synced, last_error, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, provider) DO UPDATE SET
                 history_id=CASE WHEN excluded.history_id <> '' THEN excluded.history_id ELSE email_sync_state.history_id END,
                 last_sync_at=excluded.last_sync_at,
                 sync_status=excluded.sync_status,
                 messages_synced=excluded.messages_synced,
                 last_error=excluded.last_error,
                 updated_at=excluded.updated_at""",
            (new_uuid(), user_id, provider, history_id, now, sync_status, messages_synced, last_error, now),
        )
        conn.commit()

    # ------------------------------------------------------------------
    # Storage (Supabase Bucket + Local Fallback)
    # ------------------------------------------------------------------
    def store_uploaded_bytes(self, user_id: str, filename: str, content: bytes, mime_type: str) -> str:
        safe_name = f"{new_uuid()}_{Path(filename).name}"
        storage_path = f"{user_id}/{safe_name}"
        if self.sb:
            try:
                self.sb.storage.from_(self.settings.supabase_storage_bucket).upload(
                    path=storage_path,
                    file=content,
                    file_options={"content-type": mime_type or "application/octet-stream"},
                )
                return storage_path
            except Exception:
                pass
        dest = LOCAL_STORAGE_DIR / user_id
        dest.mkdir(parents=True, exist_ok=True)
        (dest / safe_name).write_bytes(content)
        return storage_path

    # ------------------------------------------------------------------
    # Sources
    # ------------------------------------------------------------------
    def create_source(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        src_id = data.get("id") or new_uuid()
        record = {
            "id": src_id,
            "user_id": user_id,
            "external_ref": data.get("external_ref", ""),
            "name": data["name"],
            "source_type": data["source_type"],
            "storage_path": data.get("storage_path", ""),
            "mime_type": data.get("mime_type", ""),
            "size_bytes": int(data.get("size_bytes", 0)),
            "processing_status": data.get("processing_status", "Uploaded"),
            "record_count": int(data.get("record_count", 1)),
            "extracted_memories_count": int(data.get("extracted_memories_count", 0)),
            "authority_basis": data.get("authority_basis", ""),
            "verification_state": data.get("verification_state", "Direct Source"),
            "ai_summary": data.get("ai_summary", ""),
            "ocr_text": data.get("ocr_text", ""),
            "transcript": data.get("transcript", ""),
            "visible_text": data.get("visible_text", ""),
            "structured_details": data.get("structured_details", {}),
            "timestamps_json": data.get("timestamps_json", []),
            "data_origin": data.get("data_origin", "Live"),
            "error_message": data.get("error_message", ""),
            "created_at": now,
            "updated_at": now,
        }
        if self.sb:
            res = self.sb.table("sources").insert(record).execute()
            return res.data[0] if res.data else record
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO sources (
                id, user_id, external_ref, name, source_type, storage_path, mime_type, size_bytes,
                processing_status, record_count, extracted_memories_count, authority_basis,
                verification_state, ai_summary, ocr_text, transcript, visible_text,
                structured_details, timestamps_json, data_origin, error_message, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                record["id"],
                user_id,
                record["external_ref"],
                record["name"],
                record["source_type"],
                record["storage_path"],
                record["mime_type"],
                record["size_bytes"],
                record["processing_status"],
                record["record_count"],
                record["extracted_memories_count"],
                record["authority_basis"],
                record["verification_state"],
                record["ai_summary"],
                record["ocr_text"],
                record["transcript"],
                record["visible_text"],
                json.dumps(record["structured_details"]),
                json.dumps(record["timestamps_json"]),
                record["data_origin"],
                record["error_message"],
                now,
                now,
            ),
        )
        conn.commit()
        return record

    def update_source(self, user_id: str, source_id: str, patch: Dict[str, Any]) -> None:
        now = utcnow_iso()
        if self.sb:
            self.sb.table("sources").update({**patch, "updated_at": now}).eq("id", source_id).eq("user_id", user_id).execute()
            return
        conn = get_sqlite_conn()
        for k, v in patch.items():
            val = json.dumps(v) if k in ("structured_details", "timestamps_json") else v
            conn.execute(f"UPDATE sources SET {k} = ?, updated_at = ? WHERE id = ? AND user_id = ?", (val, now, source_id, user_id))
        conn.commit()

    def list_sources(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("sources").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            return res.data or []
        conn = get_sqlite_conn()
        rows = conn.execute(
            "SELECT * FROM sources WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (user_id, limit, offset),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["structured_details"] = _safe_json_loads(d.get("structured_details"), {})
            d["timestamps_json"] = _safe_json_loads(d.get("timestamps_json"), [])
            out.append(d)
        return out

    def get_source(self, user_id: str, source_id: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("sources").select("*").eq("id", source_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM sources WHERE id = ? AND user_id = ?", (source_id, user_id)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["structured_details"] = _safe_json_loads(d.get("structured_details"), {})
        d["timestamps_json"] = _safe_json_loads(d.get("timestamps_json"), [])
        return d

    def delete_source(self, user_id: str, source_id: str) -> None:
        if self.sb:
            self.sb.table("sources").delete().eq("id", source_id).eq("user_id", user_id).execute()
            return
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM sources WHERE id = ? AND user_id = ?", (source_id, user_id))
        conn.commit()

    # ------------------------------------------------------------------
    # Emails
    # ------------------------------------------------------------------
    def list_existing_gmail_ids(self, user_id: str) -> List[str]:
        if self.sb:
            res = self.sb.table("emails").select("gmail_message_id").eq("user_id", user_id).execute()
            return [r["gmail_message_id"] for r in (res.data or [])]
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT gmail_message_id FROM emails WHERE user_id = ?", (user_id,)).fetchall()
        return [r["gmail_message_id"] for r in rows]

    def upsert_email(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        email_id = data.get("id") or new_uuid()
        record = {
            "id": email_id,
            "user_id": user_id,
            "source_id": data.get("source_id") or None,
            "gmail_message_id": data["gmail_message_id"],
            "thread_id": data.get("thread_id", data["gmail_message_id"]),
            "sender_name": data.get("sender_name", ""),
            "sender_email": data.get("sender_email", ""),
            "recipients": data.get("recipients", ""),
            "subject": data.get("subject", "(No Subject)"),
            "snippet": data.get("snippet", ""),
            "short_summary": data.get("short_summary", ""),
            "body_text": data.get("body_text", ""),
            "labels": data.get("labels", []),
            "attachments_metadata": data.get("attachments_metadata", []),
            "gmail_url": data.get("gmail_url", ""),
            "received_at": data.get("received_at", now),
            "importance_score": int(data.get("importance_score", 50)),
            "importance_category": data.get("importance_category", "Medium"),
            "urgency": data.get("urgency", "Low"),
            "importance_reason": data.get("importance_reason", ""),
            "action_required": data.get("action_required", ""),
            "requires_reply": bool(data.get("requires_reply", False)),
            "user_corrected_importance": bool(data.get("user_corrected_importance", False)),
            "detected_deadline": data.get("detected_deadline") or None,
            "data_origin": data.get("data_origin", "Live"),
            "created_at": now,
        }
        if self.sb:
            res = self.sb.table("emails").upsert(record, on_conflict="user_id,gmail_message_id").execute()
            return res.data[0] if res.data else record
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO emails (
                id, user_id, source_id, gmail_message_id, thread_id, sender_name, sender_email,
                recipients, subject, snippet, short_summary, body_text, labels, attachments_metadata,
                gmail_url, received_at, importance_score, importance_category, urgency,
                importance_reason, action_required, requires_reply, user_corrected_importance,
                detected_deadline, data_origin, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, gmail_message_id) DO UPDATE SET
                importance_score=excluded.importance_score,
                importance_category=excluded.importance_category,
                urgency=excluded.urgency,
                importance_reason=excluded.importance_reason,
                short_summary=excluded.short_summary,
                action_required=excluded.action_required""",
            (
                record["id"],
                user_id,
                record["source_id"] or "",
                record["gmail_message_id"],
                record["thread_id"],
                record["sender_name"],
                record["sender_email"],
                record["recipients"],
                record["subject"],
                record["snippet"],
                record["short_summary"],
                record["body_text"],
                json.dumps(record["labels"]),
                json.dumps(record["attachments_metadata"]),
                record["gmail_url"],
                record["received_at"],
                record["importance_score"],
                record["importance_category"],
                record["urgency"],
                record["importance_reason"],
                record["action_required"],
                int(record["requires_reply"]),
                int(record["user_corrected_importance"]),
                record["detected_deadline"] or "",
                record["data_origin"],
                now,
            ),
        )
        conn.commit()
        return record

    def list_emails(self, user_id: str, min_importance: int = 0, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        if self.sb:
            q = self.sb.table("emails").select("*").eq("user_id", user_id)
            if min_importance > 0:
                q = q.gte("importance_score", min_importance)
            res = q.order("received_at", desc=True).range(offset, offset + limit - 1).execute()
            return res.data or []
        conn = get_sqlite_conn()
        rows = conn.execute(
            "SELECT * FROM emails WHERE user_id = ? AND importance_score >= ? ORDER BY received_at DESC LIMIT ? OFFSET ?",
            (user_id, min_importance, limit, offset),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["labels"] = _safe_json_loads(d.get("labels"), [])
            d["attachments_metadata"] = _safe_json_loads(d.get("attachments_metadata"), [])
            d["requires_reply"] = bool(d.get("requires_reply", 0))
            d["user_corrected_importance"] = bool(d.get("user_corrected_importance", 0))
            out.append(d)
        return out

    def get_email(self, user_id: str, email_id: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("emails").select("*").eq("user_id", user_id).eq("id", email_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM emails WHERE user_id = ? AND id = ?", (user_id, email_id)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["labels"] = _safe_json_loads(d.get("labels"), [])
        d["attachments_metadata"] = _safe_json_loads(d.get("attachments_metadata"), [])
        d["requires_reply"] = bool(d.get("requires_reply", 0))
        d["user_corrected_importance"] = bool(d.get("user_corrected_importance", 0))
        return d

    def update_email_importance(self, user_id: str, email_id: str, score: int, category: str, reason: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = (
                self.sb.table("emails")
                .update(
                    {
                        "importance_score": score,
                        "importance_category": category,
                        "importance_reason": reason,
                        "user_corrected_importance": True,
                    }
                )
                .eq("user_id", user_id)
                .eq("id", email_id)
                .execute()
            )
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        conn.execute(
            """UPDATE emails SET importance_score = ?, importance_category = ?, importance_reason = ?, user_corrected_importance = 1
               WHERE user_id = ? AND id = ?""",
            (score, category, reason, user_id, email_id),
        )
        conn.commit()
        return self.get_email(user_id, email_id)

    # ------------------------------------------------------------------
    # Memories, Versions (Memory DNA), Evidence, Entities, Relationships
    # ------------------------------------------------------------------
    def create_memory(self, user_id: str, data: Dict[str, Any], embedding: Optional[List[float]] = None) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        mem_id = data.get("id") or new_uuid()
        record = {
            "id": mem_id,
            "user_id": user_id,
            "source_id": data.get("source_id") or None,
            "title": data["title"],
            "description": data.get("description", ""),
            "current_information": data["current_information"],
            "category": data.get("category", "Important conversations"),
            "workspace": data.get("workspace", "all"),
            "event_time": data.get("event_time", now[:10]),
            "recorded_time": data.get("recorded_time", now[:16].replace("T", " ")),
            "source_name": data.get("source_name", ""),
            "source_type": data.get("source_type", "Text File"),
            "confidence": data.get("confidence", "Medium"),
            "verification_status": data.get("verification_status", "Verified"),
            "importance_score": int(data.get("importance_score", 60)),
            "importance_category": data.get("importance_category", "Medium"),
            "urgency": data.get("urgency", "Medium"),
            "importance_reason": data.get("importance_reason", ""),
            "action_required": data.get("action_required", ""),
            "page_or_timestamp_ref": data.get("page_or_timestamp_ref", ""),
            "user_notes": data.get("user_notes", []),
            "data_origin": data.get("data_origin", "Live"),
            "created_at": now,
            "updated_at": now,
        }
        if self.sb:
            sb_payload = {**record}
            if embedding:
                sb_payload["embedding"] = embedding
            res = self.sb.table("memories").insert(sb_payload).execute()
            return res.data[0] if res.data else record
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO memories (
                id, user_id, source_id, title, description, current_information, category, workspace,
                event_time, recorded_time, source_name, source_type, confidence, verification_status,
                importance_score, importance_category, urgency, importance_reason, action_required,
                page_or_timestamp_ref, user_notes, embedding, data_origin, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                record["id"],
                user_id,
                record["source_id"] or "",
                record["title"],
                record["description"],
                record["current_information"],
                record["category"],
                record["workspace"],
                record["event_time"],
                record["recorded_time"],
                record["source_name"],
                record["source_type"],
                record["confidence"],
                record["verification_status"],
                record["importance_score"],
                record["importance_category"],
                record["urgency"],
                record["importance_reason"],
                record["action_required"],
                record["page_or_timestamp_ref"],
                json.dumps(record["user_notes"]),
                json.dumps(embedding) if embedding else "",
                record["data_origin"],
                now,
                now,
            ),
        )
        conn.commit()
        return record

    def add_memory_version(self, user_id: str, memory_id: str, version_data: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        ver_id = new_uuid()
        payload = {
            "id": ver_id,
            "user_id": user_id,
            "memory_id": memory_id,
            "version_number": int(version_data.get("version_number", 1)),
            "summary": version_data.get("summary", "Captured"),
            "value_text": version_data["value_text"],
            "event_time": version_data.get("event_time", ""),
            "recorded_time": version_data.get("recorded_time", now[:16].replace("T", " ")),
            "source_name": version_data.get("source_name", ""),
            "changed_by": version_data.get("changed_by", "LIVING MEMORY AI"),
            "reason": version_data.get("reason", ""),
            "status": version_data.get("status", "Active"),
            "created_at": now,
        }
        if self.sb:
            if payload["status"] in ("Active", "Corrected"):
                self.sb.table("memory_versions").update({"status": "Superseded"}).eq("memory_id", memory_id).eq("user_id", user_id).eq("status", "Active").execute()
            res = self.sb.table("memory_versions").insert(payload).execute()
            return res.data[0] if res.data else payload
        conn = get_sqlite_conn()
        if payload["status"] in ("Active", "Corrected"):
            conn.execute(
                "UPDATE memory_versions SET status = 'Superseded' WHERE memory_id = ? AND user_id = ? AND status = 'Active'",
                (memory_id, user_id),
            )
        conn.execute(
            """INSERT INTO memory_versions
               (id, user_id, memory_id, version_number, summary, value_text, event_time, recorded_time,
                source_name, changed_by, reason, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"],
                user_id,
                memory_id,
                payload["version_number"],
                payload["summary"],
                payload["value_text"],
                payload["event_time"],
                payload["recorded_time"],
                payload["source_name"],
                payload["changed_by"],
                payload["reason"],
                payload["status"],
                now,
            ),
        )
        conn.commit()
        return payload

    def add_evidence(self, user_id: str, memory_id: str, ev: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        ev_id = new_uuid()
        payload = {
            "id": ev_id,
            "user_id": user_id,
            "memory_id": memory_id,
            "source_id": ev.get("source_id") or None,
            "source_name": ev["source_name"],
            "source_type": ev["source_type"],
            "external_ref": ev.get("external_ref", ""),
            "excerpt": ev["excerpt"],
            "event_time": ev.get("event_time", ""),
            "recorded_time": ev.get("recorded_time", now[:16].replace("T", " ")),
            "author": ev.get("author", ""),
            "page_or_timestamp_ref": ev.get("page_or_timestamp_ref", ""),
            "created_at": now,
        }
        if self.sb:
            res = self.sb.table("evidence").insert(payload).execute()
            return res.data[0] if res.data else payload
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO evidence
               (id, user_id, memory_id, source_id, source_name, source_type, external_ref,
                excerpt, event_time, recorded_time, author, page_or_timestamp_ref, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"],
                user_id,
                memory_id,
                payload["source_id"] or "",
                payload["source_name"],
                payload["source_type"],
                payload["external_ref"],
                payload["excerpt"],
                payload["event_time"],
                payload["recorded_time"],
                payload["author"],
                payload["page_or_timestamp_ref"],
                now,
            ),
        )
        conn.commit()
        return payload

    def list_memories(self, user_id: str, category: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        if self.sb:
            q = self.sb.table("memories").select("*, memory_versions(*), evidence(*)").eq("user_id", user_id)
            if category and category != "All":
                q = q.eq("category", category)
            res = q.order("importance_score", desc=True).range(offset, offset + limit - 1).execute()
            out = []
            for row in (res.data or []):
                item = {**row}
                if "memory_versions" in item and "versions" not in item:
                    item["versions"] = sorted(item.pop("memory_versions") or [], key=lambda x: x.get("version_number", 1))
                out.append(item)
            return out
        conn = get_sqlite_conn()
        if category and category != "All":
            rows = conn.execute(
                "SELECT * FROM memories WHERE user_id = ? AND category = ? ORDER BY importance_score DESC, created_at DESC LIMIT ? OFFSET ?",
                (user_id, category, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM memories WHERE user_id = ? ORDER BY importance_score DESC, created_at DESC LIMIT ? OFFSET ?",
                (user_id, limit, offset),
            ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["user_notes"] = _safe_json_loads(d.get("user_notes"), [])
            d.pop("embedding", None)
            vers = conn.execute(
                "SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY version_number ASC",
                (d["id"],),
            ).fetchall()
            evs = conn.execute("SELECT * FROM evidence WHERE memory_id = ?", (d["id"],)).fetchall()
            d["versions"] = [dict(v) for v in vers]
            d["evidence"] = [dict(e) for e in evs]
            out.append(d)
        return out

    def get_memory(self, user_id: str, memory_id: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("memories").select("*, memory_versions(*), evidence(*)").eq("user_id", user_id).eq("id", memory_id).execute()
            if not res.data:
                return None
            item = {**res.data[0]}
            if "memory_versions" in item and "versions" not in item:
                item["versions"] = sorted(item.pop("memory_versions") or [], key=lambda x: x.get("version_number", 1))
            return item
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM memories WHERE user_id = ? AND id = ?", (user_id, memory_id)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["user_notes"] = _safe_json_loads(d.get("user_notes"), [])
        d.pop("embedding", None)
        d["versions"] = [dict(v) for v in conn.execute("SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY version_number ASC", (memory_id,)).fetchall()]
        d["evidence"] = [dict(e) for e in conn.execute("SELECT * FROM evidence WHERE memory_id = ?", (memory_id,)).fetchall()]
        return d

    def update_memory_record(self, user_id: str, memory_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = utcnow_iso()
        if self.sb:
            self.sb.table("memories").update({**patch, "updated_at": now}).eq("user_id", user_id).eq("id", memory_id).execute()
            return self.get_memory(user_id, memory_id)
        conn = get_sqlite_conn()
        for k, v in patch.items():
            val = json.dumps(v) if k == "user_notes" else v
            conn.execute(f"UPDATE memories SET {k} = ?, updated_at = ? WHERE user_id = ? AND id = ?", (val, now, user_id, memory_id))
        conn.commit()
        return self.get_memory(user_id, memory_id)

    def delete_memory(self, user_id: str, memory_id: str) -> bool:
        if self.sb:
            self.sb.table("evidence").delete().eq("user_id", user_id).eq("memory_id", memory_id).execute()
            self.sb.table("memory_versions").delete().eq("user_id", user_id).eq("memory_id", memory_id).execute()
            self.sb.table("memories").delete().eq("user_id", user_id).eq("id", memory_id).execute()
            return True
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM evidence WHERE user_id = ? AND memory_id = ?", (user_id, memory_id))
        conn.execute("DELETE FROM memory_versions WHERE user_id = ? AND memory_id = ?", (user_id, memory_id))
        cur = conn.execute("DELETE FROM memories WHERE user_id = ? AND id = ?", (user_id, memory_id))
        conn.commit()
        return cur.rowcount > 0

    def semantic_search_memories(self, user_id: str, query_embedding: List[float], top_k: int = 8) -> List[Dict[str, Any]]:
        if self.sb and query_embedding:
            try:
                res = self.sb.rpc(
                    "match_memories",
                    {
                        "query_embedding": query_embedding,
                        "match_user_id": user_id,
                        "match_threshold": 0.4,
                        "match_count": top_k,
                    },
                ).execute()
                return res.data or []
            except Exception:
                pass
        conn = get_sqlite_conn()
        rows = conn.execute(
            "SELECT * FROM memories WHERE user_id = ? AND verification_status <> 'Archived'",
            (user_id,),
        ).fetchall()
        scored = []
        for r in rows:
            d = dict(r)
            emb = _safe_json_loads(d.pop("embedding", ""), [])
            sim = _cosine_similarity(query_embedding, emb) if (query_embedding and emb) else 0.0
            d["similarity"] = sim
            scored.append(d)
        scored.sort(key=lambda x: (x["similarity"], x.get("importance_score", 0)), reverse=True)
        return scored[:top_k]

    def upsert_entity(self, user_id: str, entity_type: str, name: str, role: str = "", organization: str = "") -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        norm = name.strip().lower()
        now = utcnow_iso()
        if self.sb:
            res = self.sb.table("entities").upsert(
                {
                    "id": new_uuid(),
                    "user_id": user_id,
                    "entity_type": entity_type,
                    "name": name.strip(),
                    "normalized_name": norm,
                    "role": role,
                    "organization": organization,
                    "created_at": now,
                },
                on_conflict="user_id,entity_type,normalized_name",
            ).execute()
            return res.data[0] if res.data else {"name": name, "entity_type": entity_type}
        conn = get_sqlite_conn()
        ent_id = new_uuid()
        conn.execute(
            """INSERT INTO entities (id, user_id, entity_type, name, normalized_name, role, organization, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?)
               ON CONFLICT(user_id, entity_type, normalized_name) DO UPDATE SET
                 role=CASE WHEN excluded.role <> '' THEN excluded.role ELSE entities.role END""",
            (ent_id, user_id, entity_type, name.strip(), norm, role, organization, now),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM entities WHERE user_id = ? AND entity_type = ? AND normalized_name = ?",
            (user_id, entity_type, norm),
        ).fetchone()
        return dict(row) if row else {"id": ent_id, "name": name, "entity_type": entity_type}

    def list_entities(self, user_id: str) -> List[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("entities").select("*").eq("user_id", user_id).execute()
            return res.data or []
        conn = get_sqlite_conn()
        return [dict(r) for r in conn.execute("SELECT * FROM entities WHERE user_id = ?", (user_id,)).fetchall()]

    def add_relationship(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        rel = {
            "id": new_uuid(),
            "user_id": user_id,
            "from_entity_id": payload.get("from_entity_id") or None,
            "to_entity_id": payload.get("to_entity_id") or None,
            "from_memory_id": payload.get("from_memory_id") or None,
            "to_memory_id": payload.get("to_memory_id") or None,
            "relation_type": payload["relation_type"],
            "confidence": float(payload.get("confidence", 0.85)),
            "evidence_summary": payload.get("evidence_summary", ""),
            "created_at": now,
        }
        if self.sb:
            res = self.sb.table("relationships").insert(rel).execute()
            return res.data[0] if res.data else rel
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO relationships
               (id, user_id, from_entity_id, to_entity_id, from_memory_id, to_memory_id, relation_type, confidence, evidence_summary, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rel["id"],
                user_id,
                rel["from_entity_id"] or "",
                rel["to_entity_id"] or "",
                rel["from_memory_id"] or "",
                rel["to_memory_id"] or "",
                rel["relation_type"],
                rel["confidence"],
                rel["evidence_summary"],
                now,
            ),
        )
        conn.commit()
        return rel

    def list_relationships(self, user_id: str) -> List[Dict[str, Any]]:
        if self.sb:
            return self.sb.table("relationships").select("*").eq("user_id", user_id).execute().data or []
        conn = get_sqlite_conn()
        return [dict(r) for r in conn.execute("SELECT * FROM relationships WHERE user_id = ?", (user_id,)).fetchall()]

    # ------------------------------------------------------------------
    # Deadlines, Commitments, Decisions, Conflicts, Notifications, Jobs
    # ------------------------------------------------------------------
    def create_deadline(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        dl_id = data.get("id") or new_uuid()
        payload = {
            "id": dl_id,
            "user_id": user_id,
            "memory_id": data.get("memory_id") or None,
            "source_id": data.get("source_id") or None,
            "title": data["title"],
            "due_date": data.get("due_date") or None,
            "due_time": data.get("due_time", "23:59"),
            "timezone": data.get("timezone", "UTC"),
            "source_name": data.get("source_name", ""),
            "source_type": data.get("source_type", "Text File"),
            "origin_kind": data.get("origin_kind", "AI-Extracted"),
            "importance_score": int(data.get("importance_score", 75)),
            "importance_category": data.get("importance_category", "High"),
            "urgency": data.get("urgency", "Medium"),
            "status": data.get("status", "Pending"),
            "supporting_evidence": data.get("supporting_evidence", ""),
            "confidence": data.get("confidence", "Medium"),
            "is_explicit": bool(data.get("is_explicit", True)),
            "needs_confirmation": bool(data.get("needs_confirmation", False)),
            "confirmation_prompt": data.get("confirmation_prompt", ""),
            "related_task": data.get("related_task", ""),
            "history_json": data.get("history_json", []),
            "data_origin": data.get("data_origin", "Live"),
            "created_at": now,
            "updated_at": now,
        }
        if self.sb:
            res = self.sb.table("deadlines").insert(payload).execute()
            return res.data[0] if res.data else payload
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO deadlines (
                id, user_id, memory_id, source_id, title, due_date, due_time, timezone,
                source_name, source_type, origin_kind, importance_score, importance_category,
                urgency, status, supporting_evidence, confidence, is_explicit, needs_confirmation,
                confirmation_prompt, related_task, history_json, data_origin, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"],
                user_id,
                payload["memory_id"] or "",
                payload["source_id"] or "",
                payload["title"],
                payload["due_date"] or "",
                payload["due_time"],
                payload["timezone"],
                payload["source_name"],
                payload["source_type"],
                payload["origin_kind"],
                payload["importance_score"],
                payload["importance_category"],
                payload["urgency"],
                payload["status"],
                payload["supporting_evidence"],
                payload["confidence"],
                int(payload["is_explicit"]),
                int(payload["needs_confirmation"]),
                payload["confirmation_prompt"],
                payload["related_task"],
                json.dumps(payload["history_json"]),
                payload["data_origin"],
                now,
                now,
            ),
        )
        conn.commit()
        return payload

    def list_deadlines(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("deadlines").select("*").eq("user_id", user_id).order("due_date").limit(limit).execute()
            return res.data or []
        conn = get_sqlite_conn()
        rows = conn.execute(
            "SELECT * FROM deadlines WHERE user_id = ? ORDER BY due_date ASC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["is_explicit"] = bool(d.get("is_explicit", 1))
            d["needs_confirmation"] = bool(d.get("needs_confirmation", 0))
            d["history_json"] = _safe_json_loads(d.get("history_json"), [])
            out.append(d)
        return out

    def get_deadline(self, user_id: str, deadline_id: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("deadlines").select("*").eq("user_id", user_id).eq("id", deadline_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM deadlines WHERE user_id = ? AND id = ?", (user_id, deadline_id)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["is_explicit"] = bool(d.get("is_explicit", 1))
        d["needs_confirmation"] = bool(d.get("needs_confirmation", 0))
        d["history_json"] = _safe_json_loads(d.get("history_json"), [])
        return d

    def update_deadline(self, user_id: str, deadline_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = utcnow_iso()
        if self.sb:
            res = self.sb.table("deadlines").update({**patch, "updated_at": now}).eq("user_id", user_id).eq("id", deadline_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        for k, v in patch.items():
            val = json.dumps(v) if k == "history_json" else (int(bool(v)) if k in ("is_explicit", "needs_confirmation") else v)
            conn.execute(f"UPDATE deadlines SET {k} = ?, updated_at = ? WHERE user_id = ? AND id = ?", (val, now, user_id, deadline_id))
        conn.commit()
        return self.get_deadline(user_id, deadline_id)

    def create_commitment(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        payload = {
            "id": new_uuid(),
            "user_id": user_id,
            "memory_id": data.get("memory_id") or None,
            "title": data["title"],
            "owner": data.get("owner", ""),
            "counterparty": data.get("counterparty", ""),
            "due_date": data.get("due_date", ""),
            "statement": data["statement"],
            "status": data.get("status", "Pending"),
            "source_name": data.get("source_name", ""),
            "follow_up_history": data.get("follow_up_history", []),
            "created_at": now,
        }
        if self.sb:
            return self.sb.table("commitments").insert(payload).execute().data[0]
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO commitments (id, user_id, memory_id, title, owner, counterparty, due_date, statement, status, source_name, follow_up_history, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"], user_id, payload["memory_id"] or "", payload["title"], payload["owner"],
                payload["counterparty"], payload["due_date"], payload["statement"], payload["status"],
                payload["source_name"], json.dumps(payload["follow_up_history"]), now,
            ),
        )
        conn.commit()
        return payload

    def list_commitments(self, user_id: str) -> List[Dict[str, Any]]:
        if self.sb:
            return self.sb.table("commitments").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data or []
        conn = get_sqlite_conn()
        out = []
        for r in conn.execute("SELECT * FROM commitments WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall():
            d = dict(r)
            d["follow_up_history"] = _safe_json_loads(d.get("follow_up_history"), [])
            out.append(d)
        return out

    def create_decision(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        payload = {
            "id": new_uuid(),
            "user_id": user_id,
            "memory_id": data.get("memory_id") or None,
            "title": data["title"],
            "decision_date": data.get("decision_date", now[:10]),
            "final_choice": data["final_choice"],
            "alternatives": data.get("alternatives", []),
            "reasoning": data.get("reasoning", ""),
            "outcomes": data.get("outcomes", ""),
            "source_name": data.get("source_name", ""),
            "created_at": now,
        }
        if self.sb:
            return self.sb.table("decisions").insert(payload).execute().data[0]
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO decisions (id, user_id, memory_id, title, decision_date, final_choice, alternatives, reasoning, outcomes, source_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"], user_id, payload["memory_id"] or "", payload["title"], payload["decision_date"],
                payload["final_choice"], json.dumps(payload["alternatives"]), payload["reasoning"], payload["outcomes"],
                payload["source_name"], now,
            ),
        )
        conn.commit()
        return payload

    def list_decisions(self, user_id: str) -> List[Dict[str, Any]]:
        if self.sb:
            return self.sb.table("decisions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data or []
        conn = get_sqlite_conn()
        out = []
        for r in conn.execute("SELECT * FROM decisions WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall():
            d = dict(r)
            d["alternatives"] = _safe_json_loads(d.get("alternatives"), [])
            out.append(d)
        return out

    def create_conflict(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        payload = {
            "id": new_uuid(),
            "user_id": user_id,
            "memory_id": data.get("memory_id") or None,
            "title": data["title"],
            "conflict_type": data.get("conflict_type", "Schedule & Deadline Conflict"),
            "severity": data.get("severity", "High"),
            "status": data.get("status", "Unresolved"),
            "claims_json": data.get("claims_json", []),
            "suggested_resolution": data.get("suggested_resolution", ""),
            "detected_at": now,
        }
        if self.sb:
            return self.sb.table("conflicts").insert(payload).execute().data[0]
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO conflicts (id, user_id, memory_id, title, conflict_type, severity, status, claims_json, suggested_resolution, detected_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload["id"], user_id, payload["memory_id"] or "", payload["title"], payload["conflict_type"],
                payload["severity"], payload["status"], json.dumps(payload["claims_json"]), payload["suggested_resolution"], now,
            ),
        )
        conn.commit()
        return payload

    def list_conflicts(self, user_id: str) -> List[Dict[str, Any]]:
        if self.sb:
            return self.sb.table("conflicts").select("*").eq("user_id", user_id).order("detected_at", desc=True).execute().data or []
        conn = get_sqlite_conn()
        out = []
        for r in conn.execute("SELECT * FROM conflicts WHERE user_id = ? ORDER BY detected_at DESC", (user_id,)).fetchall():
            d = dict(r)
            d["claims_json"] = _safe_json_loads(d.get("claims_json"), [])
            out.append(d)
        return out

    def resolve_conflict(self, user_id: str, conflict_id: str, status: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("conflicts").update({"status": status}).eq("user_id", user_id).eq("id", conflict_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        conn.execute("UPDATE conflicts SET status = ? WHERE user_id = ? AND id = ?", (status, user_id, conflict_id))
        conn.commit()
        row = conn.execute("SELECT * FROM conflicts WHERE user_id = ? AND id = ?", (user_id, conflict_id)).fetchone()
        return dict(row) if row else None

    def create_notification(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        payload = {
            "id": new_uuid(),
            "user_id": user_id,
            "memory_id": data.get("memory_id") or None,
            "title": data["title"],
            "message": data["message"],
            "category": data.get("category", "Important"),
            "read": False,
            "source_ref": data.get("source_ref", ""),
            "action_route": data.get("action_route", "/dashboard"),
            "created_at": now,
        }
        if self.sb:
            return self.sb.table("notifications").insert(payload).execute().data[0]
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO notifications (id, user_id, memory_id, title, message, category, read, source_ref, action_route, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
            (
                payload["id"], user_id, payload["memory_id"] or "", payload["title"], payload["message"],
                payload["category"], payload["source_ref"], payload["action_route"], now,
            ),
        )
        conn.commit()
        return payload

    def list_notifications(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if self.sb:
            return self.sb.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute().data or []
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
        return [{**dict(r), "read": bool(r["read"])} for r in rows]

    def mark_notification_read(self, user_id: str, notif_id: Optional[str] = None) -> None:
        if self.sb:
            q = self.sb.table("notifications").update({"read": True}).eq("user_id", user_id)
            if notif_id:
                q = q.eq("id", notif_id)
            q.execute()
            return
        conn = get_sqlite_conn()
        if notif_id:
            conn.execute("UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?", (user_id, notif_id))
        else:
            conn.execute("UPDATE notifications SET read = 1 WHERE user_id = ?", (user_id,))
        conn.commit()

    def delete_notification(self, user_id: str, notif_id: Optional[str] = None) -> None:
        if self.sb:
            q = self.sb.table("notifications").delete().eq("user_id", user_id)
            if notif_id:
                q = q.eq("id", notif_id)
            q.execute()
            return
        conn = get_sqlite_conn()
        if notif_id:
            conn.execute("DELETE FROM notifications WHERE user_id = ? AND id = ?", (user_id, notif_id))
        else:
            conn.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
        conn.commit()

    def create_job(self, user_id: str, title: str, kind: str, message: str = "Uploaded and queued") -> Dict[str, Any]:
        self.ensure_profile(user_id, "", "Alex")
        now = utcnow_iso()
        job_id = new_uuid()
        payload = {
            "id": job_id,
            "user_id": user_id,
            "title": title,
            "kind": kind,
            "status": "Uploaded",
            "progress": 5,
            "message": message,
            "result_json": None,
            "error_text": "",
            "created_at": now,
            "updated_at": now,
        }
        if self.sb:
            self.sb.table("processing_jobs").insert(payload).execute()
            return payload
        conn = get_sqlite_conn()
        conn.execute(
            """INSERT INTO processing_jobs (id, user_id, title, kind, status, progress, message, result_json, error_text, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, '', '', ?, ?)""",
            (job_id, user_id, title, kind, "Uploaded", 5, message, now, now),
        )
        conn.commit()
        return payload

    def update_job(self, user_id: str, job_id: str, **patch: Any) -> Optional[Dict[str, Any]]:
        now = utcnow_iso()
        if self.sb:
            sb_patch = {**patch, "updated_at": now}
            if "result" in sb_patch:
                sb_patch["result_json"] = sb_patch.pop("result")
            if "error" in sb_patch:
                sb_patch["error_text"] = sb_patch.pop("error")
            res = self.sb.table("processing_jobs").update(sb_patch).eq("id", job_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        conn = get_sqlite_conn()
        for k, v in patch.items():
            col = "result_json" if k == "result" else ("error_text" if k == "error" else k)
            val = json.dumps(v) if col == "result_json" else v
            conn.execute(f"UPDATE processing_jobs SET {col} = ?, updated_at = ? WHERE id = ? AND user_id = ?", (val, now, job_id, user_id))
        conn.commit()
        return self.get_job(user_id, job_id)

    def get_job(self, user_id: str, job_id: str) -> Optional[Dict[str, Any]]:
        if self.sb:
            res = self.sb.table("processing_jobs").select("*").eq("id", job_id).eq("user_id", user_id).execute()
            if not res.data:
                return None
            r = res.data[0]
            return {
                "id": r["id"],
                "title": r["title"],
                "kind": r["kind"],
                "status": r["status"],
                "progress": r["progress"],
                "message": r["message"],
                "result": r.get("result_json"),
                "error": r.get("error_text") or None,
            }
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM processing_jobs WHERE id = ? AND user_id = ?", (job_id, user_id)).fetchone()
        if not row:
            return None
        d = dict(row)
        return {
            "id": d["id"],
            "title": d["title"],
            "kind": d["kind"],
            "status": d["status"],
            "progress": d["progress"],
            "message": d["message"],
            "result": _safe_json_loads(d.get("result_json"), None),
            "error": d.get("error_text") or None,
        }

    def list_jobs(self, user_id: str, limit: int = 25) -> List[Dict[str, Any]]:
        if self.sb:
            rows = self.sb.table("processing_jobs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute().data or []
            return [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "kind": r["kind"],
                    "status": r["status"],
                    "progress": r["progress"],
                    "message": r["message"],
                    "result": r.get("result_json"),
                    "error": r.get("error_text") or None,
                }
                for r in rows
            ]
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM processing_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
        return [
            {
                "id": d["id"],
                "title": d["title"],
                "kind": d["kind"],
                "status": d["status"],
                "progress": d["progress"],
                "message": d["message"],
                "result": _safe_json_loads(d["result_json"], None),
                "error": d["error_text"] or None,
            }
            for d in rows
        ]

    # ------------------------------------------------------------------
    # OAuth Pending State Tracking (SQLite / Supabase fallback safe)
    # ------------------------------------------------------------------
    def save_pending_oauth_state(self, state: str, user_id: str, provider: str) -> None:
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT OR REPLACE INTO oauth_pending_states (state, user_id, provider, created_at) VALUES (?, ?, ?, ?)",
            (state, user_id, provider, utcnow_iso()),
        )
        conn.commit()

    def consume_pending_oauth_state(self, state: str) -> Optional[Dict[str, Any]]:
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM oauth_pending_states WHERE state = ?", (state,)).fetchone()
        if not row:
            return None
        conn.execute("DELETE FROM oauth_pending_states WHERE state = ?", (state,))
        conn.commit()
        return dict(row)

    def clear_user_data(self, user_id: str, scope: str = "all") -> None:
        tables = (
            ["sources", "emails", "memories", "memory_versions", "entities", "relationships", "evidence", "deadlines", "commitments", "decisions", "conflicts", "notifications", "processing_jobs"]
            if scope == "all"
            else (["sources"] if scope == "sources" else ["memories", "deadlines", "memory_versions", "evidence"])
        )
        if self.sb:
            for tbl in tables:
                self.sb.table(tbl).delete().eq("user_id", user_id).execute()
            return
        conn = get_sqlite_conn()
        for tbl in tables:
            conn.execute(f"DELETE FROM {tbl} WHERE user_id = ?", (user_id,))
        conn.commit()
