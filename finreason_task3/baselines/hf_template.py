#!/usr/bin/env python3
"""Template: run a local Hugging Face model over Task 3 cases.

Replace only the model name and the generation configuration:

    python baselines/hf_template.py \
        --model Qwen/Qwen2.5-7B-Instruct \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl

WARNING: FinMR queries are long - median ~115k characters (~30k tokens), max
~167k. Choose a long-context checkpoint, or set --max-input-tokens to truncate.
Truncation costs accuracy; --truncate-mode tail keeps the instruction header and
the trailing questions, which is where the answerable content lives.

Batch size 1 is the default on purpose: with prompts this long, a larger batch
usually runs out of GPU memory before it saves any time.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from baselines.llm_api_template import parse_model_output  # noqa: E402
from task3_core.io import DataError, load_inputs  # noqa: E402
from task3_core.schema import ParticipantPrediction  # noqa: E402

SYSTEM_PROMPT = (
    "You are an expert XBRL financial-statement auditor. "
    "Answer with a single JSON object and nothing else."
)


def count_tokens(tokenizer, text: str) -> int:
    """Token count, without the misleading "longer than maximum length" warning.

    That warning fires whenever we *measure* an over-long query, but measuring is
    exactly how we decide to truncate it - the sequence never reaches the model
    at that length.
    """
    logger = logging.getLogger("transformers.tokenization_utils_base")
    previous = logger.level
    logger.setLevel(logging.ERROR)
    try:
        return len(tokenizer.encode(text, add_special_tokens=False))
    finally:
        logger.setLevel(previous)


def model_context_limit(model, tokenizer) -> Optional[int]:
    """Best-effort usable context length, or ``None`` if it cannot be determined."""
    candidates = [
        getattr(getattr(model, "config", None), "max_position_embeddings", None),
        getattr(tokenizer, "model_max_length", None),
    ]
    usable = [c for c in candidates
              if isinstance(c, int) and 0 < c < 10_000_000]  # HF uses a huge sentinel
    return min(usable) if usable else None


def truncate_tokens(tokenizer, text: str, max_tokens: int, mode: str) -> str:
    """Cut ``text`` to ``max_tokens``.

    ``tail`` keeps the leading instructions and the trailing questions, which is
    where the answerable content lives; ``head`` keeps only the beginning and
    will usually drop the questions entirely.
    """
    logger = logging.getLogger("transformers.tokenization_utils_base")
    previous = logger.level
    logger.setLevel(logging.ERROR)
    try:
        ids = tokenizer.encode(text, add_special_tokens=False)
    finally:
        logger.setLevel(previous)
    if len(ids) <= max_tokens:
        return text
    if mode == "head":
        kept = ids[:max_tokens]
    else:
        head = max_tokens // 4
        kept = ids[:head] + ids[-(max_tokens - head):]
    return tokenizer.decode(kept, skip_special_tokens=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True, help="Hugging Face model id or local path")
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--dtype", default="auto", help="auto | bfloat16 | float16 | float32")
    parser.add_argument("--max-new-tokens", type=int, default=128)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--top-p", type=float, default=1.0)
    parser.add_argument("--max-input-tokens", type=int, default=None,
                        help="Input token budget. Default: the model's own context "
                             "limit minus --max-new-tokens and a small margin.")
    parser.add_argument("--no-auto-truncate", action="store_true",
                        help="Send the full query even if it exceeds the model context "
                             "(will usually crash; for diagnosis only)")
    parser.add_argument("--truncate-mode", default="tail", choices=("tail", "head"))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--trust-remote-code", action="store_true")
    parser.add_argument("--save-raw", action="store_true")
    parser.add_argument("--resume", action="store_true",
                        help="Skip cases already present in --output and append the rest. "
                             "A 332-case run takes hours; this makes it restartable.")
    args = parser.parse_args()

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError:
        print("ERROR: pip install torch transformers  (see requirements.txt extras)", file=sys.stderr)
        return 1

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    case_ids = list(inputs)[: args.limit] if args.limit else list(inputs)

    print(f"Loading {args.model} ...", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=args.trust_remote_code)
    dtype = getattr(torch, args.dtype) if args.dtype not in ("auto", None) else "auto"
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        dtype=dtype,
        device_map=args.device,
        trust_remote_code=args.trust_remote_code,
    )
    model.eval()

    # FinMR queries run to ~40k tokens. Overflowing the position embeddings is a
    # hard crash, so derive a budget rather than letting it happen.
    budget = args.max_input_tokens
    if budget is None and not args.no_auto_truncate:
        limit = model_context_limit(model, tokenizer)
        if limit:
            budget = max(limit - args.max_new_tokens - 64, 256)
            print(f"Model context limit: {limit:,} tokens -> "
                  f"input budget {budget:,} (override with --max-input-tokens)", flush=True)
        else:
            print("WARNING: could not determine the model context limit; "
                  "sending queries untruncated. Pass --max-input-tokens to be safe.")

    # Predictions are appended as they are produced rather than written once at
    # the end: a long run that dies at case 300/332 would otherwise lose all of it.
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

    truncated = 0
    written = len(done)
    handle = output_path.open("a", encoding="utf-8")
    for index, case_id in enumerate(case_ids, start=1):
        if case_id in done:
            continue
        case = inputs[case_id]
        query = case.query
        if budget:
            query = truncate_tokens(tokenizer, query, budget, args.truncate_mode)
            if query is not case.query:
                truncated += 1

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ]
        if tokenizer.chat_template:
            prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        else:
            prompt = f"{SYSTEM_PROMPT}\n\n{query}\n"

        encoded = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            generated = model.generate(
                **encoded,
                max_new_tokens=args.max_new_tokens,
                do_sample=args.temperature > 0,
                temperature=args.temperature if args.temperature > 0 else None,
                top_p=args.top_p,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
            )
        raw = tokenizer.decode(generated[0][encoded["input_ids"].shape[1]:], skip_special_tokens=True)

        extracted, calculated = parse_model_output(raw)
        record = ParticipantPrediction(
            id=case.id,
            extracted_value=extracted or "0",
            calculated_value=calculated or "0",
            raw_output=raw if args.save_raw else None,
        ).to_dict(include_raw=args.save_raw)
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        handle.flush()  # survive a wall-clock kill or a node failure
        written += 1
        # flush: stdout is block-buffered when redirected (slurm logs, pipes),
        # which would otherwise hide all progress until the run ends.
        print(f"[{index}/{len(case_ids)}] {case.id}: {extracted or '0'} / {calculated or '0'}",
              flush=True)
    handle.close()

    count = written
    print(f"\nWrote {count} predictions to {args.output}")
    if truncated:
        print(f"NOTE: {truncated}/{count} quer{'y was' if truncated == 1 else 'ies were'} "
              f"truncated to {budget:,} tokens ({args.truncate_mode} mode). "
              "A longer-context model or a retrieval step will score better.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
