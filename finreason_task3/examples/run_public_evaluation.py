#!/usr/bin/env python3
"""Worked example: the whole Task 3 loop in one file, no API key required.

    python examples/run_public_evaluation.py

Builds a small submission from the public development inputs, validates it,
scores it with the rule-based evaluator, and prints the results. Read it as
the shortest complete statement of how the pieces fit together.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from evaluation.config import EvaluationConfig, JudgeConfig  # noqa: E402
from evaluation.evaluator import evaluate  # noqa: E402
from evaluation.judge import DeterministicJudge  # noqa: E402
from task3_core.io import load_gold, load_predictions, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction  # noqa: E402
from task3_core.validation import validate_predictions  # noqa: E402

GOLD = ROOT / "data" / "public_dev.jsonl"
LIMIT = 25


def my_system(case) -> ParticipantPrediction:
    """Stand in for a real system.

    A real implementation reads ``case.query`` - the filing context and the two
    questions - and returns the reported value and the calculated value. This one
    cheats: it copies the gold answer for half the cases and gets the rest wrong,
    so the report below shows a mixture of labels.
    """
    index = int(case.id.rsplit("_", 1)[1])
    if index % 2 == 0:
        return ParticipantPrediction(case.id, case.answer.extracted_value,
                                     case.answer.calculated_value)
    return ParticipantPrediction(case.id, "0", "0")


def main() -> int:
    if not GOLD.is_file():
        print(f"ERROR: {GOLD} not found.\n"
              "       Run: python scripts/prepare_public_dev.py", file=sys.stderr)
        return 1

    # 1. Load the development cases.
    gold = load_gold(GOLD)
    case_ids = list(gold)[:LIMIT]
    print(f"Loaded {len(gold)} development cases; using the first {len(case_ids)}.\n")

    example = gold[case_ids[0]]
    print(f"Example case {example.id} ({example.dqc_id}):")
    print(f"  query: {len(example.query):,} characters")
    print(f"  gold:  {example.answer.to_dict()}\n")

    # 2. Run "your system" and write a submission.
    with tempfile.TemporaryDirectory() as tmp:
        predictions_path = Path(tmp) / "predictions.jsonl"
        write_jsonl(predictions_path,
                    (my_system(gold[cid]).to_dict() for cid in case_ids))
        print(f"Wrote {len(case_ids)} predictions.\n")

        # 3. Validate before scoring - always.
        predictions, load_errors = load_predictions(predictions_path)
        report = validate_predictions(predictions, case_ids, load_errors=load_errors)
        print(f"Validation: {'VALID' if report.ok else 'INVALID'}")
        for error in report.errors:
            print(f"  ERROR: {error}")
        if not report.ok:
            return 1
        print()

        # 4. Score. The official judge is an LLM; this uses the rule-based
        #    evaluator so the example runs with no API key.
        config = EvaluationConfig(
            judge=JudgeConfig(provider="deterministic"),
            cache=False,
            missing_prediction_policy="skip",
        )
        run = evaluate(gold, predictions, config, judge=DeterministicJudge(config),
                       case_ids=case_ids, submission_name="example",
                       show_progress=False)

    print(run.summary.render("example"))
    print("\nFirst few case-level records:\n")
    for result in run.case_results[:5]:
        print(f"  {result.id}  gold={result.gold}  "
              f"pred={ {k: v for k, v in result.prediction.items() if k != 'id'} }  "
              f"-> {result.label}")

    print("\nWith the official judge instead:")
    print("  export OPENAI_API_KEY=sk-...")
    print("  python scripts/score_submission.py \\")
    print("      --predictions predictions.jsonl --gold data/public_dev.jsonl")
    return 0


if __name__ == "__main__":
    sys.exit(main())
