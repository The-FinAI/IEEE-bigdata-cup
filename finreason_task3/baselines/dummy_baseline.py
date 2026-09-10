#!/usr/bin/env python3
"""Trivial baseline: emit a well-formed prediction for every case.

Its only job is to demonstrate the input->prediction->validate->score loop.
It needs no GPU, no API key and no network. Accuracy is irrelevant.

    python baselines/dummy_baseline.py \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from task3_core.io import DataError, load_inputs, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument("--value", default="0", help="Constant emitted for both fields (default: 0)")
    args = parser.parse_args()

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    predictions = [
        ParticipantPrediction(
            id=case_id,
            extracted_value=args.value,
            calculated_value=args.value,
        ).to_dict()
        for case_id in inputs
    ]
    count = write_jsonl(args.output, predictions)

    print(f"Wrote {count} predictions to {args.output}")
    print("\nNext:")
    print(f"  python scripts/validate_submission.py --predictions {args.output} --reference {args.input}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
