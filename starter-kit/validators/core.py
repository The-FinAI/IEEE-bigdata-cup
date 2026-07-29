"""Structural validation only; this module does not compute competition scores."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

TASK1_REQUIRED = {"instance_id", "final_answer", "reasoning_trace"}
TASK2_REQUIRED = {
    "episode_id",
    "timestamp",
    "asset_a",
    "asset_b",
    "action",
    "position_size",
}
TASK2_ACTIONS = {"LONG_SHORT", "SHORT_LONG", "HOLD", "CLOSE"}
TASK3_REQUIRED = {
    "case_id",
    "reported_value",
    "verified_value",
    "verification_status",
    "evidence",
}


def _result(errors: list[str], warnings: list[str], count: int) -> dict[str, Any]:
    return {
        "valid": not errors,
        "record_count": count,
        "errors": errors,
        "warnings": warnings,
    }


def _read_jsonl(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    records: list[dict[str, Any]] = []
    errors: list[str] = []

    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as error:
                errors.append(f"line {line_number}: invalid JSON ({error.msg})")
                continue
            if not isinstance(value, dict):
                errors.append(f"line {line_number}: record must be a JSON object")
                continue
            value["_line_number"] = line_number
            records.append(value)
    return records, errors


def _validate_jsonl(path: Path, required: set[str], id_field: str) -> dict[str, Any]:
    records, errors = _read_jsonl(path)
    warnings: list[str] = []
    seen: set[str] = set()

    for record in records:
        line_number = record.pop("_line_number")
        missing = sorted(required.difference(record))
        if missing:
            errors.append(f"line {line_number}: missing fields {', '.join(missing)}")

        record_id = record.get(id_field)
        if not isinstance(record_id, str) or not record_id.strip():
            errors.append(f"line {line_number}: {id_field} must be a non-empty string")
        elif record_id in seen:
            errors.append(f"line {line_number}: duplicate {id_field} {record_id!r}")
        else:
            seen.add(record_id)

    if not records:
        warnings.append("submission contains no records")
    return _result(errors, warnings, len(records))


def _validate_task2(path: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    count = 0

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = set(reader.fieldnames or [])
        missing_headers = sorted(TASK2_REQUIRED.difference(headers))
        if missing_headers:
            errors.append(f"missing CSV headers: {', '.join(missing_headers)}")

        for line_number, record in enumerate(reader, start=2):
            count += 1
            action = (record.get("action") or "").strip()
            if action not in TASK2_ACTIONS:
                errors.append(
                    f"line {line_number}: action must be one of "
                    + ", ".join(sorted(TASK2_ACTIONS))
                )
            for field in ("episode_id", "timestamp", "asset_a", "asset_b"):
                if not (record.get(field) or "").strip():
                    errors.append(f"line {line_number}: {field} is required")

    if count == 0:
        warnings.append("submission contains no records")
    warnings.append(
        "Task 2 validator checks structure only; trading and timing semantics are not frozen."
    )
    return _result(errors, warnings, count)


def validate_submission(task: str, submission_path: str | Path) -> dict[str, Any]:
    path = Path(submission_path)
    if not path.is_file():
        return _result([f"submission file not found: {path}"], [], 0)

    normalized = task.lower().replace("-", "")
    if normalized in {"task1", "1"}:
        return _validate_jsonl(path, TASK1_REQUIRED, "instance_id")
    if normalized in {"task2", "2"}:
        return _validate_task2(path)
    if normalized in {"task3", "3"}:
        return _validate_jsonl(path, TASK3_REQUIRED, "case_id")
    return _result([f"unknown task: {task}"], [], 0)
