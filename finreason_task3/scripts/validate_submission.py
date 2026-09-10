#!/usr/bin/env python3
"""Validate a Task 3 submission before scoring it.

Validation is ID-based: predictions are matched to reference cases by ``id``,
never by row order.

    python scripts/validate_submission.py \
        --predictions predictions.jsonl \
        --reference data/public_dev_inputs.jsonl

Exit codes: 0 = valid, 1 = invalid, 2 = could not run (bad arguments/paths).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import _bootstrap  # noqa: F401

from task3_core.io import DataError
from task3_core.schema import SchemaError, SubmissionMetadata
from task3_core.validation import validate_submission_file


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--predictions", required=True, help="predictions.jsonl to validate")
    parser.add_argument(
        "--reference",
        default="data/public_dev_inputs.jsonl",
        help="Inputs or gold file defining the expected case ids",
    )
    parser.add_argument("--format", dest="fmt", default="native", choices=("native", "lm-eval"))
    parser.add_argument(
        "--reference-kind", default="auto", choices=("auto", "inputs", "gold"),
        help="How to read --reference (default: auto-detect)",
    )
    parser.add_argument(
        "--allow-empty-values", action="store_true",
        help="Downgrade empty extracted/calculated values from error to warning",
    )
    parser.add_argument("--metadata", default=None, help="Optional metadata.json to validate too")
    parser.add_argument("--json", dest="json_out", default=None, help="Write the report as JSON")
    args = parser.parse_args()

    try:
        report = validate_submission_file(
            args.predictions,
            args.reference,
            fmt=args.fmt,
            reference_kind=args.reference_kind,
            allow_empty_values=args.allow_empty_values,
        )
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.metadata:
        try:
            SubmissionMetadata.from_dict(json.loads(Path(args.metadata).read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError, SchemaError) as exc:
            report.errors.append(f"metadata.json: {exc}")

    print(report.render())

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report.to_dict(), indent=2) + "\n", encoding="utf-8")
        print(f"\nWrote {args.json_out}")

    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
