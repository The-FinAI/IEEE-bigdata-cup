#!/usr/bin/env python3
"""Build the Task 3 public development package from the FinMR benchmark.

Reads the canonical FinMR dataset (from the Hugging Face Hub, or from a local
snapshot) and writes:

    data/public_dev.jsonl          full cases: id, dqc_id, query, answer, source
    data/public_dev_inputs.jsonl   input-only: id, dqc_id, query
    data/public_dev_manifest.json  counts, hashes, provenance

FinMR quirks handled here (verified against the released parquet, 332 cases):

* ``query`` and ``dqc_id`` are stored JSON-encoded (a quoted string containing
  escaped content).  They are decoded once so participants see plain text.
* ``answer`` is a JSON object string with exactly the two FinMR answer keys.
* Original integer ids are preserved in ``source.source_id`` and mapped
  deterministically to ``DEV_{id:06d}``, so provenance is never destroyed.

Usage:
    python scripts/prepare_public_dev.py
    python scripts/prepare_public_dev.py --input data/raw/TheFinAI__FinMR --output-dir data
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import _bootstrap  # noqa: F401

from task3_core import DATASET_VERSION
from task3_core.io import sha256_file, write_jsonl
from task3_core.schema import DevelopmentExample, GoldAnswer, SchemaError

DEFAULT_REPO = "TheFinAI/FinMR"
ID_PREFIX = "DEV"


def _maybe_json_decode(value: Any) -> str:
    """FinMR stores some text fields double-encoded; decode exactly one layer.

    ``'"DQC_US_0015"'`` -> ``'DQC_US_0015'``; a plain string is returned as-is.
    """
    if not isinstance(value, str):
        return str(value)
    text = value.strip()
    if len(text) >= 2 and text[0] == '"' and text[-1] == '"':
        try:
            decoded = json.loads(text)
        except json.JSONDecodeError:
            return value
        if isinstance(decoded, str):
            return decoded
    return value


def _parse_answer(value: Any, row_index: int) -> GoldAnswer:
    if isinstance(value, dict):
        return GoldAnswer.from_dict(value, f"row {row_index} answer")
    text = _maybe_json_decode(value)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SchemaError(f"row {row_index}: answer is not valid JSON: {text[:120]!r}") from exc
    return GoldAnswer.from_dict(parsed, f"row {row_index} answer")


def load_rows(input_path: Path | None, repo: str, revision: str | None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Return ``(rows, provenance)`` from a local snapshot or the Hub."""
    provenance: Dict[str, Any] = {"repo": repo, "revision": revision}

    if input_path is not None:
        files = sorted(Path(input_path).rglob("*.parquet")) if Path(input_path).is_dir() else [Path(input_path)]
        if not files:
            raise SystemExit(f"ERROR: no .parquet file found under {input_path}")
        provenance["source"] = "local"
        provenance["files"] = [str(f) for f in files]
    else:
        try:
            from huggingface_hub import snapshot_download
        except ImportError as exc:
            raise SystemExit(
                "ERROR: huggingface_hub is required to fetch FinMR. "
                "pip install -r requirements.txt, or pass --input with a local snapshot."
            ) from exc
        local_dir = snapshot_download(repo_id=repo, repo_type="dataset", revision=revision)
        files = sorted(Path(local_dir).rglob("*.parquet"))
        if not files:
            raise SystemExit(f"ERROR: no .parquet file found in {repo}")
        provenance["source"] = "huggingface"
        provenance["local_dir"] = str(local_dir)
        provenance["files"] = [str(f.relative_to(local_dir)) for f in files]

    try:
        import pandas as pd
    except ImportError as exc:
        raise SystemExit("ERROR: pandas is required. pip install -r requirements.txt") from exc

    frames = [pd.read_parquet(f) for f in files]
    frame = pd.concat(frames, ignore_index=True) if len(frames) > 1 else frames[0]
    provenance["num_rows"] = int(len(frame))
    provenance["columns"] = list(frame.columns)
    return frame.to_dict(orient="records"), provenance


def build_examples(rows: Iterable[Dict[str, Any]]) -> List[DevelopmentExample]:
    examples: List[DevelopmentExample] = []
    seen: Dict[str, int] = {}
    for index, row in enumerate(rows):
        source_id = row.get("id", index)
        try:
            numeric_id = int(source_id)
            case_id = f"{ID_PREFIX}_{numeric_id:06d}"
        except (TypeError, ValueError):
            case_id = f"{ID_PREFIX}_{str(source_id)}"
        if case_id in seen:
            raise SystemExit(
                f"ERROR: duplicate FinMR id {source_id!r} at rows {seen[case_id]} and {index}. "
                "The deterministic id mapping requires unique source ids."
            )
        seen[case_id] = index

        examples.append(
            DevelopmentExample(
                id=case_id,
                dqc_id=_maybe_json_decode(row.get("dqc_id", "")),
                query=_maybe_json_decode(row.get("query", "")),
                answer=_parse_answer(row.get("answer"), index),
                source={
                    "dataset": "TheFinAI/FinMR",
                    "split": "test",
                    "source_id": source_id if isinstance(source_id, (int, str)) else str(source_id),
                },
            )
        )
    return examples


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default=None, help="Local parquet file or snapshot directory")
    parser.add_argument("--repo", default=DEFAULT_REPO, help=f"HF dataset repo (default: {DEFAULT_REPO})")
    parser.add_argument("--revision", default=None, help="Pin a commit/tag for reproducibility")
    parser.add_argument("--output-dir", default="data", help="Where to write the package (default: data)")
    parser.add_argument("--dataset-version", default=DATASET_VERSION)
    args = parser.parse_args()

    rows, provenance = load_rows(Path(args.input) if args.input else None, args.repo, args.revision)
    print(f"Loaded {len(rows)} FinMR rows; columns: {provenance.get('columns')}")

    examples = build_examples(rows)

    output_dir = Path(args.output_dir)
    dev_path = output_dir / "public_dev.jsonl"
    inputs_path = output_dir / "public_dev_inputs.jsonl"

    write_jsonl(dev_path, (e.to_dict() for e in examples))
    write_jsonl(inputs_path, (e.to_input().to_dict() for e in examples))

    manifest = {
        "dataset_version": args.dataset_version,
        "num_cases": len(examples),
        "dqc_distribution": _counts(e.dqc_id for e in examples),
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "provenance": provenance,
        "id_scheme": f"{ID_PREFIX}_{{source_id:06d}} (deterministic from the FinMR integer id)",
        "files": {
            "public_dev.jsonl": {
                "sha256": sha256_file(dev_path),
                "bytes": dev_path.stat().st_size,
            },
            "public_dev_inputs.jsonl": {
                "sha256": sha256_file(inputs_path),
                "bytes": inputs_path.stat().st_size,
            },
        },
    }
    (output_dir / "public_dev_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\nWrote {len(examples)} cases:")
    print(f"  {dev_path}    ({dev_path.stat().st_size / 1e6:.1f} MB)")
    print(f"  {inputs_path} ({inputs_path.stat().st_size / 1e6:.1f} MB)")
    print(f"  {output_dir / 'public_dev_manifest.json'}")
    print(f"\nDQC distribution: {manifest['dqc_distribution']}")
    print("\nNext: run your system over data/public_dev_inputs.jsonl,")
    print("      then scripts/validate_submission.py and scripts/score_submission.py")
    return 0


def _counts(values: Iterable[str]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for value in values:
        out[value] = out.get(value, 0) + 1
    return dict(sorted(out.items()))


if __name__ == "__main__":
    sys.exit(main())
