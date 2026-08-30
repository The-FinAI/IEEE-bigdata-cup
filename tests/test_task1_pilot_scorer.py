import json
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCORER = ROOT / "scripts" / "task1" / "pilot_scorer.py"


def rows(final_1="120.00", step_1="150.00", final_2="0.25", step_2="0.25"):
    return [
        {
            "case_id": "pilot-001",
            "final_answer": {"value": final_1},
            "steps": [{"slot_id": "gross_profit", "value": {"value": step_1}}],
        },
        {
            "case_id": "pilot-002",
            "final_answer": {"value": final_2},
            "steps": [{"slot_id": "ratio", "value": {"value": step_2}}],
        },
    ]


class PilotScorerTests(unittest.TestCase):
    def score_archive(self, archive_path):
        completed = subprocess.run(
            [sys.executable, str(SCORER), str(archive_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        return json.loads(completed.stdout)

    def run_scorer(self, prediction_rows, *, extra_member=False):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "submission.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                payload = "\n".join(json.dumps(row, separators=(",", ":")) for row in prediction_rows) + "\n"
                archive.writestr("predictions.jsonl", payload)
                if extra_member:
                    archive.writestr("extra.txt", "not allowed")
            return self.score_archive(archive_path)

    def test_perfect_and_reordered_predictions(self):
        perfect = self.run_scorer(rows())
        reordered = self.run_scorer(list(reversed(rows())))
        self.assertEqual(perfect["seen_fac"], "1.000000")
        self.assertEqual(perfect["seen_checkpoint"], "1.000000")
        self.assertEqual(reordered, perfect)

    def test_partial_scores_are_independent(self):
        result = self.run_scorer(rows(final_1="999", step_2="999"))
        self.assertEqual(result["seen_fac"], "0.500000")
        self.assertEqual(result["seen_checkpoint"], "0.500000")

    def test_rejects_extra_member_and_duplicate_case(self):
        self.assertEqual(
            self.run_scorer(rows(), extra_member=True),
            {"status": "participant_error", "error_code": "ARCHIVE_MEMBER_COUNT_INVALID"},
        )
        duplicate = rows()
        duplicate[1]["case_id"] = "pilot-001"
        self.assertEqual(
            self.run_scorer(duplicate),
            {"status": "participant_error", "error_code": "PREDICTION_CASE_ID_INVALID"},
        )

    def test_rejects_traversal_and_symlink_members(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "traversal.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("../predictions.jsonl", "{}\n")
            self.assertEqual(
                self.score_archive(archive_path),
                {"status": "participant_error", "error_code": "ARCHIVE_MEMBER_NAME_INVALID"},
            )

            archive_path = Path(directory) / "symlink.zip"
            link = zipfile.ZipInfo("predictions.jsonl")
            link.create_system = 3
            link.external_attr = (stat.S_IFLNK | 0o777) << 16
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr(link, "target")
            self.assertEqual(
                self.score_archive(archive_path),
                {"status": "participant_error", "error_code": "ARCHIVE_SYMLINK_REJECTED"},
            )

    def test_rejects_high_compression_ratio(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / "compressed.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("predictions.jsonl", "a" * 100_000)
            self.assertEqual(
                self.score_archive(archive_path),
                {"status": "participant_error", "error_code": "ARCHIVE_RATIO_INVALID"},
            )


if __name__ == "__main__":
    unittest.main()
