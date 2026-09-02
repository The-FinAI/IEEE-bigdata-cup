#!/usr/bin/env python3
"""Self-contained public CLI for the FinReason Task 1 participant kit."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from finreason_task1.admission import (
    build_submission_archive,
    validate_submission_archive,
)
from finreason_task1.contracts import (
    ContractError,
    PREDICTION_SCHEMA_VERSION,
    load_jsonl,
    validate_prediction_record,
    validate_question,
    validate_submission,
)
from finreason_task1.leaderboard import admit_leaderboard_submission
from finreason_task1.scoring import score_submission


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_index(path: str | Path, *, key: str, kind: str) -> dict[str, dict[str, Any]]:
    loaded = load_jsonl(path)
    if not loaded.valid:
        raise ContractError(f"{kind} JSONL is invalid: {loaded.as_dict()}")
    result: dict[str, dict[str, Any]] = {}
    for line_number, record in enumerate(loaded.records, start=1):
        identifier = record.get(key)
        if not isinstance(identifier, str) or not identifier:
            raise ContractError(f"{kind} line {line_number}: invalid {key}")
        if identifier in result:
            raise ContractError(f"{kind} line {line_number}: duplicate {key}")
        result[identifier] = record
    return result


def load_questions(path: str | Path) -> dict[str, dict[str, Any]]:
    questions = load_index(path, key="case_id", kind="question")
    for question in questions.values():
        validate_question(question)
    return questions


def question_context(
    path: str | Path,
    questions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    dataset_versions = {row["dataset_version"] for row in questions.values()}
    if len(dataset_versions) != 1:
        raise ContractError("question bundle must contain one dataset_version")
    return {
        "dataset_version": next(iter(dataset_versions)),
        "questions_jsonl_sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest(),
    }


def command_validate(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    loaded = load_jsonl(args.predictions)
    if not loaded.valid:
        print(canonical_json(loaded.as_dict()))
        return 2
    result = validate_submission(loaded.records, questions, require_complete=True)
    report = result.as_dict()
    report.update(question_context(args.questions, questions))
    report["schema_version"] = "finreason.task1.validation/2.0.0"
    report["predictions_jsonl_sha256"] = hashlib.sha256(
        Path(args.predictions).read_bytes()
    ).hexdigest()
    print(canonical_json(report))
    return 0 if result.valid else 2


def command_validate_zip(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    result = validate_submission_archive(args.submission_zip, questions)
    report = result.as_dict()
    report.update(question_context(args.questions, questions))
    report["schema_version"] = "finreason.task1.validation/2.0.0"
    print(canonical_json(report))
    return 0 if result.valid else 2


def command_baseline_b0(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    for case_id in sorted(questions):
        question = questions[case_id]
        print(
            canonical_json(
                {
                    "schema_version": PREDICTION_SCHEMA_VERSION,
                    "dataset_version": question["dataset_version"],
                    "case_id": case_id,
                    "final_answer": None,
                    "steps": [],
                }
            )
        )
    return 0


def command_baseline_b1(args: argparse.Namespace) -> int:
    from finreason_task1.baseline_b1 import build_b1_prediction

    questions = load_questions(args.questions)
    for case_id in sorted(questions):
        question = questions[case_id]
        prediction = build_b1_prediction(question)
        if validate_prediction_record(prediction, question):
            prediction = {
                "schema_version": PREDICTION_SCHEMA_VERSION,
                "dataset_version": question["dataset_version"],
                "case_id": case_id,
                "final_answer": None,
                "steps": [],
            }
        print(canonical_json(prediction))
    return 0


def command_expected_ids(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    context = question_context(args.questions, questions)
    print(
        canonical_json(
            {
                "schema_version": "finreason.task1.expected-ids/1.0.0",
                "dataset_version": context["dataset_version"],
                "case_ids": sorted(questions),
                "questions_jsonl_sha256": context["questions_jsonl_sha256"],
            }
        )
    )
    return 0


def command_package(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    loaded = load_jsonl(args.predictions)
    if not loaded.valid:
        print(canonical_json(loaded.as_dict()))
        return 2
    validation = validate_submission(loaded.records, questions, require_complete=True)
    if not validation.valid:
        print(canonical_json(validation.as_dict()))
        return 2
    build_submission_archive(args.predictions, args.output)
    admitted = validate_submission_archive(args.output, questions)
    if not admitted.valid:
        raise ContractError("newly packaged submission failed admission")
    report = {
        "schema_version": "finreason.task1.package/2.0.0",
        "status": "PASS",
        "archive_sha256": admitted.archive_sha256,
        "predictions_jsonl_sha256": admitted.predictions_jsonl_sha256,
        "record_count": len(admitted.records),
        **question_context(args.questions, questions),
    }
    print(canonical_json(report))
    return 0


def command_leaderboard_admit(args: argparse.Namespace) -> int:
    report = admit_leaderboard_submission(
        args.questions,
        args.expected_ids,
        args.submission_zip,
    )
    print(canonical_json(report))
    return 0 if report["status"] == "PASS" else 2


def command_score_dev(args: argparse.Namespace) -> int:
    questions = load_questions(args.questions)
    gold = load_index(args.gold, key="case_id", kind="gold")
    manifests = load_index(args.manifest, key="case_id", kind="manifest")
    predictions = load_jsonl(args.predictions)
    if not predictions.valid:
        raise ContractError("predictions JSONL failed structural loading")
    if (
        len(questions) != 290
        or set(questions) != set(gold)
        or set(questions) != set(manifests)
        or any(
            row.get("split") != "dev_local_public"
            or row.get("structure_stratum") != "seen"
            for row in manifests.values()
        )
        or len({row.get("template_id") for row in manifests.values()}) != 290
    ):
        raise ContractError(
            "score-dev requires exactly one seen dev_local_public case "
            "from each of 290 templates"
        )
    report = score_submission(
        questions,
        gold,
        predictions.records,
        tuple(manifests.values()),
    )
    print(canonical_json(report.as_dict()))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    validate = commands.add_parser("validate")
    validate.add_argument("--questions", required=True)
    validate.add_argument("--predictions", required=True)
    validate.set_defaults(handler=command_validate)

    validate_zip = commands.add_parser("validate-zip")
    validate_zip.add_argument("--questions", required=True)
    validate_zip.add_argument("--submission-zip", required=True)
    validate_zip.set_defaults(handler=command_validate_zip)

    for name, handler in (("baseline-b0", command_baseline_b0), ("baseline-b1", command_baseline_b1)):
        baseline = commands.add_parser(name)
        baseline.add_argument("--questions", required=True)
        baseline.set_defaults(handler=handler)

    expected_ids = commands.add_parser("expected-ids")
    expected_ids.add_argument("--questions", required=True)
    expected_ids.set_defaults(handler=command_expected_ids)

    package = commands.add_parser("package")
    package.add_argument("--questions", required=True)
    package.add_argument("--predictions", required=True)
    package.add_argument("--output", required=True)
    package.set_defaults(handler=command_package)

    admit = commands.add_parser("leaderboard-admit")
    admit.add_argument("--questions", required=True)
    admit.add_argument("--expected-ids", required=True)
    admit.add_argument("--submission-zip", required=True)
    admit.set_defaults(handler=command_leaderboard_admit)

    score_dev = commands.add_parser("score-dev")
    score_dev.add_argument("--questions", required=True)
    score_dev.add_argument("--gold", required=True)
    score_dev.add_argument("--manifest", required=True)
    score_dev.add_argument("--predictions", required=True)
    score_dev.set_defaults(handler=command_score_dev)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except (ContractError, OSError, ValueError) as exc:
        print(
            canonical_json(
                {
                    "schema_version": "finreason.task1.error/1.0.0",
                    "status": "rejected",
                    "errors": [
                        {
                            "code": (
                                "E_INTERNAL_CONTRACT"
                                if isinstance(exc, ContractError)
                                else "E_FILE"
                            ),
                            "path": "",
                            "message": str(exc),
                        }
                    ],
                }
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
