"""Experimental deterministic A/S/E/C classifier.

This is NOT the official evaluator.  It exists so that the LLM judge can be
audited against a rule-based reimplementation of the same rubric (see
DETERMINISTIC_EVALUATION_ANALYSIS.md).  Switching official scoring to it is an
organizer decision.
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from .parser import normalize_number, numbers_equal

__all__ = ["deterministic_label", "parse_answer_object"]


def parse_answer_object(text: str) -> Optional[Dict[str, Any]]:
    """Recover an ``{"extracted_value": .., "calculated_value": ..}`` object.

    Accepts the object embedded in surrounding prose (the outermost ``{...}``
    span), matching the prompt's "minor formatting differences are acceptable".
    Returns ``None`` when no such object with both keys can be found.
    """
    if text is None:
        return None
    candidate = str(text).strip()
    if not candidate:
        return None
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    if "extracted_value" not in parsed or "calculated_value" not in parsed:
        return None
    return parsed


def deterministic_label(gold_text: str, pred_text: str) -> str:
    """Apply the FinMR rubric hierarchy: structure -> extracted -> calculated."""
    gold = parse_answer_object(gold_text)
    if gold is None:
        # A malformed gold record is an organizer-side data error, not a
        # participant error; surface it loudly instead of scoring the case.
        raise ValueError(f"Gold answer is not a valid FinMR answer object: {gold_text!r}")

    pred = parse_answer_object(pred_text)
    if pred is None:
        return "S"
    # The prompt says "exactly two keys"; extra keys are treated as structural
    # noise only when the two required keys are absent, which parse_answer_object
    # already enforces.  Non-scalar values are structurally invalid.
    for key in ("extracted_value", "calculated_value"):
        value = pred[key]
        if isinstance(value, (dict, list)):
            return "S"
        if value is None or str(value).strip() == "":
            return "S"

    if not numbers_equal(gold["extracted_value"], pred["extracted_value"]):
        return "E"
    if not numbers_equal(gold["calculated_value"], pred["calculated_value"]):
        return "C"
    return "A"


def is_mismatch_case(extracted: Any, calculated: Any) -> Optional[bool]:
    """Diagnostic only: does the reported value disagree with the calculated one?

    Returns ``None`` when either side is not numeric.  This is a *diagnostic*
    derived from the two official outputs - Task 3 does not score match/mismatch
    (see TASK_SPEC.md section "Match / mismatch is a diagnostic, not a task").
    """
    left = normalize_number(extracted)
    right = normalize_number(calculated)
    if left is None or right is None:
        return None
    return left != right
