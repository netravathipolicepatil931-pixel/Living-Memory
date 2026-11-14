"""Official Gmail REST API client (read-only: profile, paginated list, history.list, batch get)."""

from __future__ import annotations

import base64
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx


GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class HistoryExpiredError(RuntimeError):
    pass


class GmailUnauthorizedError(RuntimeError):
    pass


def _decode_base64url(data: str) -> str:
    if not data:
        return ""
    padded = data + "=" * ((4 - len(data) % 4) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _strip_html(html: str) -> str:
    no_scripts = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    no_tags = re.sub(r"<[^>]+>", " ", no_scripts)
    return re.sub(r"\s+", " ", no_tags).strip()


def _extract_body_and_attachments(payload: Dict[str, Any]) -> Dict[str, Any]:
    plain_parts: List[str] = []
    html_parts: List[str] = []
    attachments: List[Dict[str, Any]] = []

    def walk(part: Dict[str, Any]) -> None:
        filename = part.get("filename") or ""
        mime = part.get("mimeType") or ""
        body = part.get("body") or {}
        if filename:
            attachments.append(
                {
                    "filename": filename,
                    "mimeType": mime or "application/octet-stream",
                    "size": int(body.get("size") or 0),
                }
            )
        if body.get("data"):
            decoded = _decode_base64url(body["data"])
            if mime == "text/plain":
                plain_parts.append(decoded)
            elif mime == "text/html":
                html_parts.append(decoded)
        for child in part.get("parts") or []:
            walk(child)

    if payload:
        walk(payload)

    body_text = "\n".join(plain_parts).strip()
    if not body_text and html_parts:
        body_text = _strip_html("\n".join(html_parts))
    return {"bodyText": body_text, "attachments": attachments}


def _header(headers: List[Dict[str, str]], name: str) -> str:
    low = name.lower()
    for h in headers:
        if (h.get("name") or "").lower() == low:
            return h.get("value") or ""
    return ""


def _parse_sender(raw: str) -> Dict[str, str]:
    m = re.match(r"^(.*?)\s*<([^>]+)>$", raw or "")
    if m:
        return {
            "name": m.group(1).strip().strip('"') or m.group(2).strip(),
            "email": m.group(2).strip(),
        }
    return {"name": raw.strip() or "Unknown Sender", "email": raw.strip()}


async def fetch_gmail_profile(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            f"{GMAIL_API_BASE}/profile",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 401:
            raise GmailUnauthorizedError("Gmail access token unauthorized or revoked.")
        if resp.status_code >= 400:
            raise RuntimeError(f"Gmail profile lookup failed ({resp.status_code}): {resp.text[:250]}")
        return resp.json()


async def list_gmail_message_ids_paginated(
    access_token: str,
    *,
    max_messages: int = 500,
    after_date: Optional[str] = None,
    before_date: Optional[str] = None,
) -> List[str]:
    terms = ["-in:spam", "-in:trash"]
    if after_date:
        terms.append(f"after:{after_date.replace('-', '/')}")
    if before_date:
        terms.append(f"before:{before_date.replace('-', '/')}")
    q = " ".join(terms)

    ids: List[str] = []
    page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while len(ids) < max_messages:
            batch_limit = min(50, max_messages - len(ids))
            params: Dict[str, Any] = {"q": q, "maxResults": batch_limit}
            if page_token:
                params["pageToken"] = page_token
            resp = await client.get(
                f"{GMAIL_API_BASE}/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if resp.status_code == 401:
                raise GmailUnauthorizedError("Gmail access token unauthorized.")
            if resp.status_code >= 400:
                raise RuntimeError(f"Gmail messages.list error ({resp.status_code}): {resp.text[:250]}")
            data = resp.json()
            for item in data.get("messages") or []:
                if item.get("id"):
                    ids.append(item["id"])
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return ids


async def list_gmail_history_added_ids(access_token: str, start_history_id: str) -> Dict[str, Any]:
    ids: List[str] = []
    page_token: Optional[str] = None
    latest_history_id = start_history_id

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params: Dict[str, Any] = {
                "startHistoryId": start_history_id,
                "historyTypes": "messageAdded",
            }
            if page_token:
                params["pageToken"] = page_token
            resp = await client.get(
                f"{GMAIL_API_BASE}/history",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if resp.status_code == 404:
                raise HistoryExpiredError("Gmail historyId expired; full sync required.")
            if resp.status_code == 401:
                raise GmailUnauthorizedError("Gmail access token unauthorized.")
            if resp.status_code >= 400:
                raise RuntimeError(f"Gmail history.list error ({resp.status_code}): {resp.text[:250]}")
            data = resp.json()
            if data.get("historyId"):
                latest_history_id = str(data["historyId"])
            for h in data.get("history") or []:
                for added in h.get("messagesAdded") or []:
                    msg = added.get("message") or {}
                    labels = msg.get("labelIds") or []
                    if msg.get("id") and "SPAM" not in labels and "TRASH" not in labels:
                        ids.append(msg["id"])
            page_token = data.get("nextPageToken")
            if not page_token:
                break

    # Deduplicate preserving order
    seen = set()
    unique_ids = []
    for mid in ids:
        if mid not in seen:
            seen.add(mid)
            unique_ids.append(mid)
    return {"messageIds": unique_ids, "historyId": latest_history_id}


async def fetch_gmail_message_detail(access_token: str, message_id: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.get(
            f"{GMAIL_API_BASE}/messages/{message_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"format": "full"},
        )
        if resp.status_code == 401:
            raise GmailUnauthorizedError("Gmail access token unauthorized.")
        if resp.status_code >= 400:
            raise RuntimeError(f"Gmail messages.get failed for {message_id} ({resp.status_code}).")
        data = resp.json()

    headers = (data.get("payload") or {}).get("headers") or []
    sender = _parse_sender(_header(headers, "From"))
    recipients = _header(headers, "To")
    subject = _header(headers, "Subject") or "(No Subject)"
    internal_ms = data.get("internalDate")
    if internal_ms:
        received_iso = datetime.fromtimestamp(int(internal_ms) / 1000.0, tz=timezone.utc).isoformat()
    else:
        received_iso = datetime.now(timezone.utc).isoformat()

    extracted = _extract_body_and_attachments(data.get("payload") or {})
    thread_id = data.get("threadId") or message_id
    return {
        "gmail_message_id": data["id"],
        "thread_id": thread_id,
        "labels": data.get("labelIds") or [],
        "sender_name": sender["name"],
        "sender_email": sender["email"],
        "recipients": recipients,
        "subject": subject,
        "snippet": data.get("snippet") or "",
        "body_text": extracted["bodyText"] or data.get("snippet") or "",
        "attachments_metadata": extracted["attachments"],
        "received_at": received_iso,
        "gmail_url": f"https://mail.google.com/mail/u/0/#inbox/{thread_id}",
        "history_id": str(data.get("historyId") or ""),
    }
