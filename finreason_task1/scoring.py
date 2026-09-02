"""Exact Task 1 case scoring and hierarchical aggregation."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_EVEN, ROUND_HALF_UP, localcontext
from fractions import Fraction
from typing import Any, Iterable, Mapping, Sequence

from .contracts import (
    REPORT_SCHEMA_VERSION,
    ContractError,
    validate_gold_row,
    validate_manifest_row,
    validate_question,
    validate_submission,
)


SCORER_VERSION = "finreason.task1.scorer/2.0.0"
RANKING_QUANTUM = Decimal("0.000001")
SEEN_DIFFICULTY_WEIGHTS = {
    "basic": Fraction(2, 5),
    "intermediate": Fraction(2, 5),
    "advanced": Fraction(1, 5),
}
HIDDEN_DIFFICULTY_WEIGHTS = {
    "intermediate": Fraction(1, 2),
    "advanced": Fraction(1, 2),
}
OFFICIAL_SPLIT_COUNTS = {
    "test_private_seen": 580,
    "test_private_hidden": 348,
}
TASK1_V4_DATASET_VERSION = "task1-v4"
TASK1_V4_PRIVATE_SCORE_COUNTS = {
    "cases": 928,
    "checkpoint_cases": 864,
    "checkpoint_templates": 374,
    "total_slots": 1492,
}


@dataclass(frozen=True)
class CaseScore:
    case_id: str
    fac: int
    matched_slots: int
    total_slots: int
    trace_accuracy: Fraction | None


@dataclass(frozen=True)
class AggregateScore:
    fac: Fraction
    checkpoint: Fraction | None
    case_count: int
    checkpoint_case_count: int
    checkpoint_template_count: int


@dataclass(frozen=True)
class ScoreReport:
    schema_version: str
    scorer_version: str
    dataset_version: str
    combined_fac: Fraction | None
    seen_fac: Fraction | None
    hidden_fac: Fraction | None
    combined_checkpoint: Fraction | None
    seen_checkpoint: Fraction | None
    hidden_checkpoint: Fraction | None
    micro_fac: Fraction
    micro_checkpoint: Fraction | None
    ranking_tuple: tuple[str, str, str] | None
    case_count: int
    checkpoint_case_count: int
    checkpoint_template_count: int
    matched_final_answers: int
    matched_slots: int
    total_slots: int

    def as_dict(self) -> dict[str, Any]:
        def optional(value: Fraction | None) -> str | None:
            return None if value is None else render_fraction(value)

        return {
            "schema_version": self.schema_version,
            "scorer_version": self.scorer_version,
            "dataset_version": self.dataset_version,
            "scores": {
                "combined_fac": optional(self.combined_fac),
                "seen_fac": optional(self.seen_fac),
                "hidden_fac": optional(self.hidden_fac),
                "combined_checkpoint": optional(self.combined_checkpoint),
                "seen_checkpoint": optional(self.seen_checkpoint),
                "hidden_checkpoint": optional(self.hidden_checkpoint),
            },
            "diagnostics": {
                "micro_fac": optional(self.micro_fac),
                "micro_checkpoint": optional(self.micro_checkpoint),
            },
            "ranking_tuple": list(self.ranking_tuple) if self.ranking_tuple else None,
            "counts": {
                "cases": self.case_count,
                "checkpoint_cases": self.checkpoint_case_count,
                "checkpoint_templates": self.checkpoint_template_count,
                "matched_final_answers": self.matched_final_answers,
                "matched_slots": self.matched_slots,
                "total_slots": self.total_slots,
            },
        }


def render_fraction(value: Fraction, *, places: int = 16) -> str:
    """Serialize an exact score without emitting binary floating point."""

    with localcontext() as context:
        context.prec = max(64, places + 32)
        decimal_value = Decimal(value.numerator) / Decimal(value.denominator)
        quantum = Decimal(1).scaleb(-places)
        rendered = format(decimal_value.quantize(quantum, rounding=ROUND_HALF_EVEN), "f")
    rendered = rendered.rstrip("0").rstrip(".")
    return rendered if rendered and rendered != "-0" else "0"


def ranking_value(value: Fraction) -> str:
    with localcontext() as context:
        context.prec = 64
        decimal_value = Decimal(value.numerator) / Decimal(value.denominator)
        return format(decimal_value.quantize(RANKING_QUANTUM, rounding=ROUND_HALF_EVEN), "f")


def _canonical_decimal(text: str, spec: Mapping[str, Any]) -> Decimal:
    value = Decimal(text)
    rounding = spec["rounding"]
    if rounding["mode"] == "half_up":
        quantum = Decimal(1).scaleb(-rounding["decimal_places"])
        with localcontext() as context:
            context.prec = 256
            value = value.quantize(quantum, rounding=ROUND_HALF_UP)
    if value.is_zero():
        value = abs(value)
    return value


def _canonical_exact_number(text: str) -> Fraction:
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        return Fraction(int(numerator), int(denominator))
    return Fraction(Decimal(text))


def value_matches(
    submitted_value: str,
    gold_value: str,
    spec: Mapping[str, Any],
) -> bool:
    if spec["type"] == "enum":
        return submitted_value == gold_value
    if spec["type"] == "decimal":
        if spec["rounding"]["mode"] == "exact":
            return _canonical_exact_number(submitted_value) == _canonical_exact_number(
                gold_value
            )
        return _canonical_decimal(submitted_value, spec) == _canonical_decimal(
            gold_value, spec
        )
    raise ContractError(f"unsupported result type {spec.get('type')!r}")


def _gold_values(gold: Mapping[str, Any], question: Mapping[str, Any]) -> tuple[str, dict[str, str]]:
    validate_gold_row(gold, question)
    final_value = gold["final_value"]
    slot_values = gold["slot_values"]
    expected_slot_ids = [slot["slot_id"] for slot in question["trace_spec"]["slots"]]
    return final_value, {slot_id: slot_values[slot_id] for slot_id in expected_slot_ids}


def score_case(
    question: Mapping[str, Any],
    gold: Mapping[str, Any],
    prediction: Mapping[str, Any],
) -> CaseScore:
    validate_question(question)
    validation = validate_submission(
        [prediction], {question["case_id"]: question}, require_complete=True
    )
    if not validation.valid:
        messages = "; ".join(issue.message for issue in validation.issues)
        raise ContractError(f"prediction is invalid: {messages}")
    final_gold, slot_gold = _gold_values(gold, question)
    final_answer = prediction["final_answer"]
    fac = int(
        final_answer is not None
        and value_matches(
            final_answer["value"], final_gold, question["answer_spec"]
        )
    )
    step_by_id = {step["slot_id"]: step["value"] for step in prediction["steps"]}
    matched_slots = 0
    slots = question["trace_spec"]["slots"]
    for slot in slots:
        slot_id = slot["slot_id"]
        if slot_id in step_by_id and value_matches(
            step_by_id[slot_id], slot_gold[slot_id], slot["result_spec"]
        ):
            matched_slots += 1
    total_slots = len(slots)
    trace_accuracy = (
        None if total_slots == 0 else Fraction(matched_slots, total_slots)
    )
    return CaseScore(
        case_id=question["case_id"],
        fac=fac,
        matched_slots=matched_slots,
        total_slots=total_slots,
        trace_accuracy=trace_accuracy,
    )


def _mean(values: Sequence[Fraction], *, location: str) -> Fraction:
    if not values:
        raise ContractError(f"{location}: cannot average an empty cell")
    return sum(values, Fraction(0)) / len(values)


def _validate_manifest_template_identity(
    manifest_rows: Sequence[Mapping[str, Any]],
) -> None:
    """Require one global taxonomy identity for every template identifier."""

    identities: dict[str, tuple[str, str, str, str]] = {}
    for index, row in enumerate(manifest_rows, start=1):
        template_id = row.get("template_id")
        identity_values = (
            row.get("structure_stratum"),
            row.get("domain_id"),
            row.get("topic_id"),
            row.get("difficulty"),
        )
        if not isinstance(template_id, str) or not template_id:
            raise ContractError(f"manifest row {index} has invalid template_id")
        if any(not isinstance(value, str) or not value for value in identity_values):
            raise ContractError(
                f"manifest template {template_id} has invalid taxonomy identity"
            )
        identity = (
            str(identity_values[0]),
            str(identity_values[1]),
            str(identity_values[2]),
            str(identity_values[3]),
        )
        previous = identities.setdefault(template_id, identity)
        if previous != identity:
            raise ContractError(
                f"template {template_id} changes stratum or taxonomy identity"
            )


def _canonical_scoring_spec(question: Mapping[str, Any]) -> str:
    return json.dumps(
        {
            "answer_spec": question["answer_spec"],
            "trace_spec": question["trace_spec"],
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def _validate_template_scoring_specs(
    questions: Mapping[str, Mapping[str, Any]],
    manifest_by_id: Mapping[str, Mapping[str, Any]],
) -> None:
    """Reject answer or checkpoint contract drift within a template."""

    specifications: dict[str, str] = {}
    for case_id in sorted(questions):
        template_id = manifest_by_id[case_id]["template_id"]
        specification = _canonical_scoring_spec(questions[case_id])
        previous = specifications.setdefault(template_id, specification)
        if previous != specification:
            raise ContractError(
                f"template {template_id} changes answer_spec or trace_spec"
            )


def _aggregate_component(
    case_scores: Mapping[str, CaseScore],
    manifest_rows: Sequence[Mapping[str, Any]],
    *,
    stratum: str,
    component: str,
) -> Fraction | None:
    weights = (
        SEEN_DIFFICULTY_WEIGHTS if stratum == "seen" else HIDDEN_DIFFICULTY_WEIGHTS
    )
    by_template: dict[tuple[str, str, str, str], list[Fraction]] = {}
    for row in manifest_rows:
        if row.get("structure_stratum") != stratum:
            continue
        case_id = row["case_id"]
        if case_id not in case_scores:
            raise ContractError(f"manifest case {case_id} lacks a score")
        key = (
            row["domain_id"],
            row["topic_id"],
            row["difficulty"],
            row["template_id"],
        )
        if component == "fac":
            value: Fraction | None = Fraction(case_scores[case_id].fac)
        elif component == "checkpoint":
            value = case_scores[case_id].trace_accuracy
        else:
            raise ContractError(f"unsupported aggregate component {component!r}")
        if value is None:
            continue
        by_template.setdefault(key, []).append(value)
    if not by_template:
        if component == "checkpoint":
            return None
        raise ContractError(f"stratum {stratum} is empty")

    template_presence: dict[tuple[str, str, str, str], set[bool]] = {}
    for row in manifest_rows:
        if row.get("structure_stratum") != stratum:
            continue
        key = (
            row["domain_id"],
            row["topic_id"],
            row["difficulty"],
            row["template_id"],
        )
        template_presence.setdefault(key, set()).add(
            case_scores[row["case_id"]].trace_accuracy is not None
        )
    if component == "checkpoint":
        inconsistent = sorted(
            key for key, states in template_presence.items() if len(states) != 1
        )
        if inconsistent:
            raise ContractError(
                "checkpoint availability changes within template "
                f"{inconsistent[0]}"
            )

    by_cell: dict[tuple[str, str, str], list[Fraction]] = {}
    for (domain, topic, difficulty, _template), values in by_template.items():
        by_cell.setdefault((domain, topic, difficulty), []).append(
            _mean(values, location="template")
        )

    topic_keys = sorted(
        {
            (row["domain_id"], row["topic_id"])
            for row in manifest_rows
            if row.get("structure_stratum") == stratum
        }
    )
    topic_values: dict[tuple[str, str], Fraction] = {}
    for domain, topic in topic_keys:
        available = {
            difficulty
            for cell_domain, cell_topic, difficulty in by_cell
            if (cell_domain, cell_topic) == (domain, topic)
        }
        if component == "fac" and available != set(weights):
            raise ContractError(
                f"{stratum} topic {domain}/{topic} has difficulty cells "
                f"{sorted(available)}, expected {sorted(weights)}"
            )
        if component == "checkpoint" and not available:
            raise ContractError(
                f"{stratum} topic {domain}/{topic} has no eligible checkpoints"
            )
        applicable_weight = sum(
            (weights[difficulty] for difficulty in available), Fraction(0)
        )
        topic_values[(domain, topic)] = sum(
            weights[difficulty]
            * _mean(
                by_cell[(domain, topic, difficulty)],
                location=f"{domain}/{topic}/{difficulty}",
            )
            for difficulty in available
        ) / applicable_weight

    by_domain: dict[str, list[Fraction]] = {}
    for (domain, _topic), value in topic_values.items():
        by_domain.setdefault(domain, []).append(value)
    if len(by_domain) != 12:
        raise ContractError(
            f"stratum {stratum} must cover exactly 12 domains, found {len(by_domain)}"
        )
    return _mean(
        [_mean(values, location=f"domain {domain}") for domain, values in by_domain.items()],
        location=f"stratum {stratum}",
    )


def aggregate_scores(
    case_scores: Mapping[str, CaseScore],
    manifest_rows: Iterable[Mapping[str, Any]],
) -> tuple[AggregateScore | None, AggregateScore | None]:
    rows = list(manifest_rows)
    if len({row.get("case_id") for row in rows}) != len(rows):
        raise ContractError("manifest contains duplicate case_id membership")
    expected_ids = {row.get("case_id") for row in rows}
    if expected_ids != set(case_scores):
        raise ContractError("manifest and case-score identifiers differ")
    _validate_manifest_template_identity(rows)

    aggregates: dict[str, AggregateScore | None] = {"seen": None, "hidden": None}
    for stratum in ("seen", "hidden"):
        count = sum(row.get("structure_stratum") == stratum for row in rows)
        if not count:
            continue
        aggregates[stratum] = AggregateScore(
            fac=_aggregate_component(case_scores, rows, stratum=stratum, component="fac"),
            checkpoint=_aggregate_component(
                case_scores, rows, stratum=stratum, component="checkpoint"
            ),
            case_count=count,
            checkpoint_case_count=sum(
                row.get("structure_stratum") == stratum
                and case_scores[row["case_id"]].trace_accuracy is not None
                for row in rows
            ),
            checkpoint_template_count=len(
                {
                    (
                        row["domain_id"],
                        row["topic_id"],
                        row["difficulty"],
                        row["template_id"],
                    )
                    for row in rows
                    if row.get("structure_stratum") == stratum
                    and case_scores[row["case_id"]].trace_accuracy is not None
                }
            ),
        )
    return aggregates["seen"], aggregates["hidden"]


def validate_official_manifest(manifest_rows: Iterable[Mapping[str, Any]]) -> None:
    """Reject candidate-pool rows before official private scoring."""

    rows = list(manifest_rows)
    splits: list[str] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, Mapping):
            raise ContractError(f"official manifest row {index} must be an object")
        split = row.get("split")
        if not isinstance(split, str):
            raise ContractError(f"official manifest row {index} has invalid split")
        splits.append(split)
    counts = Counter(splits)
    if counts != Counter(OFFICIAL_SPLIT_COUNTS):
        raise ContractError(
            f"official manifest split counts are {dict(counts)}, "
            f"expected {OFFICIAL_SPLIT_COUNTS}"
        )
    if len(rows) != sum(OFFICIAL_SPLIT_COUNTS.values()):
        raise ContractError("official manifest must contain exactly 928 rows")


def validate_task1_v4_private_score_report(report: ScoreReport) -> None:
    """Freeze V4 counts and relational score invariants before publication."""

    if report.dataset_version != TASK1_V4_DATASET_VERSION:
        raise ContractError("private score receipt requires dataset_version task1-v4")
    if report.schema_version != REPORT_SCHEMA_VERSION:
        raise ContractError("private score receipt has the wrong report schema version")
    if report.scorer_version != SCORER_VERSION:
        raise ContractError("private score receipt has the wrong scorer version")
    actual = {
        "cases": report.case_count,
        "checkpoint_cases": report.checkpoint_case_count,
        "checkpoint_templates": report.checkpoint_template_count,
        "total_slots": report.total_slots,
    }
    if actual != TASK1_V4_PRIVATE_SCORE_COUNTS:
        raise ContractError(
            f"task1-v4 private score counts are {actual}, "
            f"expected {TASK1_V4_PRIVATE_SCORE_COUNTS}"
        )

    score_values = {
        "combined_fac": report.combined_fac,
        "seen_fac": report.seen_fac,
        "hidden_fac": report.hidden_fac,
        "combined_checkpoint": report.combined_checkpoint,
        "seen_checkpoint": report.seen_checkpoint,
        "hidden_checkpoint": report.hidden_checkpoint,
        "micro_fac": report.micro_fac,
        "micro_checkpoint": report.micro_checkpoint,
    }
    for name, value in score_values.items():
        if value is None:
            raise ContractError(f"private score receipt requires {name}")
        if value < 0 or value > 1:
            raise ContractError(f"private score receipt {name} is outside [0,1]")

    assert report.seen_fac is not None
    assert report.hidden_fac is not None
    assert report.combined_fac is not None
    assert report.seen_checkpoint is not None
    assert report.hidden_checkpoint is not None
    assert report.combined_checkpoint is not None
    assert report.micro_checkpoint is not None
    if report.combined_fac != (report.seen_fac + report.hidden_fac) / 2:
        raise ContractError("private combined FAC is not the exact 50/50 aggregate")
    if report.combined_checkpoint != (
        report.seen_checkpoint + report.hidden_checkpoint
    ) / 2:
        raise ContractError(
            "private combined checkpoint is not the exact 50/50 aggregate"
        )
    expected_ranking = (
        ranking_value(report.combined_fac),
        ranking_value(report.hidden_fac),
        ranking_value(report.combined_checkpoint),
    )
    if report.ranking_tuple != expected_ranking:
        raise ContractError("private ranking tuple is inconsistent with score values")

    if not 0 <= report.matched_final_answers <= report.case_count:
        raise ContractError("private matched final-answer count is invalid")
    if not 0 <= report.matched_slots <= report.total_slots:
        raise ContractError("private matched checkpoint count is invalid")
    if report.micro_fac != Fraction(
        report.matched_final_answers, report.case_count
    ):
        raise ContractError("private micro FAC is inconsistent with counts")
    if report.micro_checkpoint != Fraction(report.matched_slots, report.total_slots):
        raise ContractError("private micro checkpoint is inconsistent with counts")


def score_submission(
    questions: Mapping[str, Mapping[str, Any]],
    gold_rows: Mapping[str, Mapping[str, Any]],
    predictions: Iterable[Mapping[str, Any]],
    manifest_rows: Iterable[Mapping[str, Any]],
) -> ScoreReport:
    if not questions:
        raise ContractError("question bundle is empty")
    manifest = list(manifest_rows)
    validation = validate_submission(predictions, questions, require_complete=True)
    if not validation.valid:
        messages = "; ".join(issue.message for issue in validation.issues)
        raise ContractError(f"submission rejected before scoring: {messages}")
    if set(gold_rows) != set(questions):
        raise ContractError("gold and question identifiers differ")
    if len(manifest) != len(questions):
        raise ContractError("manifest and question row counts differ")
    manifest_by_id: dict[str, Mapping[str, Any]] = {}
    for row in manifest:
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or case_id not in questions:
            raise ContractError("manifest contains an unknown or invalid case_id")
        if case_id in manifest_by_id:
            raise ContractError("manifest contains duplicate case_id membership")
        validate_manifest_row(row, questions[case_id])
        manifest_by_id[case_id] = row
    if set(manifest_by_id) != set(questions):
        raise ContractError("manifest and question identifiers differ")
    _validate_manifest_template_identity(manifest)
    _validate_template_scoring_specs(questions, manifest_by_id)
    case_scores: dict[str, CaseScore] = {}
    for prediction in validation.records:
        case_id = prediction["case_id"]
        case_scores[case_id] = score_case(
            questions[case_id], gold_rows[case_id], prediction
        )
    seen, hidden = aggregate_scores(case_scores, manifest)
    combined_fac: Fraction | None = None
    combined_checkpoint: Fraction | None = None
    ranking_tuple: tuple[str, str, str] | None = None
    if seen is not None and hidden is not None:
        combined_fac = (seen.fac + hidden.fac) / 2
        if seen.checkpoint is not None and hidden.checkpoint is not None:
            combined_checkpoint = (seen.checkpoint + hidden.checkpoint) / 2
            ranking_tuple = (
                ranking_value(combined_fac),
                ranking_value(hidden.fac),
                ranking_value(combined_checkpoint),
            )
    dataset_versions = {question["dataset_version"] for question in questions.values()}
    if len(dataset_versions) != 1:
        raise ContractError("question bundle contains multiple dataset versions")
    return ScoreReport(
        schema_version=REPORT_SCHEMA_VERSION,
        scorer_version=SCORER_VERSION,
        dataset_version=next(iter(dataset_versions)),
        combined_fac=combined_fac,
        seen_fac=None if seen is None else seen.fac,
        hidden_fac=None if hidden is None else hidden.fac,
        combined_checkpoint=combined_checkpoint,
        seen_checkpoint=None if seen is None else seen.checkpoint,
        hidden_checkpoint=None if hidden is None else hidden.checkpoint,
        micro_fac=Fraction(
            sum(score.fac for score in case_scores.values()), len(case_scores)
        ),
        micro_checkpoint=(
            None
            if not sum(score.total_slots for score in case_scores.values())
            else Fraction(
                sum(score.matched_slots for score in case_scores.values()),
                sum(score.total_slots for score in case_scores.values()),
            )
        ),
        ranking_tuple=ranking_tuple,
        case_count=len(case_scores),
        checkpoint_case_count=sum(
            score.trace_accuracy is not None for score in case_scores.values()
        ),
        checkpoint_template_count=len(
            {
                manifest_by_id[case_id]["template_id"]
                for case_id, score in case_scores.items()
                if score.trace_accuracy is not None
            }
        ),
        matched_final_answers=sum(score.fac for score in case_scores.values()),
        matched_slots=sum(score.matched_slots for score in case_scores.values()),
        total_slots=sum(score.total_slots for score in case_scores.values()),
    )
