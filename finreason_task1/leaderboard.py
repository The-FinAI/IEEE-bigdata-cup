"""Public leaderboard submission admission with frozen question identity."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any, Mapping

from .admission import validate_submission_archive
from .contracts import (
    ContractError,
    SHA256_PATTERN,
    load_json_object_snapshot,
    load_jsonl_snapshot,
    validate_question,
)


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


LEADERBOARD_ADMISSION_SCHEMA_VERSION = (
    "finreason.task1.leaderboard-admission/1.0.0"
)
PRODUCTION_DATASET_VERSION = "task1-v4"
PRODUCTION_LEADERBOARD_RECORD_COUNT = 580
RELEASE_MANIFEST_SCHEMA_VERSION = "finreason.task1.release/2.0.0"
PRODUCTION_SCORER_VERSION = "finreason.task1.scorer/2.0.0"
PRODUCTION_RELEASE_ARTIFACTS = {
    "train_questions": ("train_questions.jsonl", 2900),
    "train_gold": ("train_gold.jsonl", 2900),
    "train_manifest": ("train_manifest.jsonl", 2900),
    "train_targets": ("train_targets.jsonl", 2900),
    "dev_questions": ("dev_questions.jsonl", 290),
    "dev_gold": ("dev_gold.jsonl", 290),
    "dev_manifest": ("dev_manifest.jsonl", 290),
    "dev_targets": ("dev_targets.jsonl", 290),
    "leaderboard_questions": ("leaderboard_questions.jsonl", 580),
    "leaderboard_expected_ids": ("leaderboard_expected_ids.json", 580),
    "sample_b0_predictions": ("sample_b0_predictions.jsonl", 580),
    "sample_b0_submission": ("sample_b0_submission.zip", 580),
}


def _question_snapshot(
    path: str | Path,
) -> tuple[bytes, dict[str, Mapping[str, Any]]]:
    content, loaded = load_jsonl_snapshot(path)
    if not loaded.valid:
        raise ContractError(f"leaderboard questions JSONL is invalid: {loaded.as_dict()}")
    questions: dict[str, Mapping[str, Any]] = {}
    for line_number, question in enumerate(loaded.records, start=1):
        validate_question(question)
        case_id = question["case_id"]
        if case_id in questions:
            raise ContractError(
                f"leaderboard questions line {line_number} repeats case_id"
            )
        questions[case_id] = question
    if not questions:
        raise ContractError("leaderboard questions must not be empty")
    return content, questions


def _admit_leaderboard_submission(
    questions_path: str | Path,
    expected_ids_path: str | Path,
    submission_zip: str | Path,
    *,
    required_dataset_version: str | None = None,
    required_record_count: int | None = None,
    required_questions_sha256: str | None = None,
    required_expected_ids_sha256: str | None = None,
) -> dict[str, Any]:
    """Apply the shared admission contract with optional organizer commitments."""

    question_bytes, questions = _question_snapshot(questions_path)
    expected_bytes, expected = load_json_object_snapshot(expected_ids_path)
    expected_fields = {
        "schema_version",
        "dataset_version",
        "case_ids",
        "questions_jsonl_sha256",
    }
    dataset_versions = {row["dataset_version"] for row in questions.values()}
    if len(dataset_versions) != 1:
        raise ContractError("leaderboard questions contain multiple dataset versions")
    dataset_version = next(iter(dataset_versions))
    question_sha256 = sha256_bytes(question_bytes)
    expected_ids_sha256 = sha256_bytes(expected_bytes)
    if (
        set(expected) != expected_fields
        or expected.get("schema_version") != "finreason.task1.expected-ids/1.0.0"
        or expected.get("dataset_version") != dataset_version
        or expected.get("case_ids") != sorted(questions)
        or expected.get("questions_jsonl_sha256") != question_sha256
    ):
        raise ContractError("leaderboard expected-ID contract is stale or malformed")
    if required_dataset_version is not None and dataset_version != required_dataset_version:
        raise ContractError(
            "production leaderboard dataset_version differs from the frozen contract"
        )
    if required_record_count is not None and len(questions) != required_record_count:
        raise ContractError(
            "production leaderboard question count differs from the frozen contract"
        )
    if (
        required_questions_sha256 is not None
        and question_sha256 != required_questions_sha256
    ):
        raise ContractError(
            "production leaderboard questions differ from the frozen release manifest"
        )
    if (
        required_expected_ids_sha256 is not None
        and expected_ids_sha256 != required_expected_ids_sha256
    ):
        raise ContractError(
            "production leaderboard expected IDs differ from the frozen release manifest"
        )
    admitted = validate_submission_archive(submission_zip, questions)
    return {
        "schema_version": LEADERBOARD_ADMISSION_SCHEMA_VERSION,
        "status": "PASS" if admitted.valid else "REJECTED",
        "dataset_version": dataset_version,
        "record_count": len(admitted.records),
        "questions_jsonl_sha256": question_sha256,
        "expected_ids_json_sha256": expected_ids_sha256,
        "archive_sha256": admitted.archive_sha256,
        "predictions_jsonl_sha256": admitted.predictions_jsonl_sha256,
        "errors": [issue.as_dict() for issue in admitted.issues],
    }


def admit_leaderboard_submission(
    questions_path: str | Path,
    expected_ids_path: str | Path,
    submission_zip: str | Path,
) -> dict[str, Any]:
    """Generic participant helper; validates any self-consistent question bundle."""

    return _admit_leaderboard_submission(
        questions_path,
        expected_ids_path,
        submission_zip,
    )


def _production_release_artifact_hashes(
    release_manifest_path: str | Path,
    *,
    expected_release_manifest_sha256: str,
) -> tuple[str, str]:
    if not isinstance(
        expected_release_manifest_sha256, str
    ) or not SHA256_PATTERN.fullmatch(expected_release_manifest_sha256):
        raise ContractError("frozen release-manifest SHA-256 is invalid")
    manifest_bytes, manifest = load_json_object_snapshot(release_manifest_path)
    if sha256_bytes(manifest_bytes) != expected_release_manifest_sha256:
        raise ContractError("release manifest differs from its frozen SHA-256")
    expected_fields = {
        "schema_version",
        "release_version",
        "dataset_version",
        "source_commit",
        "scorer_version",
        "case_counts",
        "template_count",
        "topic_count",
        "domain_count",
        "artifacts",
    }
    case_counts = manifest.get("case_counts")
    if (
        set(manifest) != expected_fields
        or manifest.get("schema_version") != RELEASE_MANIFEST_SCHEMA_VERSION
        or manifest.get("dataset_version") != PRODUCTION_DATASET_VERSION
        or not isinstance(manifest.get("release_version"), str)
        or not 1 <= len(manifest["release_version"]) <= 128
        or not isinstance(manifest.get("source_commit"), str)
        or not re.fullmatch(r"[0-9a-f]{40}", manifest["source_commit"])
        or manifest["source_commit"] == "0" * 40
        or manifest.get("scorer_version") != PRODUCTION_SCORER_VERSION
        or not isinstance(case_counts, Mapping)
        or set(case_counts) != {"train", "dev", "leaderboard"}
        or type(case_counts.get("train")) is not int
        or case_counts.get("train") != 2900
        or type(case_counts.get("dev")) is not int
        or case_counts.get("dev") != 290
        or type(case_counts.get("leaderboard")) is not int
        or case_counts.get("leaderboard") != PRODUCTION_LEADERBOARD_RECORD_COUNT
        or type(manifest.get("template_count")) is not int
        or manifest.get("template_count") != 290
        or type(manifest.get("topic_count")) is not int
        or manifest.get("topic_count") != 58
        or type(manifest.get("domain_count")) is not int
        or manifest.get("domain_count") != 12
    ):
        raise ContractError("production release manifest is stale or malformed")
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list) or len(artifacts) != len(
        PRODUCTION_RELEASE_ARTIFACTS
    ):
        raise ContractError("production release manifest artifacts are malformed")
    by_role: dict[str, Mapping[str, Any]] = {}
    for artifact in artifacts:
        if not isinstance(artifact, Mapping):
            raise ContractError("production release manifest artifact must be an object")
        if set(artifact) != {
            "path",
            "role",
            "visibility",
            "record_count",
            "bytes",
            "sha256",
        }:
            raise ContractError("production release manifest artifact fields are malformed")
        role = artifact.get("role")
        if not isinstance(role, str):
            raise ContractError("production release manifest artifact role is invalid")
        if role in by_role:
            raise ContractError("production release manifest repeats an artifact role")
        by_role[role] = artifact
    hashes: dict[str, str] = {}
    for role, (filename, record_count) in PRODUCTION_RELEASE_ARTIFACTS.items():
        artifact = by_role.get(role)
        digest = None if artifact is None else artifact.get("sha256")
        if (
            artifact is None
            or artifact.get("path") != filename
            or artifact.get("visibility") != "public"
            or type(artifact.get("record_count")) is not int
            or artifact.get("record_count") != record_count
            or type(artifact.get("bytes")) is not int
            or artifact.get("bytes") < 1
            or not isinstance(digest, str)
            or not SHA256_PATTERN.fullmatch(digest)
        ):
            raise ContractError(
                f"production release manifest {role} commitment is malformed"
            )
        hashes[role] = digest
    return hashes["leaderboard_questions"], hashes["leaderboard_expected_ids"]


def admit_production_leaderboard_submission(
    questions_path: str | Path,
    expected_ids_path: str | Path,
    submission_zip: str | Path,
    *,
    release_manifest_path: str | Path,
    expected_release_manifest_sha256: str,
) -> dict[str, Any]:
    """Admit the exact 580-case Task 1 V4 leaderboard frozen by deployment."""

    questions_sha256, expected_ids_sha256 = _production_release_artifact_hashes(
        release_manifest_path,
        expected_release_manifest_sha256=expected_release_manifest_sha256,
    )
    return _admit_leaderboard_submission(
        questions_path,
        expected_ids_path,
        submission_zip,
        required_dataset_version=PRODUCTION_DATASET_VERSION,
        required_record_count=PRODUCTION_LEADERBOARD_RECORD_COUNT,
        required_questions_sha256=questions_sha256,
        required_expected_ids_sha256=expected_ids_sha256,
    )
