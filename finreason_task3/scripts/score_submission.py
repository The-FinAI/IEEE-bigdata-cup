#!/usr/bin/env python3
"""Score a Task 3 submission with the official FinMR A/S/E/C evaluator.

Participants (local development):

    python scripts/score_submission.py \
        --predictions predictions.jsonl \
        --gold data/public_dev.jsonl

Organizers (official run against a frozen config):

    python scripts/score_submission.py \
        --predictions submissions/team_a.jsonl \
        --gold /path/to/private_test_gold.jsonl \
        --config configs/official_evaluation.yaml \
        --output-dir results/team_a

The judge needs OPENAI_API_KEY in the environment (see .env.example).
Use --judge deterministic for an API-free rule-based run - useful for smoke
tests, but NOT the official metric.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import _bootstrap  # noqa: F401

from evaluation.config import EvaluationConfig
from evaluation.evaluator import IncompleteSubmissionError, evaluate
from task3_core.io import DataError, load_gold, load_predictions
from task3_core.validation import validate_predictions

ROOT = Path(__file__).resolve().parent.parent


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--predictions", required=True)
    parser.add_argument("--gold", required=True)
    parser.add_argument("--config", default=None, help="YAML config (default: built-in defaults)")
    parser.add_argument("--output-dir", default=None, help="Write case_results/summary/metadata here")
    parser.add_argument("--format", dest="fmt", default="native", choices=("native", "lm-eval"))
    parser.add_argument("--submission-name", default=None, help="Label used in the report")

    parser.add_argument("--judge", default=None, help="Override judge provider (openai/deterministic/mock)")
    parser.add_argument("--model", default=None, help="Override judge model")
    parser.add_argument("--prompt-version", default=None)
    parser.add_argument("--workers", type=int, default=None)
    parser.add_argument("--max-retries", type=int, default=None)
    parser.add_argument(
        "--missing-policy", default=None,
        choices=("invalid_submission", "structural_error", "skip"),
        help="Override missing_prediction_policy",
    )

    cache = parser.add_mutually_exclusive_group()
    cache.add_argument("--cache", dest="cache", action="store_true", default=None)
    cache.add_argument("--no-cache", dest="cache", action="store_false")
    parser.add_argument("--cache-path", default=None)
    parser.add_argument(
        "--resume", action="store_true",
        help="Reuse cached judgements (equivalent to --cache; kept for discoverability)",
    )
    parser.add_argument("--limit", type=int, default=None, help="Score only the first N cases (debugging)")
    parser.add_argument("--skip-validation", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )

    config = EvaluationConfig.load(args.config)
    if args.judge:
        config.judge.provider = args.judge
    if args.model:
        config.judge.model = args.model
    if args.prompt_version:
        config.prompt_version = args.prompt_version
    if args.workers is not None:
        config.workers = args.workers
    if args.max_retries is not None:
        config.max_retries = args.max_retries
    if args.missing_policy:
        config.missing_prediction_policy = args.missing_policy
    if args.cache is not None:
        config.cache = args.cache
    if args.resume:
        config.cache = True
    if args.cache_path:
        config.cache_path = args.cache_path
    config.__post_init__()  # re-validate after overrides

    try:
        gold = load_gold(args.gold)
        predictions, load_errors = load_predictions(args.predictions, fmt=args.fmt)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    case_ids = list(gold)
    if args.limit:
        # --limit scores a debugging subset. Predictions for cases outside that
        # subset are not an error - a complete file is the normal input here -
        # so narrow the predictions to match instead of flagging the remainder
        # as unexpected ids.
        case_ids = case_ids[: args.limit]
        predictions = {k: v for k, v in predictions.items() if k in set(case_ids)}

    if not args.skip_validation:
        # A non-official missing-prediction policy is an explicit request to score
        # an incomplete file, so validation must not block it first.
        lenient = config.missing_prediction_policy != "invalid_submission"
        report = validate_predictions(
            predictions,
            case_ids,
            load_errors=load_errors,
            predictions_path=str(args.predictions),
            reference_path=str(args.gold),
            allow_empty_values=lenient,
            allow_missing=config.missing_prediction_policy == "skip",
        )
        if not report.ok:
            print(report.render(), file=sys.stderr)
            print(
                "\nSubmission did not pass validation. Fix the errors above, or re-run with "
                "--missing-policy structural_error to score an incomplete submission "
                "(never the official rule for the final leaderboard).",
                file=sys.stderr,
            )
            return 2
        for warning in report.warnings:
            print(f"WARNING: {warning}", file=sys.stderr)
    elif load_errors:
        for error in load_errors:
            print(f"WARNING: {error}", file=sys.stderr)

    submission_name = args.submission_name or Path(args.predictions).stem

    try:
        run = evaluate(
            gold,
            predictions,
            config,
            case_ids=case_ids,
            submission_name=submission_name,
            predictions_path=args.predictions,
            gold_path=args.gold,
            cache_dir=ROOT,
            show_progress=not args.quiet,
        )
    except IncompleteSubmissionError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    print()
    print(run.summary.render(submission_name))

    if run.summary.invalid_judge_outputs:
        print(
            f"\nWARNING: {run.summary.invalid_judge_outputs} case(s) received no valid judge "
            "label after retries; see case_results.jsonl for the raw responses.",
            file=sys.stderr,
        )

    if args.output_dir:
        out = run.write(args.output_dir, submission_name)
        print(f"\nWrote results to {out}/")
        for name in ("evaluation_report.txt", "evaluation_summary.json",
                     "evaluation_metadata.json", "case_results.jsonl"):
            print(f"  {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
