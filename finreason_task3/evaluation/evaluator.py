"""Evaluation orchestration: cache, concurrency, resume, audit records."""

from __future__ import annotations

import datetime as _dt
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Sequence

from task3_core.io import sha256_file, write_jsonl
from task3_core.schema import DevelopmentExample, EvaluationResult, ParticipantPrediction

from .cache import JudgeCache, NullCache, make_cache_key
from .config import EvaluationConfig
from .judge import Judge, build_judge
from .metrics import MetricSummary, compute_metrics
from .prompt import prompt_sha256

__all__ = ["EvaluationRun", "evaluate"]

logger = logging.getLogger(__name__)


class IncompleteSubmissionError(RuntimeError):
    """Raised when predictions are missing and the policy forbids scoring."""


@dataclass
class EvaluationRun:
    """Everything one evaluation produced."""

    summary: MetricSummary
    case_results: List[EvaluationResult]
    metadata: Dict[str, object] = field(default_factory=dict)

    def write(self, output_dir: Path | str, submission_name: str = "submission") -> Path:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        write_jsonl(output_dir / "case_results.jsonl", (r.to_dict() for r in self.case_results))
        (output_dir / "evaluation_summary.json").write_text(
            json.dumps(self.summary.to_dict(), indent=2) + "\n", encoding="utf-8"
        )
        (output_dir / "evaluation_metadata.json").write_text(
            json.dumps(self.metadata, indent=2, default=str) + "\n", encoding="utf-8"
        )
        (output_dir / "evaluation_report.txt").write_text(
            self.summary.render(submission_name) + "\n", encoding="utf-8"
        )
        return output_dir


def _progress(iterable, total: int, desc: str, enabled: bool):
    if not enabled:
        return iterable
    try:
        from tqdm.auto import tqdm
    except ImportError:  # pragma: no cover
        return iterable
    return tqdm(iterable, total=total, desc=desc)


def evaluate(
    gold: Dict[str, DevelopmentExample],
    predictions: Dict[str, ParticipantPrediction],
    config: EvaluationConfig,
    *,
    judge: Optional[Judge] = None,
    case_ids: Optional[Sequence[str]] = None,
    submission_name: str = "submission",
    predictions_path: Optional[Path | str] = None,
    gold_path: Optional[Path | str] = None,
    cache_dir: Optional[Path] = None,
    show_progress: bool = True,
) -> EvaluationRun:
    """Score ``predictions`` against ``gold`` under ``config``.

    Alignment is by case ID only - never by row position.  Cases with no
    prediction are handled per ``config.missing_prediction_policy``.
    """
    ids = [str(i) for i in (case_ids if case_ids is not None else gold.keys())]
    unknown = [i for i in ids if i not in gold]
    if unknown:
        raise KeyError(f"case_ids not present in gold: {unknown[:10]}")

    missing = [i for i in ids if i not in predictions]
    policy = config.missing_prediction_policy
    if missing and policy == "invalid_submission":
        raise IncompleteSubmissionError(
            f"{len(missing)} of {len(ids)} case(s) have no prediction, and "
            "missing_prediction_policy is 'invalid_submission'. "
            f"First missing ids: {', '.join(missing[:10])}. "
            "Run scripts/validate_submission.py to see the full list."
        )
    if missing and policy == "skip":
        logger.warning("Skipping %d case(s) with no prediction (policy='skip')", len(missing))
        ids = [i for i in ids if i in predictions]

    judge = judge or build_judge(config)
    cache = (
        JudgeCache(config.resolved_cache_path(cache_dir))
        if config.cache
        else NullCache()
    )

    started = _dt.datetime.now(_dt.timezone.utc)
    try:
        results_by_id = _run_cases(ids, gold, predictions, config, judge, cache, show_progress)
    finally:
        cache.close()
    finished = _dt.datetime.now(_dt.timezone.utc)

    # Missing cases under the 'structural_error' policy are labelled S without a
    # judge call, and are recorded so the audit trail shows why.
    ordered: List[EvaluationResult] = []
    for case_id in ids:
        if case_id in results_by_id:
            ordered.append(results_by_id[case_id])
            continue
        ordered.append(
            EvaluationResult(
                id=case_id,
                gold=gold[case_id].answer.to_dict(),
                prediction=None,
                label="S",
                judge_model=judge.model,
                prompt_version=config.prompt_version,
                raw_judge_output=None,
                from_cache=False,
                error="missing prediction (policy=structural_error)",
            )
        )

    summary = compute_metrics(
        [r.label for r in ordered],
        total_cases=len(ids),
        dqc_ids=[gold[r.id].dqc_id for r in ordered],
    )

    metadata: Dict[str, object] = {
        "evaluation_version": config.evaluation_version,
        "judge_provider": judge.provider,
        "judge_model": judge.model,
        "prompt_version": config.prompt_version,
        "prompt_sha256": prompt_sha256(config.prompt_version),
        "dataset_version": config.dataset_version,
        "submission": submission_name,
        "missing_prediction_policy": policy,
        "num_cases": len(ids),
        "num_missing_predictions": len(missing),
        "missing_prediction_ids": missing,
        "cache_enabled": bool(config.cache),
        "cache_hits": getattr(cache, "hits", 0),
        "cache_misses": getattr(cache, "misses", 0),
        "workers": config.workers,
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "duration_seconds": round((finished - started).total_seconds(), 2),
        "config": config.to_dict(),
    }
    if predictions_path:
        metadata["predictions_path"] = str(predictions_path)
        metadata["predictions_sha256"] = sha256_file(predictions_path)
    if gold_path:
        metadata["gold_path"] = str(gold_path)
        metadata["gold_sha256"] = sha256_file(gold_path)

    return EvaluationRun(summary=summary, case_results=ordered, metadata=metadata)


def _run_cases(
    ids: Sequence[str],
    gold: Dict[str, DevelopmentExample],
    predictions: Dict[str, ParticipantPrediction],
    config: EvaluationConfig,
    judge: Judge,
    cache,
    show_progress: bool,
) -> Dict[str, EvaluationResult]:
    def run_one(case_id: str) -> EvaluationResult:
        example = gold[case_id]
        prediction = predictions[case_id]
        gold_text = example.answer.to_judge_text()
        # judge_text() decides this: native submissions are judged on their two
        # declared fields, lm-eval records on the raw model text. An optional
        # `raw_output` on a native submission never changes the score.
        pred_text = prediction.judge_text()

        key = make_cache_key(
            case_id,
            gold_text,
            pred_text,
            judge.provider,
            judge.model,
            config.prompt_version,
            config.evaluation_version,
        )
        cached = cache.get(key)
        if cached is not None:
            return EvaluationResult(
                id=case_id,
                gold=example.answer.to_dict(),
                prediction=prediction.to_dict(),
                label=cached.label,
                judge_model=judge.model,
                prompt_version=config.prompt_version,
                raw_judge_output=cached.raw_output,
                from_cache=True,
                error=cached.error,
                attempts=cached.attempts,
            )

        outcome = judge.judge(gold_text, pred_text)
        cache.put(
            key,
            case_id,
            outcome.label,
            outcome.raw,
            outcome.attempts,
            outcome.error,
            judge.provider,
            judge.model,
            config.prompt_version,
            config.evaluation_version,
        )
        if outcome.label is None:
            logger.error("Case %s: no valid label after %d attempt(s): %s",
                         case_id, outcome.attempts, outcome.error)
        return EvaluationResult(
            id=case_id,
            gold=example.answer.to_dict(),
            prediction=prediction.to_dict(),
            label=outcome.label,
            judge_model=judge.model,
            prompt_version=config.prompt_version,
            raw_judge_output=outcome.raw,
            from_cache=False,
            error=outcome.error,
            attempts=outcome.attempts,
        )

    todo = [cid for cid in ids if cid in predictions]
    results: Dict[str, EvaluationResult] = {}

    if config.workers == 1:
        for case_id in _progress(todo, len(todo), "Evaluating", show_progress):
            results[case_id] = run_one(case_id)
        return results

    with ThreadPoolExecutor(max_workers=config.workers) as pool:
        # map() preserves input order, so the case<->result mapping stays intact.
        for case_id, result in _progress(
            zip(todo, pool.map(run_one, todo)), len(todo), "Evaluating", show_progress
        ):
            results[case_id] = result
    return results
