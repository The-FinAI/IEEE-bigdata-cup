#!/usr/bin/env python3
"""Template: answer Task 3 cases with any OpenAI-compatible chat API.

    export OPENAI_API_KEY=sk-...
    python baselines/llm_api_template.py \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl \
        --model gpt-4.1-mini --workers 4

Point --base-url at any OpenAI-compatible server (a local vLLM/Ollama endpoint,
a gateway, ...). Nothing here is specific to one commercial provider and no
credential is hard-coded.

WARNING: FinMR queries are large - median ~115k characters (~30k tokens), max
~167k. Pick a long-context model, or use --max-query-chars to truncate (which
usually costs accuracy, because the answer often depends on the instance
document near the end of the prompt). Prefer --truncate-mode tail: it keeps the
task instructions at the top and the questions at the bottom.

Pipeline:  query -> LLM -> response parser -> {extracted_value, calculated_value} -> JSONL
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from task3_core.io import DataError, load_inputs, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction, TestInput  # noqa: E402

_PRINT_LOCK = threading.Lock()

# The FinMR query already contains full instructions and the required output
# format, so it is sent as-is. A short system message only reinforces it.
SYSTEM_PROMPT = (
    "You are an expert XBRL financial-statement auditor. "
    "Answer with a single JSON object and nothing else."
)


def parse_model_output(text: str) -> Tuple[str, str]:
    """Recover the two answer fields from free-form model text.

    Tries, in order: the outermost JSON object, then any ```json fenced block,
    then a regex for the two keys. Returns ``("", "")`` when nothing is found -
    the case will then be judged a structural error rather than crashing the run.
    """
    if not text:
        return "", ""

    for candidate in _json_candidates(text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and {"extracted_value", "calculated_value"} <= set(parsed):
            return _as_text(parsed["extracted_value"]), _as_text(parsed["calculated_value"])

    extracted = re.search(r'"extracted_value"\s*:\s*"?([^",}\n]+)"?', text)
    calculated = re.search(r'"calculated_value"\s*:\s*"?([^",}\n]+)"?', text)
    if extracted or calculated:
        return (
            extracted.group(1).strip() if extracted else "",
            calculated.group(1).strip() if calculated else "",
        )
    return "", ""


def _json_candidates(text: str):
    fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    yield from fenced
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        yield text[start : end + 1]


def _as_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value)


def truncate_query(query: str, max_chars: Optional[int], mode: str) -> str:
    if not max_chars or len(query) <= max_chars:
        return query
    marker = "\n\n[... context truncated to fit the model context window ...]\n\n"
    if mode == "head":
        return query[:max_chars] + marker
    # 'tail' keeps the leading instructions and the trailing questions, which is
    # where the answerable content lives.
    head = max_chars // 4
    tail = max_chars - head
    return query[:head] + marker + query[-tail:]


class _ParamPolicy:
    """Which request parameters this endpoint actually accepts.

    Providers disagree: OpenAI's reasoning models (the gpt-5 family) reject
    `max_tokens` in favour of `max_completion_tokens` and refuse any
    `temperature` other than the default, while classic chat models and most
    OpenAI-compatible servers accept both. Rather than hard-code a model list
    that goes stale, start with the widely supported form and adapt once, on the
    provider's own 400.
    """

    #: The parameters this policy knows how to back off on.
    ADAPTABLE = ("max_completion_tokens", "temperature", "reasoning_effort")

    #: Providers disagree about how to spell "no reasoning", and the two common
    #: spellings are mutually exclusive. Measured:
    #:
    #:   reasoning_effort  DeepSeek v4        OpenAI gpt-5-mini
    #:   "none"            0 reasoning        400, value not supported
    #:   "minimal"         still reasons      0 reasoning
    #:
    #: So try "none" first and fall back to "minimal" on rejection: that order
    #: reaches zero reasoning on both, with one wasted call on OpenAI.
    OFF_EFFORTS = ("none", "minimal")

    def __init__(self, temperature: float, reasoning: str = "auto") -> None:
        self.token_param = "max_tokens"
        self.temperature = temperature
        self._off_chain = list(self.OFF_EFFORTS) if reasoning == "off" else []
        self.reasoning_effort = (
            None if reasoning == "auto"
            else self._off_chain.pop(0) if reasoning == "off"
            else reasoning
        )
        self._lock = threading.Lock()
        #: Bumped on every change, so a worker whose request raced with another
        #: worker's fix knows to retry rather than give up.
        self._version = 0

    def describe(self) -> str:
        temp = "omitted" if self.temperature is None else self.temperature
        eff = "omitted" if self.reasoning_effort is None else self.reasoning_effort
        return f"token param={self.token_param}, temperature={temp}, reasoning_effort={eff}"

    def kwargs(self, max_output_tokens: int) -> Tuple[int, Dict[str, object]]:
        """Return the current parameter set together with its version."""
        with self._lock:
            out: Dict[str, object] = {self.token_param: max_output_tokens}
            if self.temperature is not None:
                out["temperature"] = self.temperature
            if self.reasoning_effort is not None:
                out["reasoning_effort"] = self.reasoning_effort
            return self._version, out

    def adapt(self, message: str, seen_version: int) -> bool:
        """Learn from a 400. True means "retry is worth it".

        If another worker already advanced the policy while this request was in
        flight, the failure is stale: retry on the newer parameters without
        needing to learn anything ourselves.
        """
        lowered = message.lower()
        with self._lock:
            if self._version != seen_version:
                return True
            changed = False
            if "max_completion_tokens" in lowered and self.token_param != "max_completion_tokens":
                self.token_param = "max_completion_tokens"
                changed = True
            if "temperature" in lowered and self.temperature is not None:
                self.temperature = None
                changed = True
            if "reasoning_effort" in lowered and self.reasoning_effort is not None:
                if self._off_chain:
                    # Still have another spelling of "off" to try.
                    self.reasoning_effort = self._off_chain.pop(0)
                else:
                    # The provider does not know this parameter (or this value,
                    # and we are out of spellings): drop it rather than fail.
                    self.reasoning_effort = None
                changed = True
            if changed:
                self._version += 1
            return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument("--model", default="gpt-4.1-mini")
    parser.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL"))
    parser.add_argument("--api-key-env", default="OPENAI_API_KEY")
    parser.add_argument(
        "--reasoning", default="auto",
        choices=("auto", "off", "minimal", "low", "medium", "high"),
        help="Reasoning depth for models that support it. 'auto' sends nothing and "
             "lets the model decide; 'off' maps to the lowest setting the provider "
             "accepts. Verified on gpt-5-mini: 'off' gives 0 reasoning tokens, "
             "'high' spent 576 on a trivial prompt. Silently dropped by providers "
             "that do not support it.")
    parser.add_argument("--temperature", type=float, default=0.0,
                        help="Dropped automatically for models that only allow the default")
    parser.add_argument("--max-output-tokens", type=int, default=8192,
                        help="Reasoning models spend most of this budget on hidden reasoning "
                             "tokens before emitting an answer. Measured: gpt-5-mini used ~2.3k "
                             "reasoning tokens on one FinMR case, and returned nothing at all "
                             "with a 2048 budget. For a non-reasoning model this is just a cap.")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N cases")
    parser.add_argument("--max-query-chars", type=int, default=None)
    parser.add_argument("--truncate-mode", default="tail", choices=("tail", "head"))
    parser.add_argument("--save-raw", action="store_true", help="Keep raw model text in the output")
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env, "").strip()
    if not api_key:
        print(
            f"ERROR: {args.api_key_env} is not set. Copy .env.example to .env and fill it in,\n"
            f"       or run: export {args.api_key_env}=...",
            file=sys.stderr,
        )
        return 1

    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: pip install 'openai>=1.40'", file=sys.stderr)
        return 1

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    case_ids = list(inputs)[: args.limit] if args.limit else list(inputs)
    client = OpenAI(api_key=api_key, base_url=args.base_url) if args.base_url else OpenAI(api_key=api_key)

    policy = _ParamPolicy(args.temperature, args.reasoning)

    def call(case_id: str, prompt: str, params: Dict[str, object]) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        response = client.chat.completions.create(
            model=args.model, messages=messages, **params
        )
        choice = response.choices[0]
        # A reasoning model can burn the whole budget on hidden reasoning and
        # return nothing. Say so, instead of silently emitting "0"/"0".
        if choice.finish_reason == "length":
            with _PRINT_LOCK:
                print(f"WARNING: {case_id}: hit the {args.max_output_tokens}-token output budget "
                      f"before answering; raise --max-output-tokens", file=sys.stderr)
        return choice.message.content or ""

    def answer(case: TestInput) -> Dict[str, object]:
        prompt = truncate_query(case.query, args.max_query_chars, args.truncate_mode)
        try:
            # A 400 naming an unsupported parameter is the provider telling us which
            # dialect it speaks. It reports one problem at a time, so keep adapting
            # while each error still teaches us something (bounded).
            for _ in range(len(_ParamPolicy.ADAPTABLE) + len(_ParamPolicy.OFF_EFFORTS) + 1):
                # Snapshot before the call: on failure we need to know which
                # version of the parameters actually went out.
                version, params = policy.kwargs(args.max_output_tokens)
                try:
                    raw = call(case.id, prompt, params)
                    break
                except Exception as exc:  # noqa: BLE001
                    if not policy.adapt(str(exc), version):
                        raise
                    with _PRINT_LOCK:
                        print(f"NOTE: request parameters for {args.model} -> "
                              f"{policy.describe()}", file=sys.stderr)
            else:
                raise RuntimeError(
                    f"{args.model} rejected every parameter combination tried"
                )
        except Exception as exc:  # noqa: BLE001 - one bad case must not kill the run
            with _PRINT_LOCK:
                print(f"WARNING: {case.id}: {type(exc).__name__}: {exc}", file=sys.stderr)
            raw = ""

        extracted, calculated = parse_model_output(raw)
        # Always emit both fields: an empty value would fail validation.
        prediction = ParticipantPrediction(
            id=case.id,
            extracted_value=extracted or "0",
            calculated_value=calculated or "0",
            raw_output=raw if args.save_raw else None,
        )
        return prediction.to_dict(include_raw=args.save_raw)

    cases = [inputs[cid] for cid in case_ids]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(_progress(pool.map(answer, cases), len(cases)))

    count = write_jsonl(args.output, results)
    print(f"\nWrote {count} predictions to {args.output}")
    return 0


def _progress(iterable, total: int):
    try:
        from tqdm.auto import tqdm
    except ImportError:
        return iterable
    return tqdm(iterable, total=total, desc="Querying model")


if __name__ == "__main__":
    sys.exit(main())
