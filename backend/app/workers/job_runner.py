"""Background async job runner updating persistent processing_jobs state."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable

from app.database.repository import Repository

logger = logging.getLogger("living_memory.jobs")


def schedule_background_job(
    repo: Repository,
    user_id: str,
    job_id: str,
    coro_factory: Callable[[Callable[[str, int, str], None]], Awaitable[dict[str, Any]]],
) -> None:
    """Schedule an async pipeline task while keeping DB status updated at every milestone."""

    def progress_cb(status: str, progress: int, message: str) -> None:
        repo.update_job(user_id, job_id, status=status, progress=progress, message=message)

    async def runner() -> None:
        try:
            repo.update_job(user_id, job_id, status="Processing", progress=15, message="Pipeline started")
            result = await coro_factory(progress_cb)
            final_status = result.get("job_status") or "Completed"
            repo.update_job(
                user_id,
                job_id,
                status=final_status,
                progress=100,
                message=result.get("job_message") or "Analysis complete",
                result=result,
            )
        except Exception as exc:
            logger.exception("Background job %s failed", job_id)
            repo.update_job(
                user_id,
                job_id,
                status="Failed",
                progress=100,
                message=str(exc),
                error=str(exc),
            )

    asyncio.create_task(runner())
