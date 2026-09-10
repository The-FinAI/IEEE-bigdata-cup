"""Persistent SQLite cache for judge decisions.

The cache key covers everything that can change a judged label:

    case id | gold text | prediction text | provider | model | prompt version | evaluation version

Changing any of them yields a different key, so a re-run after editing a
prediction, swapping the judge model or publishing a new prompt version does not
reuse a stale label.
"""

from __future__ import annotations

import hashlib
import sqlite3
import threading
from pathlib import Path
from typing import Optional

__all__ = ["JudgeCache", "NullCache", "make_cache_key"]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS judgements (
    key            TEXT PRIMARY KEY,
    case_id        TEXT NOT NULL,
    label          TEXT,
    raw_output     TEXT,
    attempts       INTEGER DEFAULT 0,
    error          TEXT,
    judge_provider TEXT,
    judge_model    TEXT,
    prompt_version TEXT,
    evaluation_version TEXT,
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_judgements_case ON judgements(case_id);
"""


def make_cache_key(
    case_id: str,
    gold_text: str,
    pred_text: str,
    judge_provider: str,
    judge_model: str,
    prompt_version: str,
    evaluation_version: str,
) -> str:
    digest = hashlib.sha256()
    for part in (
        case_id,
        gold_text,
        pred_text,
        judge_provider,
        judge_model,
        prompt_version,
        evaluation_version,
    ):
        digest.update(str(part).encode("utf-8"))
        digest.update(b"\x1f")  # unit separator: prevents field-boundary collisions
    return digest.hexdigest()


class CacheEntry:
    __slots__ = ("label", "raw_output", "attempts", "error")

    def __init__(self, label, raw_output, attempts, error):
        self.label = label
        self.raw_output = raw_output
        self.attempts = attempts
        self.error = error


class JudgeCache:
    """Thread-safe SQLite-backed cache.

    Only *successful* judgements (a valid label) are stored; a failed call is not
    cached so that a re-run retries it, which is what ``--resume`` needs.
    """

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[CacheEntry]:
        with self._lock:
            row = self._conn.execute(
                "SELECT label, raw_output, attempts, error FROM judgements WHERE key = ?",
                (key,),
            ).fetchone()
        if row is None:
            self.misses += 1
            return None
        self.hits += 1
        return CacheEntry(row[0], row[1], row[2] or 0, row[3])

    def put(
        self,
        key: str,
        case_id: str,
        label: Optional[str],
        raw_output: Optional[str],
        attempts: int,
        error: Optional[str],
        judge_provider: str,
        judge_model: str,
        prompt_version: str,
        evaluation_version: str,
    ) -> None:
        if label is None:
            return  # never cache a failure
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO judgements "
                "(key, case_id, label, raw_output, attempts, error, judge_provider, "
                " judge_model, prompt_version, evaluation_version) "
                "VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    key,
                    case_id,
                    label,
                    raw_output,
                    attempts,
                    error,
                    judge_provider,
                    judge_model,
                    prompt_version,
                    evaluation_version,
                ),
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def __enter__(self) -> "JudgeCache":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


class NullCache:
    """Cache-shaped no-op used when ``cache: false`` or ``--no-cache``."""

    hits = 0
    misses = 0

    def get(self, key: str) -> None:
        return None

    def put(self, *args, **kwargs) -> None:
        return None

    def close(self) -> None:
        return None

    def __enter__(self) -> "NullCache":
        return self

    def __exit__(self, *exc) -> None:
        return None
