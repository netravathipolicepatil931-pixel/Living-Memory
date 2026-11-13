"""WhatsApp .txt and .zip export parser with zip-slip protection."""

from __future__ import annotations

import io
import os
import re
import zipfile
from typing import Any, Dict, List


ANDROID_RE = re.compile(
    r"^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[apAP][mM])?)\s*[-–]\s*([^:]+):\s*(.*)$"
)
IOS_RE = re.compile(
    r"^\[(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[apAP][mM])?)\]\s*([^:]+):\s*(.*)$"
)
SYSTEM_RE = re.compile(
    r"(end-to-end encrypted|created group|added|removed|left|changed the subject|changed this group|<Media omitted>)",
    re.IGNORECASE,
)


def detect_media_kind(filename: str) -> OptionalKind:
    ext = os.path.splitext(filename.lower())[1]
    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return "image"
    if ext in {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus"}:
        return "audio"
    if ext in {".mp4", ".mov", ".webm"}:
        return "video"
    if ext in {".pdf", ".docx"}:
        return "document"
    return None


OptionalKind = str | None


def parse_whatsapp_text(raw_text: str, filename: str = "WhatsApp Chat.txt") -> Dict[str, Any]:
    lines = (raw_text or "").replace("\r\n", "\n").split("\n")
    messages: List[Dict[str, str]] = []
    participants: set[str] = set()

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            continue
        m = ANDROID_RE.match(trimmed) or IOS_RE.match(trimmed)
        if m:
            date_str, time_str, sender_raw, content_raw = m.group(1), m.group(2), m.group(3), m.group(4)
            sender = sender_raw.strip()
            content = content_raw.strip()
            if sender and not SYSTEM_RE.search(content):
                participants.add(sender)
                messages.append(
                    {
                        "timestamp": f"{date_str} {time_str}".strip(),
                        "sender": sender,
                        "content": content,
                    }
                )
        elif messages:
            messages[-1]["content"] = f"{messages[-1]['content']}\n{trimmed}"

    group_name = re.sub(r"^WhatsApp Chat with\s+", "", os.path.splitext(filename)[0], flags=re.IGNORECASE).strip()
    group_name = group_name or "Imported WhatsApp Chat"

    date_range = (
        f"{messages[0]['timestamp']} -> {messages[-1]['timestamp']}"
        if messages
        else "No dated messages detected"
    )
    return {
        "groupName": group_name,
        "participants": sorted(participants),
        "messageCount": len(messages),
        "dateRange": date_range,
        "messages": messages,
    }


def parse_whatsapp_zip(zip_bytes: bytes, zip_filename: str) -> Dict[str, Any]:
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        txt_name = ""
        raw_text = ""
        attachments: List[Dict[str, Any]] = []

        for info in zf.infolist():
            if info.is_dir():
                continue
            # Prevent zip-slip directory traversal
            safe_base = os.path.basename(info.filename)
            if not safe_base or safe_base.startswith("._") or ".." in info.filename:
                continue
            data = zf.read(info.filename)
            if safe_base.lower().endswith(".txt"):
                if not txt_name or "_chat.txt" in safe_base.lower():
                    txt_name = safe_base
                    raw_text = data.decode("utf-8", errors="replace")
                continue
            kind = detect_media_kind(safe_base)
            if kind and len(data) <= 15 * 1024 * 1024:
                mime_map = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                    ".mp3": "audio/mpeg",
                    ".wav": "audio/wav",
                    ".m4a": "audio/mp4",
                    ".ogg": "audio/ogg",
                    ".opus": "audio/ogg",
                    ".mp4": "video/mp4",
                    ".mov": "video/quicktime",
                    ".webm": "video/webm",
                    ".pdf": "application/pdf",
                    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                }
                ext = os.path.splitext(safe_base.lower())[1]
                attachments.append(
                    {
                        "filename": safe_base,
                        "kind": kind,
                        "mimeType": mime_map.get(ext, "application/octet-stream"),
                        "sizeBytes": len(data),
                        "bytes": data,
                    }
                )

    parsed = parse_whatsapp_text(raw_text, txt_name or zip_filename)
    return {
        **parsed,
        "rawText": raw_text,
        "attachments": attachments[:8],
        "mediaCount": len(attachments),
    }
