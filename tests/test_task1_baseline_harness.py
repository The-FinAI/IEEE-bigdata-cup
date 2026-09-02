"""Public-contract tests for deterministic Task 1 baseline materialization."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from finreason_task1.admission import validate_submission_archive
from finreason_task1.baseline_harness import (
    B1_METHOD_ID,
    B2_METHOD_ID,
    B3_METHOD_ID,
    build_llm_requests,
    canonical_json,
    canonical_jsonl,
    load_question_bundle,
    materialize_b1,
    materialize_llm,
    response_envelope,
    validate_llm_requests,
    write_canonical_jsonl,
)
from finreason_task1.contracts import validate_submission


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "task1" / "data" / "development"
CLI = ROOT / "scripts" / "task1_cli.py"


def _decimal_spec(unit: str = "usd", *, places: int | None = 2) -> dict:
    rounding = {"mode": "exact"} if places is None else {
        "mode": "half_up",
        "decimal_places": places,
    }
    return {"type": "decimal", "unit": unit, "rounding": rounding}


def _decimal_question(
    case_id: str,
    text: str,
    *,
    answer_spec: dict | None = None,
    slots: list[dict] | None = None,
) -> dict:
    return {
        "schema_version": "finreason.task1.question/2.0.0",
        "dataset_version": "task1-test-fixture",
        "case_id": case_id,
        "question": text,
        "answer_spec": answer_spec or _decimal_spec(),
        "trace_spec": {"slots": slots or []},
    }


def _enum_question(case_id: str, text: str) -> dict:
    return {
        "schema_version": "finreason.task1.question/2.0.0",
        "dataset_version": "task1-test-fixture",
        "case_id": case_id,
        "question": text,
        "answer_spec": {
            "type": "enum",
            "allowed_values": ["approve", "reject"],
        },
        "trace_spec": {"slots": []},
    }


def _prediction(question: dict, value: str, *, steps: list[dict] | None = None) -> dict:
    return {
        "schema_version": "finreason.task1.prediction/1.0.0",
        "dataset_version": question["dataset_version"],
        "case_id": question["case_id"],
        "final_answer": {"value": value},
        "steps": steps or [],
    }


def _write_jsonl(path: Path, rows: list[dict] | tuple[dict, ...]) -> None:
    path.write_bytes(canonical_jsonl(rows))


class B1MaterializationTests(unittest.TestCase):
    def test_b1_is_canonical_deterministic_and_readmitted(self) -> None:
        question = _decimal_question(
            "t1_aaaaaaaaaaaaaaaa",
            "Synthetic conformance example: 2 + 3 = ?. Return the exact count.",
            answer_spec=_decimal_spec("count", places=None),
            slots=[
                {
                    "slot_id": "trace_1",
                    "position": 1,
                    "description": "Sum.",
                    "result_spec": _decimal_spec("count", places=None),
                }
            ],
        )
        with tempfile.TemporaryDirectory(prefix="task1-b1-test-") as directory:
            root = Path(directory)
            questions_path = root / "questions.jsonl"
            _write_jsonl(questions_path, [question])
            first = root / "first"
            second = root / "second"
            first_card = materialize_b1(
                questions_path,
                first,
                implementation_revision="test-revision",
            )
            second_card = materialize_b1(
                questions_path,
                second,
                implementation_revision="test-revision",
            )

            self.assertEqual((first / "predictions.jsonl").read_bytes(), (second / "predictions.jsonl").read_bytes())
            self.assertEqual((first / "submission.zip").read_bytes(), (second / "submission.zip").read_bytes())
            self.assertEqual((first / "method-card.json").read_bytes(), (second / "method-card.json").read_bytes())
            self.assertEqual(first_card, second_card)
            self.assertEqual(first_card["method_id"], B1_METHOD_ID)
            self.assertEqual(first_card["answered_count"], 1)
            prediction = json.loads((first / "predictions.jsonl").read_text())
            self.assertEqual(prediction["final_answer"], {"value": "5"})
            self.assertEqual(prediction["steps"], [{"slot_id": "trace_1", "value": "5"}])
            _, questions = load_question_bundle(questions_path)
            admitted = validate_submission_archive(first / "submission.zip", questions)
            self.assertTrue(admitted.valid, admitted.issues)
            with zipfile.ZipFile(first / "submission.zip") as archive:
                self.assertEqual(archive.namelist(), ["predictions.jsonl"])
                self.assertEqual(archive.read("predictions.jsonl"), (first / "predictions.jsonl").read_bytes())

    def test_b1_refuses_to_overwrite_output_directory(self) -> None:
        question = _decimal_question(
            "t1_bbbbbbbbbbbbbbbb",
            "Synthetic conformance example: 1 + 1 = ?. Return the exact count.",
            answer_spec=_decimal_spec("count", places=None),
        )
        with tempfile.TemporaryDirectory(prefix="task1-b1-no-clobber-") as directory:
            root = Path(directory)
            questions_path = root / "questions.jsonl"
            _write_jsonl(questions_path, [question])
            output = root / "existing"
            output.mkdir()
            sentinel = output / "sentinel"
            sentinel.write_text("keep")
            with self.assertRaisesRegex(ValueError, "must not already exist"):
                materialize_b1(
                    questions_path,
                    output,
                    implementation_revision="test-revision",
                )
            self.assertEqual(sentinel.read_text(), "keep")

    def test_full_public_b1_is_complete_and_valid(self) -> None:
        questions_path = PUBLIC / "leaderboard_questions.jsonl"
        with tempfile.TemporaryDirectory(prefix="task1-public-b1-") as directory:
            output = Path(directory) / "baseline"
            card = materialize_b1(
                questions_path,
                output,
                implementation_revision="test-revision",
            )
            _, questions = load_question_bundle(questions_path)
            rows = tuple(
                json.loads(line)
                for line in (output / "predictions.jsonl").read_text().splitlines()
            )
            result = validate_submission(rows, questions, require_complete=True)
            self.assertTrue(result.valid, result.issues)
            self.assertEqual(card["record_count"], 580)
            self.assertGreater(card["answered_count"], 0)


class StructuredRequestTests(unittest.TestCase):
    def test_b2_requests_are_ordered_deterministic_and_final_only(self) -> None:
        first = _decimal_question("t1_cccccccccccccccc", "Compute 2 + 3.")
        second = _enum_question("t1_dddddddddddddddd", "Approve or reject?")
        questions = {second["case_id"]: second, first["case_id"]: first}
        left = build_llm_requests("b2", questions)
        right = build_llm_requests(B2_METHOD_ID, dict(reversed(tuple(questions.items()))))
        self.assertEqual(left, right)
        self.assertEqual([row["case_id"] for row in left], sorted(questions))
        self.assertEqual(left[0]["retrieval_case_ids"], [])
        self.assertIn("final answer only", left[0]["response_contract"]["checkpoint_policy"])
        indexed = validate_llm_requests(left, "b2", questions)
        self.assertEqual(set(indexed), set(questions))

    def test_b3_retrieval_uses_only_supplied_public_training_rows(self) -> None:
        target = _decimal_question("t1_eeeeeeeeeeeeeeee", "Compute assets minus liabilities.")
        train_a = _decimal_question("t1_ffffffffffffffff", "Compute assets minus liabilities for a company.")
        train_b = _decimal_question("t1_gggggggggggggggg", "Compute a bond coupon.")
        training_questions = {train_b["case_id"]: train_b, train_a["case_id"]: train_a}
        training_targets = {
            train_a["case_id"]: _prediction(train_a, "4.00"),
            train_b["case_id"]: _prediction(train_b, "5.00"),
        }
        requests = build_llm_requests(
            "b3",
            {target["case_id"]: target},
            train_questions=training_questions,
            train_targets=training_targets,
            retrieval_k=1,
        )
        self.assertEqual(requests[0]["method_id"], B3_METHOD_ID)
        self.assertEqual(requests[0]["retrieval_case_ids"], [train_a["case_id"]])
        payload = json.loads(requests[0]["messages"][1]["content"])
        self.assertEqual(
            [example["case_id"] for example in payload["public_training_examples"]],
            [train_a["case_id"]],
        )


class StructuredMaterializationTests(unittest.TestCase):
    def _materialize(
        self,
        root: Path,
        profile: str,
        question: dict,
        response: object,
        *,
        train_questions: dict[str, dict] | None = None,
        train_targets: dict[str, dict] | None = None,
        duplicate: bool = False,
    ) -> tuple[dict, dict, list[dict]]:
        questions_path = root / "questions.jsonl"
        _write_jsonl(questions_path, [question])
        requests = build_llm_requests(
            profile,
            {question["case_id"]: question},
            train_questions=train_questions,
            train_targets=train_targets,
            retrieval_k=1,
        )
        requests_path = root / "requests.jsonl"
        write_canonical_jsonl(requests_path, requests)
        envelopes = [response_envelope(requests[0], response)]
        if duplicate:
            envelopes.append(response_envelope(requests[0], response))
        responses_path = root / "responses.jsonl"
        _write_jsonl(responses_path, envelopes)
        output = root / "output"
        card = materialize_llm(
            profile,
            questions_path,
            requests_path,
            responses_path,
            output,
            provider="test-provider",
            model_id="test-model",
            model_revision="test-model-revision",
            implementation_revision="test-code-revision",
        )
        prediction = json.loads((output / "predictions.jsonl").read_text())
        diagnostics = [
            json.loads(line)
            for line in (output / "diagnostics.jsonl").read_text().splitlines()
        ]
        return card, prediction, diagnostics

    def test_b2_binds_identity_and_accepts_exact_structured_final(self) -> None:
        question = _decimal_question("t1_hhhhhhhhhhhhhhhh", "Compute 2 + 3.")
        with tempfile.TemporaryDirectory(prefix="task1-b2-ok-") as directory:
            card, prediction, diagnostics = self._materialize(
                Path(directory),
                "b2",
                question,
                canonical_json({"final_answer": {"value": "5.00"}}),
            )
        self.assertEqual(prediction, _prediction(question, "5.00"))
        self.assertEqual(diagnostics, [])
        self.assertEqual(card["method_id"], B2_METHOD_ID)
        self.assertEqual(card["method"]["provider"], "test-provider")
        self.assertEqual(card["method"]["decoding"], {"strategy": "greedy"})

    def test_b2_does_not_salvage_fenced_or_extra_content(self) -> None:
        question = _decimal_question("t1_iiiiiiiiiiiiiiii", "Compute 2 + 3.")
        invalid_outputs = (
            "```json\n{\"final_answer\":{\"value\":\"5.00\"}}\n```",
            '{"final_answer":{"value":"5.00"},"case_id":"t1_iiiiiiiiiiiiiiii"}',
            '{"final_answer":{"value":"5.00"},"final_answer":null}',
        )
        for index, response in enumerate(invalid_outputs):
            with self.subTest(index=index), tempfile.TemporaryDirectory(prefix="task1-b2-bad-") as directory:
                card, prediction, diagnostics = self._materialize(
                    Path(directory), "b2", question, response
                )
                self.assertIsNone(prediction["final_answer"])
                self.assertEqual(prediction["steps"], [])
                self.assertEqual(card["abstention_count"], 1)
                self.assertEqual(len(diagnostics), 1)
                self.assertIn(diagnostics[0]["code"], {"E_RESPONSE_PARSE", "E_RESPONSE_SCHEMA"})

    def test_duplicate_response_abstains_instead_of_selecting_one(self) -> None:
        question = _decimal_question("t1_jjjjjjjjjjjjjjjj", "Compute 2 + 3.")
        with tempfile.TemporaryDirectory(prefix="task1-b2-duplicate-") as directory:
            _, prediction, diagnostics = self._materialize(
                Path(directory),
                "b2",
                question,
                {"final_answer": {"value": "5.00"}},
                duplicate=True,
            )
        self.assertIsNone(prediction["final_answer"])
        self.assertEqual([row["code"] for row in diagnostics], ["E_DUPLICATE_RESPONSE"])

    def test_b3_executes_exact_fraction_program_and_orders_slots(self) -> None:
        slots = [
            {
                "slot_id": "trace_1",
                "position": 1,
                "description": "Initial ratio.",
                "result_spec": _decimal_spec("multiple", places=None),
            },
            {
                "slot_id": "trace_2",
                "position": 2,
                "description": "Adjusted liabilities.",
                "result_spec": _decimal_spec("usd", places=None),
            },
            {
                "slot_id": "trace_3",
                "position": 3,
                "description": "Adjusted ratio.",
                "result_spec": _decimal_spec("multiple", places=None),
            },
        ]
        question = _decimal_question(
            "t1_kkkkkkkkkkkkkkkk",
            "Compute the decrease from 127/55 to 127/70.",
            answer_spec=_decimal_spec("multiple", places=2),
            slots=slots,
        )
        train = _decimal_question("t1_llllllllllllllll", "Compute a ratio decrease.")
        response = {
            "kind": "pal",
            "instructions": [
                {"id": "v1", "op": "literal", "value": "127"},
                {"id": "v2", "op": "literal", "value": "55"},
                {"id": "v3", "op": "div", "args": ["v1", "v2"]},
                {"id": "v4", "op": "literal", "value": "70000"},
                {"id": "v5", "op": "literal", "value": "70"},
                {"id": "v6", "op": "div", "args": ["v1", "v5"]},
                {"id": "v7", "op": "sub", "args": ["v3", "v6"]},
            ],
            "final_ref": "v7",
            "slot_refs": [
                {"slot_id": "trace_1", "value_ref": "v3"},
                {"slot_id": "trace_2", "value_ref": "v4"},
                {"slot_id": "trace_3", "value_ref": "v6"},
            ],
        }
        with tempfile.TemporaryDirectory(prefix="task1-b3-pal-") as directory:
            card, prediction, diagnostics = self._materialize(
                Path(directory),
                "b3",
                question,
                response,
                train_questions={train["case_id"]: train},
                train_targets={train["case_id"]: _prediction(train, "1.00")},
            )
        self.assertEqual(prediction["final_answer"], {"value": "0.49"})
        self.assertEqual(
            prediction["steps"],
            [
                {"slot_id": "trace_1", "value": "127/55"},
                {"slot_id": "trace_2", "value": "70000"},
                {"slot_id": "trace_3", "value": "127/70"},
            ],
        )
        self.assertEqual(diagnostics, [])
        self.assertEqual(card["method_id"], B3_METHOD_ID)
        self.assertEqual(card["method"]["retrieval"]["source"], "public_train_only")
        self.assertEqual(card["method"]["executor"]["numeric_types"], ["Decimal", "Fraction"])

    def test_b3_division_by_zero_abstains_whole_case(self) -> None:
        question = _decimal_question("t1_mmmmmmmmmmmmmmmm", "Compute 1 / 0.")
        train = _decimal_question("t1_nnnnnnnnnnnnnnnn", "Compute 1 / 2.")
        response = {
            "kind": "pal",
            "instructions": [
                {"id": "v1", "op": "literal", "value": "1"},
                {"id": "v2", "op": "literal", "value": "0"},
                {"id": "v3", "op": "div", "args": ["v1", "v2"]},
            ],
            "final_ref": "v3",
            "slot_refs": [],
        }
        with tempfile.TemporaryDirectory(prefix="task1-b3-zero-") as directory:
            _, prediction, diagnostics = self._materialize(
                Path(directory),
                "b3",
                question,
                response,
                train_questions={train["case_id"]: train},
                train_targets={train["case_id"]: _prediction(train, "0.50")},
            )
        self.assertIsNone(prediction["final_answer"])
        self.assertEqual([row["code"] for row in diagnostics], ["E_PAL_ARITHMETIC"])

    def test_b3_direct_enum_response_uses_no_executor(self) -> None:
        question = _enum_question("t1_oooooooooooooooo", "Approve or reject?")
        train = _enum_question("t1_pppppppppppppppp", "Approve this control?")
        response = {
            "kind": "prediction",
            "final_answer": {"value": "approve"},
            "slot_values": {},
        }
        with tempfile.TemporaryDirectory(prefix="task1-b3-enum-") as directory:
            _, prediction, diagnostics = self._materialize(
                Path(directory),
                "b3",
                question,
                response,
                train_questions={train["case_id"]: train},
                train_targets={train["case_id"]: _prediction(train, "reject")},
            )
        self.assertEqual(prediction["final_answer"], {"value": "approve"})
        self.assertEqual(prediction["steps"], [])
        self.assertEqual(diagnostics, [])


class CliAndBoundaryTests(unittest.TestCase):
    def test_cli_materializes_b1_without_mixing_report_into_predictions(self) -> None:
        question = _decimal_question(
            "t1_qqqqqqqqqqqqqqqq",
            "Synthetic conformance example: 7 + 4 = ?. Return the exact count.",
            answer_spec=_decimal_spec("count", places=None),
        )
        with tempfile.TemporaryDirectory(prefix="task1-b1-cli-") as directory:
            root = Path(directory)
            questions_path = root / "questions.jsonl"
            _write_jsonl(questions_path, [question])
            output = root / "output"
            completed = subprocess.run(
                [
                    sys.executable,
                    str(CLI),
                    "baseline-b1-materialize",
                    "--questions",
                    str(questions_path),
                    "--output-dir",
                    str(output),
                    "--implementation-revision",
                    "test-revision",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            report = json.loads(completed.stdout)
            self.assertEqual(report["status"], "PASS")
            prediction = json.loads((output / "predictions.jsonl").read_text())
            self.assertEqual(prediction["final_answer"], {"value": "11"})

if __name__ == "__main__":
    unittest.main()
