"""Judge-output parsing and numeric normalisation."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Optional

__all__ = [
    "VALID_LABELS",
    "LABEL_NAMES",
    "parse_label",
    "normalize_number",
    "numbers_equal",
]

#: The four mutually exclusive labels of the FinMR rubric.
VALID_LABELS = {"A", "S", "E", "C"}

LABEL_NAMES = {
    "A": "Accurate",
    "S": "Structural error",
    "E": "Extraction error",
    "C": "Calculation error",
}

# Decorative characters a model may wrap a value in. The minus sign is absent
# from the leading set and the decimal point from both: stripping either would
# silently turn "-1284" into "1284" or ".5" into "5".
_LEADING_JUNK = re.compile(r"""^[\s"'`*]+""")
_TRAILING_JUNK = re.compile(r"""[\s"'`*:;]+$""")

_CURRENCY = str.maketrans({c: None for c in "$€£¥₹"})


def parse_label(raw: object) -> Optional[str]:
    """Normalise a judge response to a label, or ``None`` if it is invalid.

    Reference semantics (notebook): strip, uppercase, then require the result to
    be exactly one character inside ``{A, S, E, C}``.  Anything else counts as an
    invalid judge output and is excluded from the metric denominators.
    """
    if raw is None:
        return None
    text = str(raw).strip().upper()
    if len(text) == 1 and text in VALID_LABELS:
        return text
    return None


def normalize_number(value: object) -> Optional[Decimal]:
    """Parse a FinMR-style numeric string into a :class:`~decimal.Decimal`.

    Handles thousands separators, unicode minus signs, parenthesised negatives,
    currency symbols, percent signs and surrounding decoration.  Returns ``None``
    when the text is not a number; callers decide what that means.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        return Decimal(str(value))

    text = str(value).strip()
    if not text:
        return None

    stripped = _TRAILING_JUNK.sub("", _LEADING_JUNK.sub("", text))
    text = stripped or text
    text = text.replace("−", "-").replace("–", "-").replace("—", "-")

    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative = True
        text = text[1:-1].strip()

    text = text.translate(_CURRENCY)
    for junk in ("%", ",", "_", " ", " "):
        text = text.replace(junk, "")
    # A single trailing period is sentence punctuation, not a decimal point.
    if text.endswith("."):
        text = text[:-1]
    if not text:
        return None

    try:
        number = Decimal(text)
    except (InvalidOperation, ValueError):
        return None
    if not number.is_finite():
        return None
    return -number if negative else number


def numbers_equal(left: object, right: object) -> bool:
    """Numeric-meaning equality with zero tolerance.

    Falls back to case-insensitive, whitespace-stripped string comparison when
    neither side parses as a number, so non-numeric values still compare
    sensibly.  A number never equals a non-number.
    """
    left_num = normalize_number(left)
    right_num = normalize_number(right)
    if left_num is not None and right_num is not None:
        return left_num == right_num
    if left_num is None and right_num is None:
        return str(left).strip().casefold() == str(right).strip().casefold()
    return False
