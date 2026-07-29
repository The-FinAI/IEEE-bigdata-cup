from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scorers import score
from validators import validate_submission

ROOT = Path(__file__).resolve().parents[1]


class ContractTests(unittest.TestCase):
    def test_all_schema_files_are_valid_json(self) -> None:
        schemas = sorted((ROOT / "tasks").glob("*/schemas/*.json"))
        self.assertEqual(len(schemas), 6)
        for schema in schemas:
            with self.subTest(schema=schema):
                value = json.loads(schema.read_text(encoding="utf-8"))
                self.assertEqual(value["$schema"], "https://json-schema.org/draft/2020-12/schema")
                self.assertIn("required", value)

    def test_task1_structural_validator(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "submission.jsonl"
            path.write_text(
                json.dumps(
                    {
                        "instance_id": "demo-1",
                        "final_answer": "1.25",
                        "reasoning_trace": [],
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            result = validate_submission("task1", path)
            self.assertTrue(result["valid"])
            self.assertEqual(result["record_count"], 1)

    def test_task2_rejects_unknown_action(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "actions.csv"
            path.write_text(
                "episode_id,timestamp,asset_a,asset_b,action,position_size\n"
                "demo,2026-01-01,A,B,BUY,1\n",
                encoding="utf-8",
            )
            result = validate_submission("task2", path)
            self.assertFalse(result["valid"])
            self.assertIn("action must be one of", result["errors"][0])

    def test_scorer_fails_closed(self) -> None:
        with self.assertRaises(NotImplementedError):
            score("task1", "reference", "submission", "output")


if __name__ == "__main__":
    unittest.main()
