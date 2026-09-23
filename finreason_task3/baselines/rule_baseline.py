#!/usr/bin/env python3
"""Rule-based Task 3 baseline: no model, no API key, no network.

The case hands you a suspicious figure and asks two questions about it --
what the filing reports, and what the filing's own relationships imply it
should be. This baseline answers both from the filing.

It is deliberately not told which data-quality rule a case belongs to. A
real reviewer does not start from the rule; they look at how the element
is defined and how it participates in the statement's arithmetic, and the
published rule that matches is what they conclude, not what they assume.
So nothing here reads a rule identifier, and the two mechanisms are
chosen by where the concept sits in the calculation linkbase:

**Summation.** If the concept is the parent of summation-item arcs, the
value it should carry is the weighted sum of its children in the same
context. About two thirds of cases look like this.

**Sign.** Otherwise the calculation linkbase says nothing about what the
value should be, and the taxonomy does: an element with a debit balance
carried at a positive weight is a magnitude, so a negative reported
figure contradicts its own definition, and the value implied is the
magnitude. About one third of cases look like this.

Neither mechanism is subtle, and that is the point -- this is the floor a
submission should clear, not a solution.

    python baselines/rule_baseline.py \
        --input data/public_dev_inputs.jsonl \
        --output predictions.jsonl
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from task3_core.io import DataError, load_inputs, write_jsonl  # noqa: E402
from task3_core.schema import ParticipantPrediction  # noqa: E402

__all__ = [
    "Prediction",
    "Target",
    "balance_of",
    "find_fact",
    "matching_contexts",
    "parse_question",
    "predict",
    "summation_children",
]


@dataclass(frozen=True)
class Target:
    """What the case asks about: one concept, in one period."""

    concept: str
    start: str
    end: Optional[str]  # None for an instant


@dataclass(frozen=True)
class Prediction:
    extracted_value: str
    calculated_value: str
    mechanism: str


_QUESTION = re.compile(
    r"Question1:.*?reported value of\s+([\w.-]+:[\w.-]+).*?"
    r"period\s+(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?",
    re.S,
)
_CONTEXT = re.compile(r"<context id=\"([^\"]+)\">(.*?)</context>", re.S)
_CALC_ARC = re.compile(r"<link:calculationArc\b([^>]*)>")
# loc_<prefix>_<LocalName>[_<generated id>]. The trailing id is present in
# real filings and absent in hand-written fixtures, and local names do not
# themselves contain underscores, so the first two segments are the concept.
_LOCATOR = re.compile(r"^loc_([\w.-]+?)_([A-Za-z][\w.-]*?)(?:_[\w-]+)?$")


def _section(query: str, start: str, end: Optional[str]) -> str:
    i = query.find(start)
    if i < 0:
        return ""
    j = query.find(end, i + 1) if end else -1
    return query[i : j if j > 0 else len(query)]


def _attr(attrs: str, name: str) -> Optional[str]:
    m = re.search(re.escape(name) + r'="([^"]*)"', attrs)
    return m.group(1) if m else None


def parse_question(query: str) -> Optional[Target]:
    """Pull the concept and period out of the case's own question."""
    m = _QUESTION.search(query)
    if not m:
        return None
    return Target(m.group(1), m.group(2), m.group(3))


def matching_contexts(query: str, target: Target) -> Set[str]:
    """Context ids for the asked-about period, consolidated only.

    Segment-qualified contexts are excluded. A dimensional fact is one
    breakdown of the figure, not the figure, and picking one up answers a
    different question than the case asked with no visible sign of it.
    """
    instance = _section(query, "##Instance document", None) or query
    found: Set[str] = set()
    for match in _CONTEXT.finditer(instance):
        body = match.group(2)
        if "<segment>" in body or "xbrldi:" in body:
            continue
        if target.end:
            ok = (
                f"<startDate>{target.start}</startDate>" in body
                and f"<endDate>{target.end}</endDate>" in body
            )
        else:
            ok = f"<instant>{target.start}</instant>" in body
        if ok:
            found.add(match.group(1))
    return found


def find_fact(query: str, concept: str, contexts: Set[str]) -> Optional[str]:
    """The value reported for ``concept`` in one of ``contexts``."""
    if not contexts:
        return None
    instance = _section(query, "##Instance document", None) or query
    local = concept.split(":")[-1]
    pattern = re.compile(r"<[\w.-]*:?" + re.escape(local) + r"\s([^>]*)>([^<]*)</")
    for match in pattern.finditer(instance):
        attrs, raw = match.group(1), match.group(2).strip()
        ref = _attr(attrs, "contextRef")
        if ref not in contexts or not raw:
            continue
        # An explicit sign="-" negates the element content it decorates.
        if _attr(attrs, "sign") == "-" and not raw.startswith("-"):
            raw = "-" + raw
        return raw
    return None


def summation_children(query: str, concept: str) -> List[Tuple[str, float]]:
    """Children of ``concept`` in the calculation linkbase, with weights.

    Attribute order in the arcs is not stable across filings, so each arc
    is read attribute by attribute rather than matched as one pattern.
    """
    calc = _section(query, "##Calculation linkbase document", "##Definition linkbase")
    if not calc:
        return []
    local = concept.split(":")[-1]
    prefix = concept.split(":")[0] if ":" in concept else "us-gaap"
    children: List[Tuple[str, float]] = []
    for match in _CALC_ARC.finditer(calc):
        attrs = match.group(1)
        frm, to = _attr(attrs, "xlink:from"), _attr(attrs, "xlink:to")
        if not frm or not to or not _locator_is(frm, local):
            continue
        child = _locator_concept(to, prefix)
        weight = _attr(attrs, "weight")
        if child is None or weight is None:
            continue
        try:
            children.append((child, float(weight)))
        except ValueError:
            continue
    return children


def _locator_is(locator: str, local: str) -> bool:
    name = _locator_concept(locator, "")
    return name is not None and name.split(":")[-1] == local


def _locator_concept(locator: str, default_prefix: str) -> Optional[str]:
    """``loc_us-gaap_ChildA_019f84cd-...`` -> ``us-gaap:ChildA``."""
    m = _LOCATOR.match(locator)
    if m:
        return f"{m.group(1)}:{m.group(2)}"
    body = locator[4:] if locator.startswith("loc_") else locator
    if not body:
        return None
    prefix, _, rest = body.partition("_")
    if not rest:
        return f"{default_prefix}:{prefix}" if default_prefix else prefix
    return f"{prefix}:{rest}"


def balance_of(query: str, concept: str) -> Optional[str]:
    """The taxonomy's balance for ``concept``: ``debit``, ``credit`` or None."""
    taxonomy = _section(query, "##US GAAP Taxonomy", None) or query
    m = re.search(
        r"ID:\s*" + re.escape(concept) + r"\b[\s\S]{0,400}?Balance:\s*(\w+)", taxonomy
    )
    if not m:
        return None
    value = m.group(1).lower()
    return value if value in {"debit", "credit"} else None


def _format_like(value: float, template: str) -> str:
    """Render ``value`` the way the filing renders ``template``."""
    text = f"{value:.4f}".rstrip("0").rstrip(".")
    if text in {"", "-"}:
        text = "0"
    if "," in template:
        sign = "-" if text.startswith("-") else ""
        whole, _, frac = text.lstrip("-").partition(".")
        text = sign + f"{int(whole):,}" + (f".{frac}" if frac else "")
    return text


def _as_number(text: str) -> Optional[float]:
    try:
        return float(text.replace(",", ""))
    except (AttributeError, ValueError):
        return None


def predict(query: str, mode: str = "full") -> Prediction:
    """Answer both questions for one case.

    Always returns a well-formed prediction: a case the baseline cannot
    resolve answers "0" for both, because a missing line invalidates the
    whole submission rather than costing one case.
    """
    target = parse_question(query)
    if target is None:
        return Prediction("0", "0", "unresolved")

    contexts = matching_contexts(query, target)
    reported = find_fact(query, target.concept, contexts)
    if reported is None:
        return Prediction("0", "0", "unresolved")

    value = _as_number(reported)
    if value is None:
        return Prediction(reported, reported, "unresolved")

    # Two reference modes, for comparison rather than for scoring well.
    # "extract" answers only the first question and asserts the filing agrees
    # with itself, which isolates how hard the extraction alone is. "negate"
    # is the shortcut: flip the sign and reason about nothing. Publishing what
    # it scores is the point -- a submission near that line has learned
    # nothing, whatever the leaderboard says.
    if mode == "extract":
        return Prediction(reported, reported, "extract-only")
    if mode == "negate":
        return Prediction(reported, _format_like(-value, reported), "negate")

    children = summation_children(query, target.concept)
    if children:
        total = 0.0
        seen = 0
        for child, weight in children:
            raw = find_fact(query, child, contexts)
            number = _as_number(raw) if raw is not None else None
            if number is None:
                continue
            total += number * weight
            seen += 1
        if seen:
            return Prediction(reported, _format_like(total, reported), "summation")

    # No arithmetic to check against, so fall back to what the element's own
    # definition says. XBRL carries direction in the balance attribute and
    # reports both debit and credit monetary items as magnitudes, so a
    # negative figure contradicts the definition either way -- the balance is
    # not what distinguishes the two, it is what says the element has a
    # direction at all. An element with no balance (a string, or a "change in"
    # figure that is legitimately signed) is left alone.
    balance = balance_of(query, target.concept)
    if balance in {"debit", "credit"} and value < 0:
        return Prediction(reported, _format_like(-value, reported), "sign")
    return Prediction(reported, reported, "agree")


def run(inputs: Dict[str, object], mode: str = "full") -> Tuple[List[dict], Counter]:
    rows: List[dict] = []
    tally: Counter = Counter()
    for case_id, case in inputs.items():
        query = getattr(case, "query", None) or ""
        prediction = predict(query, mode)
        tally[prediction.mechanism] += 1
        rows.append(
            ParticipantPrediction(
                id=case_id,
                extracted_value=prediction.extracted_value,
                calculated_value=prediction.calculated_value,
            ).to_dict()
        )
    return rows, tally


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--input", default="data/public_dev_inputs.jsonl")
    parser.add_argument("--output", default="predictions.jsonl")
    parser.add_argument(
        "--mode",
        choices=("full", "extract", "negate"),
        default="full",
        help="full: read the filing's relationships (default). "
             "extract: answer only question 1 and assume the filing agrees with itself. "
             "negate: flip the sign and reason about nothing -- a reference for how far "
             "a shortcut gets, not a method.",
    )
    args = parser.parse_args(argv)

    try:
        inputs = load_inputs(args.input)
    except DataError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    rows, tally = run(inputs, args.mode)
    count = write_jsonl(args.output, rows)

    print(f"Wrote {count} predictions to {args.output}")
    print("Mechanism used:")
    for name, n in tally.most_common():
        print(f"  {name:12} {n:5}  ({n / max(count, 1):.1%})")
    print("\nNext:")
    print(f"  python scripts/validate_submission.py --predictions {args.output} --reference {args.input}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
