#!/usr/bin/env python3
"""Template: answer Task 3 cases with Claude via the Anthropic API.

    export ANTHROPIC_API_KEY=sk-ant-...
    python baselines/claude_api_template.py \
        --model claude-opus-5 \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl \
        --workers 4

Why this is a separate file from llm_api_template.py: Anthropic's native API is
not OpenAI-shaped (different SDK, different message/response types, thinking
blocks, refusal stop reasons), so it gets its own template rather than being
bolted onto the provider-neutral one.

Context is a non-issue here. The current Claude models have a 1M-token context
window and FinMR's longest query is ~42k tokens, so nothing is truncated by
default -- unlike the local-model templates, which have to cut queries to fit.

Thinking is on (adaptive) by default: deriving a value from a calculation
linkbase is exactly the kind of multi-step reasoning it helps with. Turn the
cost down with --effort rather than switching thinking off.

Pipeline:  query -> Claude -> response parser -> {extracted_value, calculated_value} -> JSONL
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from baselines.llm_api_template import parse_model_output, truncate_query  # noqa: E402
from task3_core.io import DataError, load_inputs, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction, TestInput  # noqa: E402

_PRINT_LOCK = threading.Lock()

# The FinMR query already carries full instructions and the required output
# format, so it is sent as-is; the system prompt only reinforces the shape.
SYSTEM_PROMPT = (
    "You are an expert XBRL financial-statement auditor. "
    "Answer with a single JSON object and nothing else."
)

#: Rough context windows, for the --model help text only.
KNOWN_MODELS = (
    "claude-opus-5",
    "claude-sonnet-5",
    "claude-haiku-4-5",
    "claude-fable-5-1",
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument("--model", default="claude-opus-5",
                        help=f"Model id (e.g. {', '.join(KNOWN_MODELS)})")
    parser.add_argument("--api-key-env", default="ANTHROPIC_API_KEY")
    parser.add_argument("--max-tokens", type=int, default=8192,
                        help="Output budget. Thinking tokens count toward it, so leave room.")
    parser.add_argument("--effort", default="high",
                        choices=("low", "medium", "high", "xhigh", "max"),
                        help="Reasoning depth and token spend. Lower this to cut cost.")
    parser.add_argument(
        "--reasoning", default="adaptive", choices=("adaptive", "off"),
        help="'adaptive' (default) lets the model decide how much to think. 'off' "
             "sends thinking={type: disabled}. Prefer lowering --effort over turning "
             "thinking off: the API rejects disabled thinking above effort 'high', "
             "and a thinking-off model is more likely to narrate instead of "
             "answering. Verified against the live API.")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N cases")
    parser.add_argument("--max-query-chars", type=int, default=None,
                        help="Truncate the query. Rarely needed: the context window is 1M tokens.")
    parser.add_argument("--truncate-mode", default="tail", choices=("tail", "head"))
    parser.add_argument("--save-raw", action="store_true",
                        help="Keep the raw model text in the output for your own auditing")
    parser.add_argument("--resume", action="store_true",
                        help="Skip cases already present in --output and append the rest")
    return parser


def answer_text(response) -> str:
    """Concatenate the text blocks of a response, ignoring thinking blocks."""
    return "".join(b.text for b in response.content if b.type == "text")


def main() -> int:
    args = build_parser().parse_args()

    api_key = os.environ.get(args.api_key_env, "").strip()
    if not api_key:
        print(
            f"ERROR: {args.api_key_env} is not set. Copy .env.example to .env and fill it in,\n"
            f"       or run: export {args.api_key_env}=sk-ant-...",
            file=sys.stderr,
        )
        return 1

    try:
        import anthropic
    except ImportError:
        print("ERROR: pip install 'anthropic>=1.0'", file=sys.stderr)
        return 1

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    case_ids = list(inputs)[: args.limit] if args.limit else list(inputs)

    # A full 332-case pass is a real amount of money; append as we go and allow
    # --resume so an interrupted run is not paid for twice.
    output_path = Path(args.output)
    done = set()
    if args.resume and output_path.is_file():
        for line in output_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    done.add(json.loads(line)["id"])
                except (json.JSONDecodeError, KeyError):
                    continue
        print(f"Resuming: {len(done)} case(s) already in {output_path}", flush=True)
    elif output_path.exists():
        output_path.unlink()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # thinking={"type": "disabled"} is only accepted at effort "high" or below;
    # pairing it with xhigh/max is a 400 from the API.
    effort = args.effort
    if args.reasoning == "off" and effort in ("xhigh", "max"):
        print(f"NOTE: effort '{effort}' cannot be combined with --reasoning off; "
              f"using 'high' instead", flush=True)
        effort = "high"
    thinking = {"type": "adaptive"} if args.reasoning == "adaptive" else {"type": "disabled"}

    todo = [cid for cid in case_ids if cid not in done]
    print(f"Querying {args.model} for {len(todo)} case(s) "
          f"(thinking={args.reasoning}, effort={effort}, workers={args.workers})", flush=True)

    client = anthropic.Anthropic(api_key=api_key)
    handle = output_path.open("a", encoding="utf-8")
    write_lock = threading.Lock()

    def answer(case: TestInput) -> Dict[str, object]:
        prompt = truncate_query(case.query, args.max_query_chars, args.truncate_mode)
        raw = ""
        try:
            # Streaming: the input is long and thinking may run for a while, so
            # a non-streaming call risks an HTTP timeout.
            with client.messages.stream(
                model=args.model,
                max_tokens=args.max_tokens,
                system=SYSTEM_PROMPT,
                thinking=thinking,
                output_config={"effort": effort},
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                response = stream.get_final_message()

            if response.stop_reason == "refusal":
                detail = getattr(response, "stop_details", None)
                with _PRINT_LOCK:
                    print(f"WARNING: {case.id}: request declined "
                          f"({getattr(detail, 'category', 'unknown')})", file=sys.stderr)
            else:
                raw = answer_text(response)
                if response.stop_reason == "max_tokens":
                    with _PRINT_LOCK:
                        print(f"WARNING: {case.id}: hit max_tokens; raise --max-tokens "
                              f"or lower --effort", file=sys.stderr)
        except anthropic.RateLimitError as exc:
            with _PRINT_LOCK:
                print(f"WARNING: {case.id}: rate limited ({exc}); lower --workers",
                      file=sys.stderr)
        except anthropic.APIStatusError as exc:
            with _PRINT_LOCK:
                print(f"WARNING: {case.id}: API error {exc.status_code}: {exc.message}",
                      file=sys.stderr)
        except anthropic.APIConnectionError as exc:
            with _PRINT_LOCK:
                print(f"WARNING: {case.id}: connection error: {exc}", file=sys.stderr)

        extracted, calculated = parse_model_output(raw)
        # Always emit both fields: an empty value would fail validation.
        record = ParticipantPrediction(
            id=case.id,
            extracted_value=extracted or "0",
            calculated_value=calculated or "0",
            raw_output=raw if args.save_raw else None,
        ).to_dict(include_raw=args.save_raw)

        with write_lock:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
            handle.flush()
        return record

    try:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            for _ in _progress(pool.map(answer, (inputs[c] for c in todo)), len(todo)):
                pass
    finally:
        handle.close()

    total = len(done) + len(todo)
    print(f"\nWrote {total} predictions to {args.output}")
    print("\nNext:")
    print(f"  python scripts/validate_submission.py --predictions {args.output} "
          f"--reference {args.input}")
    return 0


def _progress(iterable, total: int):
    try:
        from tqdm.auto import tqdm
    except ImportError:
        return iterable
    return tqdm(iterable, total=total, desc="Querying Claude")


if __name__ == "__main__":
    sys.exit(main())
