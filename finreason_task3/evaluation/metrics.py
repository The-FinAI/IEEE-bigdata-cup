"""Aggregate metrics.

Denominator definitions are inherited verbatim from the reference notebook and
must not be changed silently:

* ``Parsing success rate`` = cases that received a valid A/S/E/C label divided by
  cases **evaluated**.
* ``ACC`` / ``SER`` / ``EER`` / ``CER`` = label count divided by the number of
  cases that received a **valid label** (not by the total).

The only deliberate change from the notebook is that "cases evaluated" is defined
by the reference ID set instead of ``min(len(gold), len(pred))``; see
EVALUATION.md, "Length-mismatch behaviour".
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional

from .parser import LABEL_NAMES

__all__ = ["MetricSummary", "compute_metrics"]


def _pct(numerator: int, denominator: int) -> float:
    return round(100.0 * numerator / denominator, 2) if denominator > 0 else 0.0


@dataclass
class MetricSummary:
    total_cases: int = 0
    evaluated_cases: int = 0
    valid_label_cases: int = 0
    invalid_judge_outputs: int = 0
    label_counts: Dict[str, int] = field(default_factory=dict)
    parsing_success_rate: float = 0.0
    acc: float = 0.0
    structural_error_rate: float = 0.0
    extraction_error_rate: float = 0.0
    calculation_error_rate: float = 0.0
    per_dqc: Dict[str, Dict[str, float]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return {
            "total_cases": self.total_cases,
            "evaluated_cases": self.evaluated_cases,
            "valid_label_cases": self.valid_label_cases,
            "invalid_judge_outputs": self.invalid_judge_outputs,
            "label_counts": self.label_counts,
            "parsing_success_rate": self.parsing_success_rate,
            "ACC": self.acc,
            "structural_error_rate": self.structural_error_rate,
            "extraction_error_rate": self.extraction_error_rate,
            "calculation_error_rate": self.calculation_error_rate,
            "per_dqc": self.per_dqc,
        }

    def render(self, submission_name: str = "submission") -> str:
        lines = [
            "FinReason Cup 2026 - Task 3 Evaluation",
            "=" * 38,
            "",
            f"Submission: {submission_name}",
            "",
            f"Total cases:             {self.total_cases}",
            f"Successfully evaluated:  {self.valid_label_cases}",
            "",
            f"Parsing Success Rate:   {self.parsing_success_rate:6.2f}%",
            f"ACC:                    {self.acc:6.2f}%",
            f"Structural Error Rate:  {self.structural_error_rate:6.2f}%",
            f"Extraction Error Rate:  {self.extraction_error_rate:6.2f}%",
            f"Calculation Error Rate: {self.calculation_error_rate:6.2f}%",
        ]
        if self.invalid_judge_outputs:
            lines += ["", f"Invalid judge outputs:  {self.invalid_judge_outputs} (excluded from"
                          " ACC/SER/EER/CER denominators)"]
        if self.per_dqc:
            lines += ["", "Per DQC rule:", ""]
            width = max(len(k) for k in self.per_dqc)
            lines.append(f"  {'rule'.ljust(width)}    n     ACC     SER     EER     CER")
            for rule in sorted(self.per_dqc):
                row = self.per_dqc[rule]
                lines.append(
                    f"  {rule.ljust(width)} {int(row['n']):4d} "
                    f"{row['ACC']:6.2f}% {row['SER']:6.2f}% "
                    f"{row['EER']:6.2f}% {row['CER']:6.2f}%"
                )
        return "\n".join(lines)


def compute_metrics(
    labels: Iterable[Optional[str]],
    *,
    total_cases: Optional[int] = None,
    dqc_ids: Optional[List[Optional[str]]] = None,
) -> MetricSummary:
    """Aggregate a sequence of per-case labels (``None`` = invalid judge output)."""
    labels = list(labels)
    evaluated = len(labels)
    valid = [label for label in labels if label is not None]
    counts = Counter(valid)

    summary = MetricSummary(
        total_cases=total_cases if total_cases is not None else evaluated,
        evaluated_cases=evaluated,
        valid_label_cases=len(valid),
        invalid_judge_outputs=evaluated - len(valid),
        label_counts={key: counts.get(key, 0) for key in LABEL_NAMES},
        parsing_success_rate=_pct(len(valid), evaluated),
        acc=_pct(counts.get("A", 0), len(valid)),
        structural_error_rate=_pct(counts.get("S", 0), len(valid)),
        extraction_error_rate=_pct(counts.get("E", 0), len(valid)),
        calculation_error_rate=_pct(counts.get("C", 0), len(valid)),
    )

    if dqc_ids is not None:
        if len(dqc_ids) != len(labels):
            raise ValueError("dqc_ids must be the same length as labels")
        grouped: Dict[str, List[Optional[str]]] = {}
        for rule, label in zip(dqc_ids, labels):
            grouped.setdefault(rule or "UNKNOWN", []).append(label)
        for rule, rule_labels in grouped.items():
            rule_valid = [x for x in rule_labels if x is not None]
            rule_counts = Counter(rule_valid)
            summary.per_dqc[rule] = {
                "n": float(len(rule_labels)),
                "ACC": _pct(rule_counts.get("A", 0), len(rule_valid)),
                "SER": _pct(rule_counts.get("S", 0), len(rule_valid)),
                "EER": _pct(rule_counts.get("E", 0), len(rule_valid)),
                "CER": _pct(rule_counts.get("C", 0), len(rule_valid)),
            }
    return summary
