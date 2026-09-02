"""Hosted/Marco acceptance for the exact V4 development scorer.

Never run this module on a participant laptop. Set TASK1_PRIVATE_REFERENCE_DIR on
the protected runner to a scratch directory containing leaderboard_gold.jsonl
and leaderboard_manifest.jsonl. Temporary perfect predictions are deleted by
TemporaryDirectory and are never uploaded.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "task1" / "data" / "development"
SCORER = ROOT / "scripts" / "task1" / "development_scorer.py"
PRIVATE_REFERENCE = os.environ.get("TASK1_PRIVATE_REFERENCE_DIR")


def _run(archive: Path, gold: Path, manifest: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(SCORER),
            "--archive", str(archive),
            "--questions", str(PUBLIC / "leaderboard_questions.jsonl"),
            "--expected-ids", str(PUBLIC / "leaderboard_expected_ids.json"),
            "--release-manifest", str(PUBLIC / "release_manifest.json"),
            "--release-manifest-sha256", "78ba29228132323b5b54eddf1d1d4cc46defbce3559b4752d0cbf6773a9422f7",
            "--gold", str(gold),
            "--manifest", str(manifest),
            "--evaluation-version", "task1-v4-development-20260829",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=120,
        check=False,
    )


@unittest.skipUnless(PRIVATE_REFERENCE, "protected TASK1_PRIVATE_REFERENCE_DIR is required")
class DevelopmentScoreAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.reference = Path(PRIVATE_REFERENCE)
        cls.gold = cls.reference / "leaderboard_gold.jsonl"
        cls.manifest = cls.reference / "leaderboard_manifest.jsonl"
        if not cls.gold.is_file() or not cls.manifest.is_file():
            raise RuntimeError("protected development reference is incomplete")

    def test_public_b0_scores_exact_zero(self) -> None:
        completed = _run(PUBLIC / "sample_b0_submission.zip", self.gold, self.manifest)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        result = json.loads(completed.stdout)
        self.assertEqual(result["seen_fac"], "0.000000")
        self.assertEqual(result["seen_checkpoint"], "0.000000")
        self.assertEqual(result["case_count"], 580)

    def test_private_perfect_scores_exact_one_and_is_deleted(self) -> None:
        from finreason_task1.admission import build_submission_archive

        questions = {
            row["case_id"]: row
            for row in map(json.loads, (PUBLIC / "leaderboard_questions.jsonl").read_text().splitlines())
        }
        gold = {
            row["case_id"]: row
            for row in map(json.loads, self.gold.read_text().splitlines())
        }
        with tempfile.TemporaryDirectory(prefix="task1-perfect-") as directory:
            scratch = Path(directory)
            predictions = scratch / "predictions.jsonl"
            archive = scratch / "perfect.zip"
            with predictions.open("w", encoding="utf-8", newline="\n") as handle:
                for case_id, question in questions.items():
                    row = {
                        "schema_version": "finreason.task1.prediction/1.0.0",
                        "dataset_version": question["dataset_version"],
                        "case_id": case_id,
                        "final_answer": {"value": gold[case_id]["final_value"]},
                        "steps": [
                            {"slot_id": slot["slot_id"], "value": gold[case_id]["slot_values"][slot["slot_id"]]}
                            for slot in question["trace_spec"]["slots"]
                        ],
                    }
                    handle.write(json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n")
            build_submission_archive(predictions, archive)
            completed = _run(archive, self.gold, self.manifest)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            result = json.loads(completed.stdout)
            self.assertEqual(result["seen_fac"], "1.000000")
            self.assertEqual(result["seen_checkpoint"], "1.000000")
            self.assertEqual(result["case_count"], 580)


class DevelopmentRejectionAcceptance(unittest.TestCase):
    def test_malformed_archive_is_rejected_before_reference_access(self) -> None:
        with tempfile.TemporaryDirectory(prefix="task1-reject-") as directory:
            archive = Path(directory) / "invalid.zip"
            archive.write_bytes(b"not a zip")
            missing = Path(directory) / "must-not-be-read.jsonl"
            completed = _run(archive, missing, missing)
            self.assertEqual(completed.returncode, 2)
            self.assertEqual(json.loads(completed.stdout)["error_code"], "SUBMISSION_REJECTED")


if __name__ == "__main__":
    unittest.main()
