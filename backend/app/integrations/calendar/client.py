"""Modular & Optional Google Calendar read-only integration client."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx


CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"
CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


async def fetch_calendar_events_readonly(
    access_token: str,
    *,
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    max_results: int = 40,
) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    t_min = time_min or (now - timedelta(days=7)).isoformat()
    t_max = time_max or (now + timedelta(days=60)).isoformat()

    async with httpx.AsyncClient(timeout=25.0) as client:
        cal_resp = await client.get(
            f"{CALENDAR_API_BASE}/users/me/calendarList",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if cal_resp.status_code >= 400:
            raise RuntimeError(f"Calendar list error ({cal_resp.status_code}): {cal_resp.text[:250]}")
        calendars = cal_resp.json().get("items") or [{"id": "primary", "summary": "Primary"}]

        events_out: List[Dict[str, Any]] = []
        for cal in calendars[:4]:
            ev_resp = await client.get(
                f"{CALENDAR_API_BASE}/calendars/{cal['id']}/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "timeMin": t_min,
                    "timeMax": t_max,
                    "maxResults": max_results,
                },
            )
            if ev_resp.status_code >= 400:
                continue
            for item in ev_resp.json().get("items") or []:
                start_raw = (item.get("start") or {}).get("dateTime") or (item.get("start") or {}).get("date") or ""
                end_raw = (item.get("end") or {}).get("dateTime") or (item.get("end") or {}).get("date") or ""
                date_str = start_raw[:10] if len(start_raw) >= 10 else ""
                start_time = start_raw[11:16] if "T" in start_raw else "All day"
                end_time = end_raw[11:16] if "T" in end_raw else ""
                events_out.append(
                    {
                        "googleEventId": item.get("id", ""),
                        "title": item.get("summary") or "(Untitled Event)",
                        "date": date_str,
                        "startTime": start_time,
                        "endTime": end_time,
                        "calendarName": cal.get("summary") or "Primary",
                        "location": item.get("location") or "",
                        "participants": [a.get("email", "") for a in (item.get("attendees") or []) if a.get("email")],
                        "description": item.get("description") or "",
                        "htmlLink": item.get("htmlLink") or "",
                    }
                )
        return events_out
