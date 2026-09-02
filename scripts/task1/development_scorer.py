#!/usr/bin/env python3
"""Fail-closed Task 1 V4 development admission and aggregate scoring."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from finreason_task1.admission import read_submission_archive
from finreason_task1.contracts import ContractError, load_jsonl_snapshot, validate_question
from finreason_task1.leaderboard import admit_production_leaderboard_submission
from finreason_task1.scoring import ranking_value, score_submission


def _rows(path: Path, label: str) -> list[dict]:
    _, loaded = load_jsonl_snapshot(path)
    if not loaded.valid:
        raise ContractError(f"{label} failed frozen JSONL validation")
    return [dict(row) for row in loaded.records]


def _index(rows: list[dict], label: str) -> dict[str, dict]:
    indexed: dict[str, dict] = {}
    for row in rows:
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or case_id in indexed:
            raise ContractError(f"{label} case identity is invalid")
        indexed[case_id] = row
    return indexed


def _emit(value: dict) -> None:
    sys.stdout.write(json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--questions", required=True, type=Path)
    parser.add_argument("--expected-ids", required=True, type=Path)
    parser.add_argument("--release-manifest", required=True, type=Path)
    parser.add_argument("--release-manifest-sha256", required=True)
    parser.add_argument("--gold", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--evaluation-version", required=True)
    args = parser.parse_args()

    admission = admit_production_leaderboard_submission(
        args.questions,
        args.expected_ids,
        args.archive,
        release_manifest_path=args.release_manifest,
        expected_release_manifest_sha256=args.release_manifest_sha256,
    )
    if admission.get("status") != "PASS" or admission.get("record_count") != 580:
        _emit({
            "status": "participant_error",
            "error_code": "SUBMISSION_REJECTED",
            "evaluation_version": args.evaluation_version,
        })
        return 2

    questions = _index(_rows(args.questions, "questions"), "questions")
    for question in questions.values():
        validate_question(question)
    gold = _index(_rows(args.gold, "gold"), "gold")
    manifest = _rows(args.manifest, "manifest")
    admitted = read_submission_archive(args.archive)
    if not admitted.valid or len(admitted.records) != 580:
        raise ContractError("admitted archive changed before scoring")
    report = score_submission(questions, gold, admitted.records, manifest)
    if (
        report.dataset_version != "task1-v4"
        or report.seen_fac is None
        or report.seen_checkpoint is None
        or report.hidden_fac is not None
        or report.hidden_checkpoint is not None
        or report.case_count != 580
        or report.checkpoint_case_count != 516
        or report.checkpoint_template_count != 258
        or report.ranking_tuple is not None
    ):
        raise ContractError("development score report violates frozen V4 denominators")
    _emit({
        "status": "scored",
        "evaluation_version": args.evaluation_version,
        "seen_fac": ranking_value(report.seen_fac),
        "seen_checkpoint": ranking_value(report.seen_checkpoint),
        "case_count": report.case_count,
        "archive_sha256": admission["archive_sha256"],
        "predictions_jsonl_sha256": admission["predictions_jsonl_sha256"],
    })
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        sys.stderr.write('{"status":"infrastructure_error","error_code":"SCORER_FAILED"}\n')
        raise SystemExit(1)
