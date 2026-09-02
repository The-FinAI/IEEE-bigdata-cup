"""Reproducible, provider-neutral organizer baseline materialization.

This module has no model-provider dependency.  It creates deterministic request
JSONL for the public B2/B3 profiles, consumes one strict response envelope per
case, and always writes prediction rows through the published Task 1 contract.
Malformed or unbound model output is never repaired: the affected case becomes
a valid abstention and the reason is recorded outside ``predictions.jsonl``.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, localcontext
from fractions import Fraction
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence

from .admission import build_submission_archive, validate_submission_archive
from .baseline_b1 import B1_SUPPORTED_PUBLIC_FAMILIES, build_b1_prediction
from .contracts import (
    CASE_ID_PATTERN,
    DECIMAL_PATTERN,
    MAX_ADJUSTED_EXPONENT,
    MAX_FILE_BYTES,
    MAX_LINE_BYTES,
    MAX_RECORDS,
    MAX_SIGNIFICANT_DIGITS,
    MIN_ADJUSTED_EXPONENT,
    PREDICTION_SCHEMA_VERSION,
    RATIONAL_PATTERN,
    ContractError,
    load_jsonl_snapshot,
    validate_question,
    validate_prediction_record,
    validate_submission,
)


B1_METHOD_ID = "FR-T1-B1-RULE-v1"
B2_METHOD_ID = "FR-T1-B2-OPEN8B-STRUCT-v1"
B3_METHOD_ID = "FR-T1-B3-OPEN32B-PAL-v1"

REQUEST_SCHEMA_VERSION = "finreason.task1.baseline-request/1.0.0"
RESPONSE_SCHEMA_VERSION = "finreason.task1.baseline-response/1.0.0"
DIAGNOSTIC_SCHEMA_VERSION = "finreason.task1.baseline-diagnostic/1.0.0"
METHOD_CARD_SCHEMA_VERSION = "finreason.task1.baseline-method-card/1.0.0"
MATERIALIZATION_SCHEMA_VERSION = "finreason.task1.baseline-materialization/1.0.0"
STRUCTURED_OUTPUT_PROTOCOL_VERSION = "finreason.task1.structured-output/1.0.0"
PAL_PROGRAM_VERSION = "finreason.task1.exact-pal/1.0.0"

MAX_RAW_RESPONSE_BYTES = 65_536
MAX_PAL_INSTRUCTIONS = 96
MAX_PAL_COMPONENT_DIGITS = 256
MAX_RETRIEVAL_EXAMPLES = 8

_INSTRUCTION_ID = re.compile(r"v(?:[1-9][0-9]{0,2})\Z")
_TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?")


@dataclass(frozen=True)
class BaselineProfile:
    method_id: str
    short_name: str
    model_class: str
    inference: str
    uses_retrieval: bool
    uses_pal: bool


PROFILES: dict[str, BaselineProfile] = {
    B2_METHOD_ID: BaselineProfile(
        method_id=B2_METHOD_ID,
        short_name="b2",
        model_class="pinned 7-9B open instruct model",
        inference="structured zero-shot with greedy decoding",
        uses_retrieval=False,
        uses_pal=False,
    ),
    B3_METHOD_ID: BaselineProfile(
        method_id=B3_METHOD_ID,
        short_name="b3",
        model_class="pinned 30-35B open instruct or reasoning model",
        inference=(
            "public-train-only deterministic retrieval, structured PAL, and "
            "greedy decoding"
        ),
        uses_retrieval=True,
        uses_pal=True,
    ),
}
PROFILE_ALIASES = {"b2": B2_METHOD_ID, "b3": B3_METHOD_ID, **{key: key for key in PROFILES}}


class StructuredBaselineProvider(Protocol):
    """Minimal adapter boundary; implementations own transport and credentials."""

    def generate(self, request: Mapping[str, Any]) -> str | Mapping[str, Any]:
        """Return exactly one JSON object (or its JSON text) for one request."""


class BaselineResponseError(ValueError):
    """One model response failed the public structured-output contract."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def canonical_jsonl(rows: Sequence[Mapping[str, Any]]) -> bytes:
    return "".join(canonical_json(row) + "\n" for row in rows).encode("utf-8")


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def canonical_question_sha256(question: Mapping[str, Any]) -> str:
    return sha256_bytes(canonical_json(question).encode("utf-8"))


def load_question_bundle(
    path: str | Path,
) -> tuple[bytes, dict[str, dict[str, Any]]]:
    """Capture one stable public question file and build its strict case index."""

    content, loaded = load_jsonl_snapshot(path)
    if not loaded.valid:
        raise ContractError(f"question JSONL is invalid: {loaded.as_dict()}")
    questions: dict[str, dict[str, Any]] = {}
    for record in loaded.records:
        validate_question(record)
        case_id = record["case_id"]
        if case_id in questions:
            raise ContractError("question JSONL contains a duplicate case_id")
        questions[case_id] = record
    if not questions:
        raise ContractError("question JSONL must contain at least one case")
    return content, questions


def load_prediction_bundle(
    path: str | Path,
) -> tuple[bytes, dict[str, dict[str, Any]]]:
    """Capture a stable prediction JSONL file and index rows without coercion."""

    content, loaded = load_jsonl_snapshot(path)
    if not loaded.valid:
        raise ContractError(f"prediction JSONL is invalid: {loaded.as_dict()}")
    predictions: dict[str, dict[str, Any]] = {}
    for record in loaded.records:
        case_id = record.get("case_id")
        if not isinstance(case_id, str) or case_id in predictions:
            raise ContractError("prediction JSONL contains an invalid or duplicate case_id")
        predictions[case_id] = record
    return content, predictions


def write_canonical_jsonl(path: str | Path, rows: Sequence[Mapping[str, Any]]) -> str:
    """Publish canonical JSONL once, without replacing an existing path."""

    target = Path(path)
    if target.exists() or target.is_symlink():
        raise ValueError("JSONL output must not already exist")
    target.parent.mkdir(parents=True, exist_ok=True)
    content = canonical_jsonl(rows)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary_name, 0o644)
        os.link(temporary_name, target)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return sha256_bytes(content)


def resolve_profile(profile: str) -> BaselineProfile:
    method_id = PROFILE_ALIASES.get(profile.lower(), profile)
    try:
        return PROFILES[method_id]
    except KeyError as exc:
        raise ValueError(f"unsupported baseline profile: {profile}") from exc


def _abstention(question: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": PREDICTION_SCHEMA_VERSION,
        "dataset_version": question.get("dataset_version"),
        "case_id": question.get("case_id"),
        "final_answer": None,
        "steps": [],
    }


def _diagnostic(
    method_id: str,
    code: str,
    message: str,
    *,
    case_id: str | None = None,
    line: int | None = None,
) -> dict[str, Any]:
    return {
        "schema_version": DIAGNOSTIC_SCHEMA_VERSION,
        "method_id": method_id,
        "case_id": case_id,
        "line": line,
        "code": code,
        "message": message,
    }


def _exact_keys(value: Any, expected: set[str], label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping) or set(value) != expected:
        raise BaselineResponseError(
            "E_RESPONSE_SCHEMA", f"{label} has fields outside the exact contract"
        )
    return value


def _reject_duplicate_key(pairs: Sequence[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON object key")
        result[key] = value
    return result


def _reject_nonfinite_constant(value: str) -> None:
    raise ValueError(f"non-standard JSON numeric constant {value!r}")


def _enforce_json_depth(text: str, maximum: int = 64) -> None:
    depth = 0
    in_string = False
    escaped = False
    for character in text:
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character in "[{":
            depth += 1
            if depth > maximum:
                raise ValueError(f"JSON nesting exceeds {maximum}")
        elif character in "]}" and depth:
            depth -= 1


def _strict_json_object(text: str) -> Mapping[str, Any]:
    encoded = text.encode("utf-8")
    if not 1 <= len(encoded) <= MAX_RAW_RESPONSE_BYTES:
        raise BaselineResponseError(
            "E_RESPONSE_RESOURCE", "raw response exceeds the bounded byte contract"
        )
    try:
        _enforce_json_depth(text)
        value = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_key,
            parse_constant=_reject_nonfinite_constant,
        )
    except (RecursionError, UnicodeError, ValueError) as exc:
        raise BaselineResponseError(
            "E_RESPONSE_PARSE", "response is not exactly one strict JSON object"
        ) from exc
    if not isinstance(value, Mapping):
        raise BaselineResponseError(
            "E_RESPONSE_PARSE", "response root must be one JSON object"
        )
    return value


def _response_object(value: Any) -> Mapping[str, Any]:
    if isinstance(value, str):
        return _strict_json_object(value)
    if not isinstance(value, Mapping):
        raise BaselineResponseError(
            "E_RESPONSE_PARSE", "response must be an object or exact JSON-object text"
        )
    try:
        encoded = canonical_json(value).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise BaselineResponseError(
            "E_RESPONSE_PARSE", "structured response is not canonical JSON data"
        ) from exc
    if len(encoded) > MAX_RAW_RESPONSE_BYTES:
        raise BaselineResponseError(
            "E_RESPONSE_RESOURCE", "structured response exceeds the byte contract"
        )
    return value


def _profile_response_contract(profile: BaselineProfile) -> dict[str, Any]:
    if not profile.uses_pal:
        return {
            "protocol_version": STRUCTURED_OUTPUT_PROTOCOL_VERSION,
            "exact_root_fields": ["final_answer"],
            "final_answer": "null or {value: canonical string}",
            "checkpoint_policy": "final answer only; the harness emits an empty steps array",
        }
    return {
        "protocol_version": STRUCTURED_OUTPUT_PROTOCOL_VERSION,
        "allowed_kinds": ["pal", "prediction"],
        "prediction_exact_fields": ["kind", "final_answer", "slot_values"],
        "pal_exact_fields": [
            "kind",
            "instructions",
            "final_ref",
            "slot_refs",
        ],
        "slot_policy": "every published slot exactly once in published order",
        "pal_program_version": PAL_PROGRAM_VERSION,
        "pal_operations": ["literal", "add", "sub", "mul", "div", "neg", "abs", "min", "max", "pow_int"],
        "pal_limit": MAX_PAL_INSTRUCTIONS,
    }


def _system_message(profile: BaselineProfile) -> str:
    common = (
        "Solve exactly one public FinReason Task 1 question. Return exactly one JSON "
        "object that follows response_contract, with no Markdown, prose, or extra "
        "keys. Never emit case identifiers; the harness binds identity. Do not use "
        "private data or claim access to hidden answers."
    )
    if not profile.uses_pal:
        return common + " Return only final_answer; do not return reasoning or checkpoints."
    return (
        common
        + " For decimal arithmetic, prefer kind=pal and express all calculations in "
        "the bounded exact program. Use only earlier instruction references. The "
        "harness performs final rounding and renders every published checkpoint. "
        "For non-arithmetic enum cases, kind=prediction is allowed."
    )


def _token_counter(text: str) -> Counter[str]:
    tokens = []
    for match in _TOKEN.finditer(text.lower()):
        token = match.group(0)
        tokens.append("<number>" if token[0].isdigit() else token)
    return Counter(tokens)


def _similarity(left: Counter[str], right: Counter[str]) -> Fraction:
    keys = set(left) | set(right)
    union = sum(max(left[key], right[key]) for key in keys)
    if not union:
        return Fraction(0, 1)
    overlap = sum(min(left[key], right[key]) for key in keys)
    return Fraction(overlap, union)


def _validate_training_targets(
    train_questions: Mapping[str, Mapping[str, Any]],
    train_targets: Mapping[str, Mapping[str, Any]],
) -> None:
    if set(train_questions) != set(train_targets):
        raise ContractError("public training questions and targets must cover identical case IDs")
    result = validate_submission(train_targets.values(), train_questions, require_complete=True)
    if not result.valid:
        raise ContractError(f"public training targets are invalid: {result.as_dict()}")


def _retrieve_examples(
    question: Mapping[str, Any],
    train_questions: Mapping[str, Mapping[str, Any]],
    train_targets: Mapping[str, Mapping[str, Any]],
    retrieval_k: int,
) -> list[dict[str, Any]]:
    query = _token_counter(question["question"])
    ranked: list[tuple[Fraction, str]] = []
    for case_id, candidate in train_questions.items():
        if case_id == question["case_id"]:
            continue
        score = _similarity(query, _token_counter(candidate["question"]))
        ranked.append((score, case_id))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [
        {
            "case_id": case_id,
            "question": train_questions[case_id],
            "prediction": train_targets[case_id],
        }
        for _, case_id in ranked[:retrieval_k]
    ]


def _request_record(
    profile: BaselineProfile,
    question: Mapping[str, Any],
    examples: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    user_payload: dict[str, Any] = {"question": question}
    if examples:
        user_payload["public_training_examples"] = list(examples)
    body: dict[str, Any] = {
        "schema_version": REQUEST_SCHEMA_VERSION,
        "method_id": profile.method_id,
        "dataset_version": question["dataset_version"],
        "case_id": question["case_id"],
        "question_sha256": canonical_question_sha256(question),
        "messages": [
            {"role": "system", "content": _system_message(profile)},
            {"role": "user", "content": canonical_json(user_payload)},
        ],
        "response_contract": _profile_response_contract(profile),
        "retrieval_case_ids": [example["case_id"] for example in examples],
    }
    request_id = "frreq_" + sha256_bytes(canonical_json(body).encode("utf-8"))[:32]
    return {**body, "request_id": request_id}


def build_llm_requests(
    profile_name: str,
    questions: Mapping[str, Mapping[str, Any]],
    *,
    train_questions: Mapping[str, Mapping[str, Any]] | None = None,
    train_targets: Mapping[str, Mapping[str, Any]] | None = None,
    retrieval_k: int = 3,
) -> tuple[dict[str, Any], ...]:
    """Build stable provider-neutral B2/B3 requests from public inputs only."""

    profile = resolve_profile(profile_name)
    if not 1 <= retrieval_k <= MAX_RETRIEVAL_EXAMPLES:
        raise ValueError(f"retrieval_k must be between 1 and {MAX_RETRIEVAL_EXAMPLES}")
    for question in questions.values():
        # Validation occurs through an abstention-shaped prediction without any gold.
        issues = validate_prediction_record(_abstention(question), question)
        if issues:
            raise ContractError(f"question failed the published contract: {issues}")
    if profile.uses_retrieval:
        if train_questions is None or train_targets is None:
            raise ContractError("B3 requires public training questions and targets")
        _validate_training_targets(train_questions, train_targets)
    elif train_questions is not None or train_targets is not None:
        raise ContractError("B2 does not accept training examples")

    records: list[dict[str, Any]] = []
    for case_id in sorted(questions):
        question = questions[case_id]
        examples = (
            _retrieve_examples(
                question,
                train_questions or {},
                train_targets or {},
                retrieval_k,
            )
            if profile.uses_retrieval
            else []
        )
        records.append(_request_record(profile, question, examples))
    return tuple(records)


def validate_llm_requests(
    records: Sequence[Mapping[str, Any]],
    profile_name: str,
    questions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Mapping[str, Any]]:
    profile = resolve_profile(profile_name)
    by_case: dict[str, Mapping[str, Any]] = {}
    expected_keys = {
        "schema_version",
        "method_id",
        "dataset_version",
        "case_id",
        "question_sha256",
        "messages",
        "response_contract",
        "retrieval_case_ids",
        "request_id",
    }
    for record in records:
        if not isinstance(record, Mapping) or set(record) != expected_keys:
            raise ContractError("baseline request row has wrong fields")
        case_id = record.get("case_id")
        if not isinstance(case_id, str) or case_id not in questions or case_id in by_case:
            raise ContractError("baseline request row has unknown or duplicate case_id")
        question = questions[case_id]
        if (
            record.get("schema_version") != REQUEST_SCHEMA_VERSION
            or record.get("method_id") != profile.method_id
            or record.get("dataset_version") != question["dataset_version"]
            or record.get("question_sha256") != canonical_question_sha256(question)
        ):
            raise ContractError("baseline request identity differs from the question bundle")
        without_id = {key: value for key, value in record.items() if key != "request_id"}
        expected_id = "frreq_" + sha256_bytes(canonical_json(without_id).encode("utf-8"))[:32]
        if record.get("request_id") != expected_id:
            raise ContractError("baseline request_id does not bind the canonical request")
        if record.get("response_contract") != _profile_response_contract(profile):
            raise ContractError("baseline request response contract differs from the profile")
        messages = record.get("messages")
        if (
            not isinstance(messages, list)
            or len(messages) != 2
            or messages[0] != {"role": "system", "content": _system_message(profile)}
            or not isinstance(messages[1], Mapping)
            or set(messages[1]) != {"role", "content"}
            or messages[1].get("role") != "user"
            or not isinstance(messages[1].get("content"), str)
        ):
            raise ContractError("baseline request messages differ from the profile")
        retrieval_ids = record.get("retrieval_case_ids")
        if not isinstance(retrieval_ids, list) or any(
            not isinstance(value, str) or not CASE_ID_PATTERN.fullmatch(value)
            for value in retrieval_ids
        ):
            raise ContractError("baseline request retrieval_case_ids are invalid")
        if profile.uses_retrieval:
            if not 1 <= len(retrieval_ids) <= MAX_RETRIEVAL_EXAMPLES:
                raise ContractError("B3 request has an invalid retrieval example count")
        elif retrieval_ids:
            raise ContractError("B2 request must not include retrieval examples")
        try:
            user_payload = _strict_json_object(messages[1]["content"])
        except BaselineResponseError as exc:
            raise ContractError("baseline request user payload is invalid") from exc
        if not profile.uses_retrieval:
            if user_payload != {"question": question}:
                raise ContractError("B2 request user payload differs from the public question")
        else:
            if set(user_payload) != {"question", "public_training_examples"} or user_payload.get("question") != question:
                raise ContractError("B3 request user payload differs from the public question")
            examples = user_payload.get("public_training_examples")
            if not isinstance(examples, list) or len(examples) != len(retrieval_ids):
                raise ContractError("B3 request examples differ from retrieval_case_ids")
            example_ids: list[str] = []
            for example in examples:
                if not isinstance(example, Mapping) or set(example) != {
                    "case_id",
                    "question",
                    "prediction",
                }:
                    raise ContractError("B3 request example has wrong fields")
                example_id = example.get("case_id")
                example_question = example.get("question")
                example_prediction = example.get("prediction")
                if (
                    not isinstance(example_id, str)
                    or not isinstance(example_question, Mapping)
                    or not isinstance(example_prediction, Mapping)
                    or example_question.get("case_id") != example_id
                ):
                    raise ContractError("B3 request example identity is invalid")
                validate_question(example_question)
                if validate_prediction_record(example_prediction, example_question):
                    raise ContractError("B3 request example prediction is invalid")
                example_ids.append(example_id)
            if example_ids != retrieval_ids or len(set(example_ids)) != len(example_ids):
                raise ContractError("B3 request example order or identity is invalid")
        by_case[case_id] = record
    if set(by_case) != set(questions):
        raise ContractError("baseline requests do not exactly cover the question bundle")
    return by_case


def response_envelope(
    request: Mapping[str, Any], response: str | Mapping[str, Any]
) -> dict[str, Any]:
    """Bind an adapter's unmodified model response to one canonical request."""

    return {
        "schema_version": RESPONSE_SCHEMA_VERSION,
        "method_id": request.get("method_id"),
        "request_id": request.get("request_id"),
        "case_id": request.get("case_id"),
        "response": response,
    }


def _parse_literal(text: Any) -> Fraction:
    if not isinstance(text, str) or not 1 <= len(text) <= 256:
        raise BaselineResponseError("E_PAL_LITERAL", "PAL literal must be a bounded string")
    try:
        if "/" in text:
            if not RATIONAL_PATTERN.fullmatch(text):
                raise ValueError("invalid rational syntax")
            numerator_text, denominator_text = text.split("/", 1)
            numerator = int(numerator_text)
            denominator = int(denominator_text)
            value = Fraction(numerator, denominator)
            if value.numerator != numerator or value.denominator != denominator:
                raise ValueError("rational is not irreducible")
        else:
            if not DECIMAL_PATTERN.fullmatch(text):
                raise ValueError("invalid decimal syntax")
            decimal = Decimal(text)
            if not decimal.is_finite():
                raise ValueError("non-finite decimal")
            digits = text.lower().split("e", 1)[0].lstrip("-").replace(".", "").lstrip("0") or "0"
            if len(digits) > MAX_SIGNIFICANT_DIGITS:
                raise ValueError("too many significant digits")
            value = Fraction(decimal)
    except (InvalidOperation, ValueError, ZeroDivisionError) as exc:
        raise BaselineResponseError(
            "E_PAL_LITERAL", "PAL literal is not one canonical exact number"
        ) from exc
    _check_fraction(value)
    return value


def _check_fraction(value: Fraction) -> None:
    if (
        len(str(abs(value.numerator))) > MAX_PAL_COMPONENT_DIGITS
        or len(str(value.denominator)) > MAX_PAL_COMPONENT_DIGITS
    ):
        raise BaselineResponseError(
            "E_PAL_RESOURCE", "PAL value exceeds the exact component digit bound"
        )
    if value:
        with localcontext() as context:
            context.prec = MAX_PAL_COMPONENT_DIGITS + 16
            decimal = Decimal(value.numerator) / Decimal(value.denominator)
        if not MIN_ADJUSTED_EXPONENT <= decimal.adjusted() <= MAX_ADJUSTED_EXPONENT:
            raise BaselineResponseError(
                "E_PAL_RESOURCE", "PAL value lies outside the supported magnitude"
            )


def _instruction_args(
    instruction: Mapping[str, Any],
    values: Mapping[str, Fraction],
    *,
    count: int | tuple[int, int],
) -> list[Fraction]:
    args = instruction.get("args")
    if not isinstance(args, list) or not all(isinstance(arg, str) for arg in args):
        raise BaselineResponseError("E_PAL_SCHEMA", "PAL args must be reference strings")
    if isinstance(count, int):
        valid_count = len(args) == count
    else:
        valid_count = count[0] <= len(args) <= count[1]
    if not valid_count or any(arg not in values for arg in args):
        raise BaselineResponseError(
            "E_PAL_REFERENCE", "PAL args must reference the required earlier values"
        )
    return [values[arg] for arg in args]


def _execute_pal(program: Mapping[str, Any]) -> tuple[dict[str, Fraction], str, list[Mapping[str, Any]]]:
    instructions = program.get("instructions")
    if not isinstance(instructions, list) or not 1 <= len(instructions) <= MAX_PAL_INSTRUCTIONS:
        raise BaselineResponseError(
            "E_PAL_RESOURCE", "PAL instruction count is outside the bounded contract"
        )
    values: dict[str, Fraction] = {}
    for instruction in instructions:
        if not isinstance(instruction, Mapping):
            raise BaselineResponseError("E_PAL_SCHEMA", "PAL instruction must be an object")
        instruction_id = instruction.get("id")
        op = instruction.get("op")
        if (
            not isinstance(instruction_id, str)
            or not _INSTRUCTION_ID.fullmatch(instruction_id)
            or instruction_id in values
            or not isinstance(op, str)
        ):
            raise BaselineResponseError("E_PAL_SCHEMA", "PAL instruction identity is invalid")
        if op == "literal":
            _exact_keys(instruction, {"id", "op", "value"}, "PAL literal")
            result = _parse_literal(instruction.get("value"))
        else:
            _exact_keys(instruction, {"id", "op", "args"}, "PAL operation")
            if op in {"add", "mul", "min", "max"}:
                args = _instruction_args(instruction, values, count=(2, 8))
            elif op in {"sub", "div", "pow_int"}:
                args = _instruction_args(instruction, values, count=2)
            elif op in {"neg", "abs"}:
                args = _instruction_args(instruction, values, count=1)
            else:
                raise BaselineResponseError("E_PAL_OPERATION", "PAL operation is unsupported")
            try:
                if op == "add":
                    result = sum(args, Fraction(0, 1))
                elif op == "sub":
                    result = args[0] - args[1]
                elif op == "mul":
                    result = Fraction(1, 1)
                    for value in args:
                        result *= value
                elif op == "div":
                    result = args[0] / args[1]
                elif op == "neg":
                    result = -args[0]
                elif op == "abs":
                    result = abs(args[0])
                elif op == "min":
                    result = min(args)
                elif op == "max":
                    result = max(args)
                else:
                    exponent = args[1]
                    if exponent.denominator != 1 or not -16 <= exponent.numerator <= 16:
                        raise BaselineResponseError(
                            "E_PAL_RESOURCE", "PAL integer exponent must lie in -16..16"
                        )
                    result = args[0] ** exponent.numerator
            except (OverflowError, ZeroDivisionError) as exc:
                raise BaselineResponseError(
                    "E_PAL_ARITHMETIC", "PAL arithmetic operation is undefined"
                ) from exc
            _check_fraction(result)
        values[instruction_id] = result
    final_ref = program.get("final_ref")
    slot_refs = program.get("slot_refs")
    if not isinstance(final_ref, str) or final_ref not in values:
        raise BaselineResponseError("E_PAL_REFERENCE", "PAL final_ref is unknown")
    if not isinstance(slot_refs, list):
        raise BaselineResponseError("E_PAL_SCHEMA", "PAL slot_refs must be an array")
    return values, final_ref, slot_refs


def _fraction_to_exact_text(value: Fraction) -> str:
    denominator = value.denominator
    twos = 0
    fives = 0
    while denominator % 2 == 0:
        denominator //= 2
        twos += 1
    while denominator % 5 == 0:
        denominator //= 5
        fives += 1
    if denominator != 1:
        return f"{value.numerator}/{value.denominator}"
    places = max(twos, fives)
    scaled = abs(value.numerator) * 2 ** (places - twos) * 5 ** (places - fives)
    scale = 10**places
    whole, fractional = divmod(scaled, scale)
    sign = "-" if value < 0 else ""
    if places == 0 or fractional == 0:
        return f"{sign}{whole}"
    return f"{sign}{whole}.{fractional:0{places}d}".rstrip("0")


def _round_half_up_text(value: Fraction, places: int) -> str:
    scale = 10**places
    scaled = value.numerator * scale
    if scaled >= 0:
        rounded = (2 * scaled + value.denominator) // (2 * value.denominator)
    else:
        rounded = -(
            (2 * (-scaled) + value.denominator) // (2 * value.denominator)
        )
    sign = "-" if rounded < 0 else ""
    whole, fractional = divmod(abs(rounded), scale)
    if places == 0:
        return f"{sign}{whole}"
    return f"{sign}{whole}.{fractional:0{places}d}"


def _render_fraction(value: Fraction, spec: Mapping[str, Any]) -> str:
    if spec.get("type") != "decimal":
        raise BaselineResponseError(
            "E_PAL_RESULT_TYPE", "PAL output can bind only a decimal result specification"
        )
    rounding = spec.get("rounding")
    if rounding == {"mode": "exact"}:
        return _fraction_to_exact_text(value)
    if isinstance(rounding, Mapping) and set(rounding) == {"mode", "decimal_places"}:
        places = rounding.get("decimal_places")
        if rounding.get("mode") == "half_up" and isinstance(places, int) and not isinstance(places, bool):
            if 0 <= places <= 12:
                return _round_half_up_text(value, places)
    raise BaselineResponseError(
        "E_PAL_RESULT_TYPE", "PAL output encountered an unsupported rounding contract"
    )


def _slot_values_to_steps(
    slot_values: Any, question: Mapping[str, Any]
) -> list[dict[str, str]]:
    if not isinstance(slot_values, Mapping):
        raise BaselineResponseError(
            "E_RESPONSE_SCHEMA", "slot_values must be an object"
        )
    slots = question["trace_spec"]["slots"]
    expected_ids = [slot["slot_id"] for slot in slots]
    if set(slot_values) != set(expected_ids):
        raise BaselineResponseError(
            "E_RESPONSE_SCHEMA", "slot_values must exactly cover every published slot"
        )
    result: list[dict[str, str]] = []
    for slot_id in expected_ids:
        value = slot_values[slot_id]
        if not isinstance(value, str):
            raise BaselineResponseError(
                "E_RESPONSE_SCHEMA", "every slot value must be one string"
            )
        result.append({"slot_id": slot_id, "value": value})
    return result


def _prediction_from_response(
    profile: BaselineProfile,
    question: Mapping[str, Any],
    response: Any,
) -> dict[str, Any]:
    parsed = _response_object(response)
    if not profile.uses_pal:
        _exact_keys(parsed, {"final_answer"}, "B2 response")
        prediction = {
            "schema_version": PREDICTION_SCHEMA_VERSION,
            "dataset_version": question["dataset_version"],
            "case_id": question["case_id"],
            "final_answer": parsed.get("final_answer"),
            "steps": [],
        }
    else:
        kind = parsed.get("kind")
        if kind == "prediction":
            _exact_keys(
                parsed,
                {"kind", "final_answer", "slot_values"},
                "B3 direct response",
            )
            prediction = {
                "schema_version": PREDICTION_SCHEMA_VERSION,
                "dataset_version": question["dataset_version"],
                "case_id": question["case_id"],
                "final_answer": parsed.get("final_answer"),
                "steps": _slot_values_to_steps(parsed.get("slot_values"), question),
            }
        elif kind == "pal":
            program = _exact_keys(
                parsed,
                {"kind", "instructions", "final_ref", "slot_refs"},
                "B3 PAL response",
            )
            values, final_ref, slot_refs = _execute_pal(program)
            slots = question["trace_spec"]["slots"]
            if len(slot_refs) != len(slots):
                raise BaselineResponseError(
                    "E_PAL_REFERENCE", "PAL slot_refs must cover every published slot"
                )
            steps: list[dict[str, str]] = []
            for slot_ref, slot in zip(slot_refs, slots, strict=True):
                _exact_keys(slot_ref, {"slot_id", "value_ref"}, "PAL slot reference")
                if (
                    slot_ref.get("slot_id") != slot["slot_id"]
                    or not isinstance(slot_ref.get("value_ref"), str)
                    or slot_ref["value_ref"] not in values
                ):
                    raise BaselineResponseError(
                        "E_PAL_REFERENCE", "PAL slot references must follow public slot order"
                    )
                steps.append(
                    {
                        "slot_id": slot["slot_id"],
                        "value": _render_fraction(
                            values[slot_ref["value_ref"]], slot["result_spec"]
                        ),
                    }
                )
            prediction = {
                "schema_version": PREDICTION_SCHEMA_VERSION,
                "dataset_version": question["dataset_version"],
                "case_id": question["case_id"],
                "final_answer": {
                    "value": _render_fraction(values[final_ref], question["answer_spec"])
                },
                "steps": steps,
            }
        else:
            raise BaselineResponseError(
                "E_RESPONSE_SCHEMA", "B3 response kind must be prediction or pal"
            )
    issues = validate_prediction_record(prediction, question)
    if issues:
        raise BaselineResponseError(
            "E_RESPONSE_CONTRACT", "response does not satisfy the published prediction contract"
        )
    return prediction


def _response_jsonl_rows(content: bytes) -> tuple[list[tuple[int, Mapping[str, Any]]], list[dict[str, Any]]]:
    rows: list[tuple[int, Mapping[str, Any]]] = []
    problems: list[dict[str, Any]] = []
    if len(content) > MAX_FILE_BYTES:
        return [], [{"code": "E_RESPONSE_RESOURCE", "line": None, "message": "response file exceeds the byte limit"}]
    missing_final_lf = bool(content and not content.endswith(b"\n"))
    if missing_final_lf:
        problems.append(
            {"code": "E_RESPONSE_ENCODING", "line": None, "message": "response JSONL must end with LF"}
        )
    for line_number, raw in enumerate(content.splitlines(keepends=True), start=1):
        if line_number > MAX_RECORDS:
            problems.append(
                {"code": "E_RESPONSE_RESOURCE", "line": line_number, "message": "response file exceeds the record limit"}
            )
            break
        payload = raw[:-1] if raw.endswith(b"\n") else raw
        if missing_final_lf and not raw.endswith(b"\n"):
            problems.append(
                {"code": "E_RESPONSE_ENCODING", "line": line_number, "message": "unterminated response line was rejected"}
            )
            continue
        if len(payload) > MAX_LINE_BYTES or b"\r" in raw or not payload or payload.startswith(b"\xef\xbb\xbf"):
            problems.append(
                {"code": "E_RESPONSE_ENCODING", "line": line_number, "message": "response line violates canonical JSONL encoding"}
            )
            continue
        try:
            text = payload.decode("utf-8")
            value = _strict_json_object(text)
        except (UnicodeError, BaselineResponseError):
            problems.append(
                {"code": "E_RESPONSE_JSONL", "line": line_number, "message": "response line is not one strict JSON object"}
            )
            continue
        rows.append((line_number, value))
    return rows, problems


def predictions_from_llm_responses(
    profile_name: str,
    questions: Mapping[str, Mapping[str, Any]],
    requests: Mapping[str, Mapping[str, Any]],
    response_content: bytes,
) -> tuple[tuple[dict[str, Any], ...], tuple[dict[str, Any], ...]]:
    """Parse independent response envelopes; each failed case becomes B0."""

    profile = resolve_profile(profile_name)
    rows, file_problems = _response_jsonl_rows(response_content)
    diagnostics = [
        _diagnostic(
            profile.method_id,
            problem["code"],
            problem["message"],
            line=problem["line"],
        )
        for problem in file_problems
    ]
    by_case: dict[str, tuple[int, Mapping[str, Any]]] = {}
    failed_cases: dict[str, tuple[str, str, int | None]] = {}
    envelope_keys = {
        "schema_version",
        "method_id",
        "request_id",
        "case_id",
        "response",
    }
    for line_number, row in rows:
        case_id = row.get("case_id") if isinstance(row.get("case_id"), str) else None
        if set(row) != envelope_keys:
            if case_id in questions:
                failed_cases[case_id] = (
                    "E_RESPONSE_ENVELOPE",
                    "response envelope has fields outside the exact contract",
                    line_number,
                )
            else:
                diagnostics.append(
                    _diagnostic(
                        profile.method_id,
                        "E_RESPONSE_ENVELOPE",
                        "unbound response envelope has fields outside the exact contract",
                        line=line_number,
                    )
                )
            continue
        if case_id not in questions:
            diagnostics.append(
                _diagnostic(
                    profile.method_id,
                    "E_UNKNOWN_RESPONSE_CASE",
                    "response case_id is not in the question bundle",
                    case_id=case_id,
                    line=line_number,
                )
            )
            continue
        if case_id in by_case or case_id in failed_cases:
            by_case.pop(case_id, None)
            failed_cases[case_id] = (
                "E_DUPLICATE_RESPONSE",
                "case_id appears more than once in responses",
                line_number,
            )
            continue
        request = requests[case_id]
        if (
            row.get("schema_version") != RESPONSE_SCHEMA_VERSION
            or row.get("method_id") != profile.method_id
            or row.get("request_id") != request["request_id"]
        ):
            failed_cases[case_id] = (
                "E_RESPONSE_BINDING",
                "response identity does not match the canonical request",
                line_number,
            )
            continue
        by_case[case_id] = (line_number, row)

    predictions: list[dict[str, Any]] = []
    for case_id in sorted(questions):
        question = questions[case_id]
        if case_id in failed_cases:
            code, message, line = failed_cases[case_id]
            diagnostics.append(
                _diagnostic(profile.method_id, code, message, case_id=case_id, line=line)
            )
            predictions.append(_abstention(question))
            continue
        envelope = by_case.get(case_id)
        if envelope is None:
            diagnostics.append(
                _diagnostic(
                    profile.method_id,
                    "E_MISSING_RESPONSE",
                    "no response envelope was provided for this case",
                    case_id=case_id,
                )
            )
            predictions.append(_abstention(question))
            continue
        line_number, row = envelope
        try:
            prediction = _prediction_from_response(profile, question, row["response"])
        except BaselineResponseError as exc:
            diagnostics.append(
                _diagnostic(
                    profile.method_id,
                    exc.code,
                    str(exc),
                    case_id=case_id,
                    line=line_number,
                )
            )
            prediction = _abstention(question)
        predictions.append(prediction)
    return tuple(predictions), tuple(diagnostics)


def _fingerprint(path: Path) -> dict[str, Any]:
    content = path.read_bytes()
    return {"bytes": len(content), "sha256": sha256_bytes(content)}


def _method_card(
    *,
    profile: BaselineProfile | None,
    method_id: str,
    questions_content: bytes,
    predictions: Sequence[Mapping[str, Any]],
    output_root: Path,
    diagnostics: Sequence[Mapping[str, Any]],
    implementation_revision: str,
    provider: str | None = None,
    model_id: str | None = None,
    model_revision: str | None = None,
    requests_content: bytes | None = None,
    responses_content: bytes | None = None,
    retrieval_example_count: int | None = None,
) -> dict[str, Any]:
    dataset_versions = {prediction["dataset_version"] for prediction in predictions}
    if len(dataset_versions) != 1:
        raise ContractError("materialized predictions must contain one dataset version")
    code_counts = Counter(diagnostic["code"] for diagnostic in diagnostics)
    artifacts = {
        name: _fingerprint(output_root / name)
        for name in ("predictions.jsonl", "submission.zip", "diagnostics.jsonl")
    }
    source: dict[str, Any] = {
        "questions_jsonl_sha256": sha256_bytes(questions_content),
    }
    if requests_content is not None:
        source["requests_jsonl_sha256"] = sha256_bytes(requests_content)
    if responses_content is not None:
        source["responses_jsonl_sha256"] = sha256_bytes(responses_content)
    method: dict[str, Any]
    if profile is None:
        method = {
            "kind": "deterministic_rules",
            "supported_public_families": list(B1_SUPPORTED_PUBLIC_FAMILIES),
        }
    else:
        method = {
            "kind": "provider_neutral_structured_llm",
            "model_class": profile.model_class,
            "inference": profile.inference,
            "provider": provider,
            "model_id": model_id,
            "model_revision": model_revision,
            "decoding": {"strategy": "greedy"},
            "structured_output_protocol": STRUCTURED_OUTPUT_PROTOCOL_VERSION,
            "retrieval": (
                {
                    "source": "public_train_only",
                    "algorithm": "token_multiset_jaccard",
                    "tie_break": "case_id",
                    "example_count": retrieval_example_count,
                }
                if profile.uses_retrieval
                else None
            ),
            "executor": (
                {"program_version": PAL_PROGRAM_VERSION, "numeric_types": ["Decimal", "Fraction"], "instruction_limit": MAX_PAL_INSTRUCTIONS}
                if profile.uses_pal
                else None
            ),
        }
    return {
        "schema_version": METHOD_CARD_SCHEMA_VERSION,
        "method_id": method_id,
        "dataset_version": next(iter(dataset_versions)),
        "implementation_revision": implementation_revision,
        "record_count": len(predictions),
        "answered_count": sum(prediction["final_answer"] is not None for prediction in predictions),
        "abstention_count": sum(prediction["final_answer"] is None for prediction in predictions),
        "checkpoint_value_count": sum(len(prediction["steps"]) for prediction in predictions),
        "diagnostics": {"count": len(diagnostics), "by_code": dict(sorted(code_counts.items()))},
        "source": source,
        "artifacts": artifacts,
        "method": method,
    }


def _materialize(
    *,
    questions_content: bytes,
    questions: Mapping[str, Mapping[str, Any]],
    predictions: Sequence[Mapping[str, Any]],
    diagnostics: Sequence[Mapping[str, Any]],
    output_dir: str | Path,
    method_id: str,
    implementation_revision: str,
    profile: BaselineProfile | None = None,
    provider: str | None = None,
    model_id: str | None = None,
    model_revision: str | None = None,
    requests_content: bytes | None = None,
    responses_content: bytes | None = None,
    retrieval_example_count: int | None = None,
) -> dict[str, Any]:
    if not isinstance(implementation_revision, str) or not implementation_revision.strip():
        raise ValueError("implementation_revision must be explicit")
    validation = validate_submission(predictions, questions, require_complete=True)
    if not validation.valid:
        raise ContractError(f"baseline predictions failed validation: {validation.as_dict()}")
    target = Path(output_dir)
    if target.exists() or target.is_symlink():
        raise ValueError("baseline output directory must not already exist")
    target.parent.mkdir(parents=True, exist_ok=True)
    scratch = Path(tempfile.mkdtemp(prefix=f".{target.name}.", dir=target.parent))
    try:
        predictions_path = scratch / "predictions.jsonl"
        predictions_path.write_bytes(canonical_jsonl(list(predictions)))
        diagnostics_path = scratch / "diagnostics.jsonl"
        diagnostics_path.write_bytes(canonical_jsonl(list(diagnostics)))
        archive_path = scratch / "submission.zip"
        build_submission_archive(predictions_path, archive_path)
        admitted = validate_submission_archive(archive_path, questions)
        if not admitted.valid:
            raise ContractError("newly built baseline archive failed public admission")
        card = _method_card(
            profile=profile,
            method_id=method_id,
            questions_content=questions_content,
            predictions=predictions,
            output_root=scratch,
            diagnostics=diagnostics,
            implementation_revision=implementation_revision,
            provider=provider,
            model_id=model_id,
            model_revision=model_revision,
            requests_content=requests_content,
            responses_content=responses_content,
            retrieval_example_count=retrieval_example_count,
        )
        (scratch / "method-card.json").write_bytes(
            (canonical_json(card) + "\n").encode("utf-8")
        )
        for artifact in scratch.iterdir():
            os.chmod(artifact, 0o644)
        os.replace(scratch, target)
        return card
    except Exception:
        shutil.rmtree(scratch, ignore_errors=True)
        raise


def materialize_b1(
    questions_path: str | Path,
    output_dir: str | Path,
    *,
    implementation_revision: str,
) -> dict[str, Any]:
    questions_content, questions = load_question_bundle(questions_path)
    predictions: list[dict[str, Any]] = []
    for case_id in sorted(questions):
        question = questions[case_id]
        prediction = build_b1_prediction(question)
        if validate_prediction_record(prediction, question):
            prediction = _abstention(question)
        predictions.append(prediction)
    return _materialize(
        questions_content=questions_content,
        questions=questions,
        predictions=predictions,
        diagnostics=(),
        output_dir=output_dir,
        method_id=B1_METHOD_ID,
        implementation_revision=implementation_revision,
    )


def materialize_llm(
    profile_name: str,
    questions_path: str | Path,
    requests_path: str | Path,
    responses_path: str | Path,
    output_dir: str | Path,
    *,
    provider: str,
    model_id: str,
    model_revision: str,
    implementation_revision: str,
) -> dict[str, Any]:
    profile = resolve_profile(profile_name)
    if not all(
        isinstance(value, str) and value.strip()
        for value in (provider, model_id, model_revision)
    ):
        raise ValueError("provider, model_id, and model_revision must be explicit")
    questions_content, questions = load_question_bundle(questions_path)
    requests_content, loaded_requests = load_jsonl_snapshot(requests_path)
    if not loaded_requests.valid:
        raise ContractError(f"baseline request JSONL is invalid: {loaded_requests.as_dict()}")
    requests = validate_llm_requests(loaded_requests.records, profile.method_id, questions)
    response_content, _ = load_jsonl_snapshot(responses_path)
    predictions, diagnostics = predictions_from_llm_responses(
        profile.method_id, questions, requests, response_content
    )
    return _materialize(
        questions_content=questions_content,
        questions=questions,
        predictions=predictions,
        diagnostics=diagnostics,
        output_dir=output_dir,
        method_id=profile.method_id,
        implementation_revision=implementation_revision,
        profile=profile,
        provider=provider,
        model_id=model_id,
        model_revision=model_revision,
        requests_content=requests_content,
        responses_content=response_content,
        retrieval_example_count=(
            len(next(iter(requests.values()))["retrieval_case_ids"])
            if profile.uses_retrieval
            else None
        ),
    )


__all__ = [
    "B1_METHOD_ID",
    "B2_METHOD_ID",
    "B3_METHOD_ID",
    "BaselineProfile",
    "StructuredBaselineProvider",
    "build_llm_requests",
    "canonical_json",
    "canonical_jsonl",
    "load_prediction_bundle",
    "load_question_bundle",
    "materialize_b1",
    "materialize_llm",
    "predictions_from_llm_responses",
    "resolve_profile",
    "response_envelope",
    "validate_llm_requests",
    "write_canonical_jsonl",
]
