"""Command-line entry point for organizer-draft structural validation."""

from __future__ import annotations

import argparse
import json

from .core import validate_submission


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", required=True, choices=["task1", "task2", "task3"])
    parser.add_argument("--submission", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    result = validate_submission(args.task, args.submission)
    rendered = json.dumps(result, indent=2, sort_keys=True)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(rendered + "\n")
    print(rendered)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
