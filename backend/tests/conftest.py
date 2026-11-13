"""Pytest fixtures isolating SQLite state & adding backend directory to sys.path."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(autouse=True)
def isolated_test_storage(tmp_path, monkeypatch):
    import app.database.session as db_session

    db_file = tmp_path / "test_living_memory.db"
    storage_dir = tmp_path / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(db_session, "SQLITE_DB_PATH", db_file)
    monkeypatch.setattr(db_session, "LOCAL_STORAGE_DIR", storage_dir)
    monkeypatch.setattr(db_session, "_sqlite_initialized", False)
    monkeypatch.setattr(db_session, "_supabase_client", None)
    yield
