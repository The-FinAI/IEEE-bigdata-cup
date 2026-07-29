"""Fail-closed scoring interface for the organizer draft."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def score(
    task: str,
    reference_path: str | Path,
    submission_path: str | Path,
    output_dir: str | Path,
) -> dict[str, Any]:
    del task, reference_path, submission_path, output_dir
    raise NotImplementedError(
        "Official scoring is intentionally unavailable until each task owner "
        "freezes the metric definition and supplies a reviewed public fixture."
    )
