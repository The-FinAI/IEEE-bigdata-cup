#!/usr/bin/env python3
"""Template: batch-generate Task 3 predictions with vLLM.

vLLM is optional - it is simply much faster than plain transformers on prompts
this long. Two modes:

  offline (default)  loads the model in-process via the vLLM Python API
  server             talks to an already-running `vllm serve` endpoint, which is
                     exactly the OpenAI-compatible path in llm_api_template.py

    python baselines/vllm_template.py \
        --model Qwen/Qwen2.5-7B-Instruct \
        --max-model-len 131072 \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl

Set --max-model-len high enough for the FinMR context (median ~30k tokens, tail
beyond 40k) or pass --max-input-tokens to truncate deliberately.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from baselines.hf_template import truncate_tokens  # noqa: E402
from baselines.llm_api_template import parse_model_output, truncate_query  # noqa: E402
from task3_core.io import DataError, load_inputs, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction  # noqa: E402

SYSTEM_PROMPT = (
    "You are an expert XBRL financial-statement auditor. "
    "Answer with a single JSON object and nothing else."
)


def resolve_max_model_len(llm, requested: Optional[int]) -> Optional[int]:
    """The context length vLLM is actually serving.

    ``--max-model-len`` is optional, so when it is absent the real value has to
    come from the engine. The attribute path has moved between vLLM releases, so
    every known location is probed before giving up.
    """
    if requested:
        return requested
    for path in (
        ("llm_engine", "model_config", "max_model_len"),
        ("llm_engine", "vllm_config", "model_config", "max_model_len"),
        ("model_config", "max_model_len"),
    ):
        node = llm
        for attribute in path:
            node = getattr(node, attribute, None)
            if node is None:
                break
        if isinstance(node, int) and node > 0:
            return node
    print("WARNING: could not determine the served context length; "
          "pass --max-model-len or --max-query-chars to avoid an overflow.", file=sys.stderr)
    return None


def chat_template_overhead(tokenizer) -> int:
    """Tokens the chat template adds around the query itself."""
    if not getattr(tokenizer, "chat_template", None):
        return 16
    rendered = tokenizer.apply_chat_template(
        [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": ""}],
        tokenize=False,
        add_generation_prompt=True,
    )
    return len(tokenizer.encode(rendered, add_special_tokens=False)) + 8


def enforce_prompt_limit(tokenizer, prompt: str, limit: int) -> str:
    """Hard cap on the fully rendered prompt, keeping its head and tail."""
    ids = tokenizer.encode(prompt, add_special_tokens=False)
    if len(ids) <= limit:
        return prompt
    head = limit // 4
    return tokenizer.decode(ids[:head] + ids[-(limit - head):], skip_special_tokens=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument("--mode", default="offline", choices=("offline", "server"))
    parser.add_argument("--server-url", default="http://localhost:8000/v1", help="--mode server only")
    parser.add_argument("--tensor-parallel-size", type=int, default=1)
    parser.add_argument("--gpu-memory-utilization", type=float, default=0.90)
    parser.add_argument("--max-model-len", type=int, default=None)
    parser.add_argument("--max-new-tokens", type=int, default=128)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--top-p", type=float, default=1.0)
    parser.add_argument("--max-query-chars", type=int, default=None)
    parser.add_argument("--truncate-mode", default="tail", choices=("tail", "head"))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=4, help="--mode server only")
    parser.add_argument("--trust-remote-code", action="store_true")
    parser.add_argument("--save-raw", action="store_true")
    args = parser.parse_args()

    if args.mode == "server":
        # A running `vllm serve` is an OpenAI-compatible endpoint, so the API
        # template drives it directly. Delegate instead of duplicating the logic.
        from baselines import llm_api_template

        os.environ.setdefault("OPENAI_API_KEY", "vllm-local")
        argv = [
            "llm_api_template",
            "--input", args.input,
            "--output", args.output,
            "--model", args.model,
            "--base-url", args.server_url,
            "--temperature", str(args.temperature),
            "--max-output-tokens", str(args.max_new_tokens),
            "--truncate-mode", args.truncate_mode,
            "--workers", str(args.workers),
        ]
        if args.max_query_chars:
            argv += ["--max-query-chars", str(args.max_query_chars)]
        if args.limit:
            argv += ["--limit", str(args.limit)]
        if args.save_raw:
            argv += ["--save-raw"]

        print(f"Querying vLLM server at {args.server_url} (model {args.model})")
        saved, sys.argv = sys.argv, argv
        try:
            return llm_api_template.main()
        finally:
            sys.argv = saved

    try:
        from vllm import LLM, SamplingParams
    except ImportError:
        print(
            "ERROR: vLLM is not installed (it is optional).\n"
            "       pip install vllm    # needs a compatible CUDA/PyTorch build\n"
            "       Or use baselines/hf_template.py / baselines/llm_api_template.py instead.",
            file=sys.stderr,
        )
        return 1

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    case_ids = list(inputs)[: args.limit] if args.limit else list(inputs)

    llm_kwargs = {
        "model": args.model,
        "tensor_parallel_size": args.tensor_parallel_size,
        "gpu_memory_utilization": args.gpu_memory_utilization,
        "trust_remote_code": args.trust_remote_code,
    }
    if args.max_model_len:
        llm_kwargs["max_model_len"] = args.max_model_len
    llm = LLM(**llm_kwargs)
    tokenizer = llm.get_tokenizer()

    # A prompt longer than max_model_len is a hard error in vLLM, and FinMR
    # queries reach ~43k tokens. Budget in TOKENS, not characters: XBRL text runs
    # about 2.2 characters per token, so any character-based guess is unsafe.
    served_len = resolve_max_model_len(llm, args.max_model_len)
    token_budget = None
    if args.max_query_chars is None and served_len:
        overhead = chat_template_overhead(tokenizer)
        token_budget = max(served_len - args.max_new_tokens - overhead - 32, 256)
        print(f"max_model_len={served_len:,} -> query budget {token_budget:,} tokens "
              f"(chat template overhead {overhead}); override with --max-query-chars", flush=True)

    prompts, truncated = [], 0
    for case_id in case_ids:
        query = inputs[case_id].query
        if args.max_query_chars:
            query = truncate_query(query, args.max_query_chars, args.truncate_mode)
        elif token_budget:
            shortened = truncate_tokens(tokenizer, query, token_budget, args.truncate_mode)
            truncated += shortened is not query
            query = shortened

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ]
        if getattr(tokenizer, "chat_template", None):
            prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        else:
            prompt = f"{SYSTEM_PROMPT}\n\n{query}\n"

        # Final guard: the template can push a budgeted query back over the limit.
        if served_len:
            prompt = enforce_prompt_limit(tokenizer, prompt, served_len - args.max_new_tokens)
        prompts.append(prompt)

    if truncated:
        print(f"Truncated {truncated}/{len(prompts)} quer{'y' if truncated == 1 else 'ies'} "
              f"to fit the served context ({args.truncate_mode} mode).", flush=True)

    sampling = SamplingParams(
        temperature=args.temperature,
        top_p=args.top_p,
        max_tokens=args.max_new_tokens,
    )
    outputs = llm.generate(prompts, sampling)

    results = []
    for case_id, output in zip(case_ids, outputs):
        raw = output.outputs[0].text if output.outputs else ""
        extracted, calculated = parse_model_output(raw)
        results.append(
            ParticipantPrediction(
                id=case_id,
                extracted_value=extracted or "0",
                calculated_value=calculated or "0",
                raw_output=raw if args.save_raw else None,
            ).to_dict(include_raw=args.save_raw)
        )

    count = write_jsonl(args.output, results)
    print(f"\nWrote {count} predictions to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
