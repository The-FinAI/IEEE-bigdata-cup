"""Gold-free deterministic rule baseline for participant-visible Task 1 rows.

The baseline deliberately recognizes a small, documented set of exact prompt
families.  It does not load structures, profiles, manifests, lineage, or gold.
Any prompt, result specification, arithmetic result, or trace description that
cannot be bound unambiguously produces a valid abstention instead.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, localcontext
from fractions import Fraction
from typing import Any, Callable, Mapping

from .contracts import PREDICTION_SCHEMA_VERSION


B1_SUPPORTED_PUBLIC_FAMILIES = (
    "revenue_vs_cogs",
    "operating_expenses_effect",
    "depreciation_ddb",
    "inventory_turnover",
    "dta_warranty_expense",
)
B1_SUPPORTED_FIXTURE_FAMILIES = (
    "synthetic_conformance_addition",
)

_INTEGER_TEXT = r"(?:0|[1-9][0-9]{0,63})"
_NUMBER_TEXT = (
    rf"-?(?:{_INTEGER_TEXT}(?:\.[0-9]{{1,64}})?|"
    rf"[1-9][0-9]{{0,63}}/[1-9][0-9]{{0,63}})"
)
_PREDICTION_DECIMAL = re.compile(
    r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?(?:0|[1-9][0-9]{0,2}))?\Z"
)


_REVENUE_VS_COGS_PROMPT = (
    "For one reporting period, a company reports revenue of {{revenue_usd}} USD "
    "and cost of goods sold of {{cogs_usd}} USD. The amounts use the same period "
    "and currency, and cost of goods sold does not exceed revenue. Compute gross "
    "profit as revenue minus cost of goods sold."
)
_OPERATING_EXPENSES_PROMPT = (
    "For one reporting period, a company reports gross profit of "
    "{{gross_profit_usd}} USD and total operating expenses of "
    "{{operating_expenses_usd}} USD. The operating-expense amount includes every "
    "charge to be deducted between gross profit and operating profit, with no "
    "separate depreciation, amortization, or other operating charge remaining. "
    "Compute operating profit as gross profit minus operating expenses."
)
_DEPRECIATION_DDB_PROMPT = (
    "A company purchases an asset for {{asset_cost_usd}} USD with a useful life of "
    "{{useful_life_years}} years. The useful life is one of 5, 6, 7, or 8 years, "
    "residual value is zero, and no switch to straight-line depreciation occurs "
    "during the first two years. Apply double-declining-balance depreciation at "
    "the exact annual rate 2 divided by useful life. Use the exact first-year "
    "carrying value in Year 2, do not round any intermediate value, and compute "
    "book value at the end of Year 2."
)
_INVENTORY_TURNOVER_PROMPT = (
    "For a 365-day reporting year, a company reports annual cost of goods sold of "
    "{{cogs_usd}} USD, opening inventory of {{opening_inventory_usd}} USD, and "
    "closing inventory of {{closing_inventory_usd}} USD. Compute average inventory "
    "as the exact arithmetic mean of opening and closing inventory, compute "
    "inventory turnover as annual COGS divided by that exact average, and compute "
    "average days to sell as 365 divided by exact turnover. Do not round any "
    "intermediate value."
)
_DTA_WARRANTY_PROMPT = (
    "A company recognizes {{book_warranty_expense_usd}} USD of warranty expense "
    "under accrual financial reporting in the current period. Only "
    "{{tax_deductible_current_usd}} USD is deductible on the current tax return; "
    "the entire remainder will be deductible when the warranty obligation is "
    "settled. The enacted tax rate expected when the difference reverses is "
    "{{enacted_tax_rate_percent}} percent. Assume the full gross deferred tax asset "
    "is recognized with no valuation allowance and no discounting. Compute the "
    "deferred tax asset from this deductible temporary difference."
)
_CONFORMANCE_PROMPT = (
    "Synthetic conformance example: {{left}} + {{right}} = ?. Return the exact count."
)


def _compile_prompt(template: str, fields: tuple[str, ...]) -> re.Pattern[str]:
    pattern = re.escape(template)
    for field in fields:
        placeholder = re.escape("{{" + field + "}}")
        pattern = pattern.replace(placeholder, rf"(?P<{field}>{_NUMBER_TEXT})")
    return re.compile(pattern + r"\Z")


_REVENUE_VS_COGS_PATTERN = _compile_prompt(
    _REVENUE_VS_COGS_PROMPT, ("revenue_usd", "cogs_usd")
)
_OPERATING_EXPENSES_PATTERN = _compile_prompt(
    _OPERATING_EXPENSES_PROMPT,
    ("gross_profit_usd", "operating_expenses_usd"),
)
_DEPRECIATION_DDB_PATTERN = _compile_prompt(
    _DEPRECIATION_DDB_PROMPT, ("asset_cost_usd", "useful_life_years")
)
_INVENTORY_TURNOVER_PATTERN = _compile_prompt(
    _INVENTORY_TURNOVER_PROMPT,
    ("cogs_usd", "opening_inventory_usd", "closing_inventory_usd"),
)
_DTA_WARRANTY_PATTERN = _compile_prompt(
    _DTA_WARRANTY_PROMPT,
    (
        "book_warranty_expense_usd",
        "tax_deductible_current_usd",
        "enacted_tax_rate_percent",
    ),
)
_CONFORMANCE_PATTERN = _compile_prompt(_CONFORMANCE_PROMPT, ("left", "right"))


TraceMatcher = Callable[[str], bool]


@dataclass(frozen=True)
class _TraceValue:
    value: Fraction
    permitted_units: frozenset[str]
    matches: TraceMatcher


@dataclass(frozen=True)
class _Solution:
    family: str
    final_value: Fraction
    final_units: frozenset[str]
    traces: tuple[_TraceValue, ...]


@dataclass(frozen=True)
class _Rule:
    pattern: re.Pattern[str]
    solve: Callable[[Mapping[str, Fraction]], _Solution | None]


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
    fractional_text = f"{fractional:0{places}d}".rstrip("0")
    return f"{sign}{whole}.{fractional_text}"


def _parse_visible_number(text: str) -> Fraction:
    value = Fraction(text)
    if _fraction_to_exact_text(value) != text:
        raise ValueError("visible numeric input is not canonically rendered")
    return value


def _round_half_up_text(value: Fraction, decimal_places: int) -> str:
    scale = 10**decimal_places
    scaled_numerator = value.numerator * scale
    denominator = value.denominator
    if scaled_numerator >= 0:
        rounded = (2 * scaled_numerator + denominator) // (2 * denominator)
    else:
        rounded = -(
            (2 * (-scaled_numerator) + denominator) // (2 * denominator)
        )
    sign = "-" if rounded < 0 else ""
    whole, fractional = divmod(abs(rounded), scale)
    if decimal_places == 0:
        return f"{sign}{whole}"
    return f"{sign}{whole}.{fractional:0{decimal_places}d}"


def _format_decimal(
    value: Fraction,
    spec: Mapping[str, Any],
    permitted_units: frozenset[str],
) -> str | None:
    if spec.get("type") != "decimal" or spec.get("unit") not in permitted_units:
        return None
    rounding = spec.get("rounding")
    if not isinstance(rounding, Mapping):
        return None
    if rounding == {"mode": "exact"}:
        text = _fraction_to_exact_text(value)
    elif rounding.get("mode") == "half_up" and set(rounding) == {
        "mode",
        "decimal_places",
    }:
        places = rounding.get("decimal_places")
        if not isinstance(places, int) or isinstance(places, bool) or not 0 <= places <= 12:
            return None
        text = _round_half_up_text(value, places)
    else:
        return None

    if len(text) > 256:
        return None
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        if (
            len(numerator.lstrip("-")) > 64
            or len(denominator) > 64
            or rounding != {"mode": "exact"}
        ):
            return None
        with localcontext() as context:
            context.prec = 256
            decimal_value = Decimal(numerator) / Decimal(denominator)
        if decimal_value and not -100 <= decimal_value.adjusted() <= 100:
            return None
        return text
    if _PREDICTION_DECIMAL.fullmatch(text) is None:
        return None
    coefficient = text.split("e", 1)[0].split("E", 1)[0].lstrip("-")
    digits = coefficient.replace(".", "").lstrip("0") or "0"
    if len(digits) > 64:
        return None
    decimal_value = Decimal(text)
    if decimal_value and not -100 <= decimal_value.adjusted() <= 100:
        return None
    return text


def _expected_answer_contract(spec: Any) -> str | None:
    if not isinstance(spec, Mapping) or spec.get("type") != "decimal":
        return None
    unit = spec.get("unit")
    rounding = spec.get("rounding")
    if not isinstance(unit, str) or not isinstance(rounding, Mapping):
        return None
    if rounding == {"mode": "exact"}:
        return (
            "Answer format: return only the exact numeric value interpreted in "
            f"`{unit}`, using finite-decimal notation when it terminates in base "
            "10 and an irreducible `numerator/denominator` fraction otherwise, "
            "with no unit label or additional text."
        )
    if rounding.get("mode") == "half_up" and set(rounding) == {
        "mode",
        "decimal_places",
    }:
        places = rounding.get("decimal_places")
        if not isinstance(places, int) or isinstance(places, bool) or not 0 <= places <= 12:
            return None
        digit_word = "digit" if places == 1 else "digits"
        return (
            "Answer format: use exact arithmetic through all intermediate steps, "
            f"round only the final value half up to {places} decimal {digit_word}, "
            f"and return only the numeric value interpreted in `{unit}` with no "
            "unit label or additional text."
        )
    return None


def _strip_answer_contract(question_text: str, spec: Any) -> str | None:
    contract = _expected_answer_contract(spec)
    if contract is None:
        return None
    suffix = "\n\n" + contract
    if not question_text.endswith(suffix):
        return None
    prompt = question_text[: -len(suffix)]
    if not prompt or prompt != prompt.strip():
        return None
    return prompt


def _normalize_description(description: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", description.casefold()))


def _has_phrase(description: str, phrase: str) -> bool:
    return re.search(rf"(?:^| ){re.escape(phrase)}(?: |$)", description) is not None


def _has_year(description: str, year: int) -> bool:
    words = ("first", "one") if year == 1 else ("second", "two")
    return (
        _has_phrase(description, f"year {year}")
        or _has_phrase(description, f"{words[0]} year")
        or _has_phrase(description, f"year {words[1]}")
    )


def _gross_profit(description: str) -> bool:
    return _has_phrase(description, "gross profit")


def _operating_profit(description: str) -> bool:
    return _has_phrase(description, "operating profit")


def _ddb_rate(description: str) -> bool:
    return _has_phrase(description, "rate") and (
        _has_phrase(description, "double declining")
        or _has_phrase(description, "depreciation rate")
    )


def _year_one_depreciation(description: str) -> bool:
    return (
        _has_year(description, 1)
        and _has_phrase(description, "depreciation")
        and not _has_phrase(description, "rate")
        and not _has_phrase(description, "book value")
        and not _has_phrase(description, "carrying value")
    )


def _year_one_carrying_value(description: str) -> bool:
    return (
        _has_year(description, 1)
        and not _has_phrase(description, "depreciation")
        and (
            _has_phrase(description, "book value")
            or _has_phrase(description, "carrying value")
        )
    )


def _year_two_depreciation(description: str) -> bool:
    return (
        _has_year(description, 2)
        and _has_phrase(description, "depreciation")
        and not _has_phrase(description, "rate")
        and not _has_phrase(description, "book value")
        and not _has_phrase(description, "carrying value")
    )


def _year_two_book_value(description: str) -> bool:
    return (
        _has_year(description, 2)
        and not _has_phrase(description, "depreciation")
        and (
            _has_phrase(description, "book value")
            or _has_phrase(description, "carrying value")
        )
    )


def _average_inventory(description: str) -> bool:
    return _has_phrase(description, "average inventory")


def _inventory_turnover(description: str) -> bool:
    return _has_phrase(description, "inventory turnover") and not _has_phrase(
        description, "days"
    )


def _average_days_to_sell(description: str) -> bool:
    return _has_phrase(description, "days to sell")


def _deductible_temporary_difference(description: str) -> bool:
    return _has_phrase(description, "deductible temporary difference")


def _enacted_tax_rate(description: str) -> bool:
    return _has_phrase(description, "enacted tax rate") or description == "tax rate"


def _deferred_tax_asset(description: str) -> bool:
    return _has_phrase(description, "deferred tax asset")


def _sum(description: str) -> bool:
    return _has_phrase(description, "sum")


def _is_compound_description(description: str) -> bool:
    words = set(description.split())
    return bool(words & {"and", "or", "versus", "vs"})


def _solve_revenue_vs_cogs(values: Mapping[str, Fraction]) -> _Solution | None:
    revenue = values["revenue_usd"]
    cogs = values["cogs_usd"]
    if revenue < 0 or cogs < 0 or cogs > revenue:
        return None
    gross_profit = revenue - cogs
    trace = _TraceValue(gross_profit, frozenset({"usd"}), _gross_profit)
    return _Solution(
        "revenue_vs_cogs", gross_profit, frozenset({"usd"}), (trace,)
    )


def _solve_operating_expenses(values: Mapping[str, Fraction]) -> _Solution | None:
    gross_profit = values["gross_profit_usd"]
    operating_expenses = values["operating_expenses_usd"]
    if gross_profit < 0 or operating_expenses < 0:
        return None
    operating_profit = gross_profit - operating_expenses
    trace = _TraceValue(operating_profit, frozenset({"usd"}), _operating_profit)
    return _Solution(
        "operating_expenses_effect",
        operating_profit,
        frozenset({"usd"}),
        (trace,),
    )


def _solve_depreciation_ddb(values: Mapping[str, Fraction]) -> _Solution | None:
    asset_cost = values["asset_cost_usd"]
    useful_life = values["useful_life_years"]
    if (
        asset_cost < 0
        or useful_life.denominator != 1
        or useful_life.numerator not in {5, 6, 7, 8}
    ):
        return None
    rate = Fraction(2, useful_life.numerator)
    year_one_depreciation = asset_cost * rate
    year_one_carrying_value = asset_cost - year_one_depreciation
    year_two_depreciation = year_one_carrying_value * rate
    year_two_book_value = year_one_carrying_value - year_two_depreciation
    return _Solution(
        "depreciation_ddb",
        year_two_book_value,
        frozenset({"usd"}),
        (
            _TraceValue(
                rate,
                frozenset({"dimensionless", "ratio", "ratio_per_year"}),
                _ddb_rate,
            ),
            _TraceValue(
                year_one_depreciation,
                frozenset({"usd"}),
                _year_one_depreciation,
            ),
            _TraceValue(
                year_one_carrying_value,
                frozenset({"usd"}),
                _year_one_carrying_value,
            ),
            _TraceValue(
                year_two_depreciation,
                frozenset({"usd"}),
                _year_two_depreciation,
            ),
            _TraceValue(
                year_two_book_value,
                frozenset({"usd"}),
                _year_two_book_value,
            ),
        ),
    )


def _solve_inventory_turnover(values: Mapping[str, Fraction]) -> _Solution | None:
    cogs = values["cogs_usd"]
    opening_inventory = values["opening_inventory_usd"]
    closing_inventory = values["closing_inventory_usd"]
    if cogs <= 0 or opening_inventory < 0 or closing_inventory < 0:
        return None
    average_inventory = (opening_inventory + closing_inventory) / 2
    if average_inventory <= 0:
        return None
    turnover = cogs / average_inventory
    days_to_sell = Fraction(365) / turnover
    return _Solution(
        "inventory_turnover",
        days_to_sell,
        frozenset({"days"}),
        (
            _TraceValue(
                average_inventory, frozenset({"usd"}), _average_inventory
            ),
            _TraceValue(
                turnover,
                frozenset({"multiple", "ratio_per_year", "times_per_year"}),
                _inventory_turnover,
            ),
            _TraceValue(
                days_to_sell, frozenset({"days"}), _average_days_to_sell
            ),
        ),
    )


def _solve_dta_warranty(values: Mapping[str, Fraction]) -> _Solution | None:
    book_expense = values["book_warranty_expense_usd"]
    current_deduction = values["tax_deductible_current_usd"]
    tax_rate_percent = values["enacted_tax_rate_percent"]
    if (
        book_expense < 0
        or current_deduction < 0
        or current_deduction > book_expense
        or not 0 <= tax_rate_percent <= 100
    ):
        return None
    temporary_difference = book_expense - current_deduction
    tax_rate_ratio = tax_rate_percent / 100
    deferred_tax_asset = temporary_difference * tax_rate_ratio
    return _Solution(
        "dta_warranty_expense",
        deferred_tax_asset,
        frozenset({"usd"}),
        (
            _TraceValue(
                temporary_difference,
                frozenset({"usd"}),
                _deductible_temporary_difference,
            ),
            _TraceValue(
                tax_rate_percent,
                frozenset({"nominal_percent", "percent"}),
                _enacted_tax_rate,
            ),
            _TraceValue(
                tax_rate_ratio,
                frozenset({"dimensionless", "ratio"}),
                _enacted_tax_rate,
            ),
            _TraceValue(
                deferred_tax_asset,
                frozenset({"usd"}),
                _deferred_tax_asset,
            ),
        ),
    )


def _solve_conformance(values: Mapping[str, Fraction]) -> _Solution | None:
    result = values["left"] + values["right"]
    if result.denominator != 1:
        return None
    trace = _TraceValue(result, frozenset({"count"}), _sum)
    return _Solution(
        "synthetic_conformance_addition",
        result,
        frozenset({"count"}),
        (trace,),
    )


_CANONICAL_RULES = (
    _Rule(_REVENUE_VS_COGS_PATTERN, _solve_revenue_vs_cogs),
    _Rule(_OPERATING_EXPENSES_PATTERN, _solve_operating_expenses),
    _Rule(_DEPRECIATION_DDB_PATTERN, _solve_depreciation_ddb),
    _Rule(_INVENTORY_TURNOVER_PATTERN, _solve_inventory_turnover),
    _Rule(_DTA_WARRANTY_PATTERN, _solve_dta_warranty),
)


def _match_rule(prompt: str, rule: _Rule) -> _Solution | None:
    match = rule.pattern.fullmatch(prompt)
    if match is None:
        return None
    values = {
        name: _parse_visible_number(text) for name, text in match.groupdict().items()
    }
    return rule.solve(values)


def _solve_visible_question(question: Mapping[str, Any]) -> _Solution | None:
    question_text = question.get("question")
    if not isinstance(question_text, str):
        return None

    conformance_match = _CONFORMANCE_PATTERN.fullmatch(question_text)
    if conformance_match is not None:
        values = {
            name: _parse_visible_number(text)
            for name, text in conformance_match.groupdict().items()
        }
        return _solve_conformance(values)

    prompt = _strip_answer_contract(question_text, question.get("answer_spec"))
    if prompt is None:
        return None
    matches = [
        solution
        for rule in _CANONICAL_RULES
        if (solution := _match_rule(prompt, rule)) is not None
    ]
    if len(matches) != 1:
        return None
    return matches[0]


def _abstention(question: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": PREDICTION_SCHEMA_VERSION,
        "dataset_version": question.get("dataset_version"),
        "case_id": question.get("case_id"),
        "final_answer": None,
        "steps": [],
    }


def build_b1_prediction(question: Mapping[str, Any]) -> dict[str, Any]:
    """Build one prediction from public question bytes, failing closed to abstention."""

    prediction = _abstention(question)
    try:
        solution = _solve_visible_question(question)
        if solution is None:
            return prediction
        final_text = _format_decimal(
            solution.final_value, question.get("answer_spec", {}), solution.final_units
        )
        if final_text is None:
            return prediction

        steps: list[dict[str, str]] = []
        trace_spec = question.get("trace_spec")
        slots = trace_spec.get("slots") if isinstance(trace_spec, Mapping) else None
        if isinstance(slots, list):
            for slot in slots:
                if not isinstance(slot, Mapping):
                    continue
                description = slot.get("description")
                result_spec = slot.get("result_spec")
                slot_id = slot.get("slot_id")
                if (
                    not isinstance(description, str)
                    or not isinstance(result_spec, Mapping)
                    or not isinstance(slot_id, str)
                ):
                    continue
                normalized = _normalize_description(description)
                if (
                    solution.family != "synthetic_conformance_addition"
                    and _is_compound_description(normalized)
                ):
                    continue
                candidates = [
                    trace
                    for trace in solution.traces
                    if result_spec.get("unit") in trace.permitted_units
                    and trace.matches(normalized)
                ]
                if len(candidates) != 1:
                    continue
                value_text = _format_decimal(
                    candidates[0].value,
                    result_spec,
                    candidates[0].permitted_units,
                )
                if value_text is not None:
                    steps.append({"slot_id": slot_id, "value": value_text})

        prediction["final_answer"] = {"value": final_text}
        prediction["steps"] = steps
        return prediction
    except (ArithmeticError, InvalidOperation, OverflowError, ValueError):
        return prediction


__all__ = [
    "B1_SUPPORTED_FIXTURE_FAMILIES",
    "B1_SUPPORTED_PUBLIC_FAMILIES",
    "build_b1_prediction",
]
