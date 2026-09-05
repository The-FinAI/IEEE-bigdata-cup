"""Reference-compatible FinMR evaluation package for FinReason Cup 2026 Task 3."""

from .config import EvaluationConfig, JudgeConfig
from .evaluator import EvaluationRun, IncompleteSubmissionError, evaluate
from .judge import Judge, JudgeError, MockJudge, build_judge
from .metrics import MetricSummary, compute_metrics
from .parser import LABEL_NAMES, VALID_LABELS, normalize_number, numbers_equal, parse_label
from .prompt import load_prompt, prompt_sha256, render_prompt

__all__ = [
    "EvaluationConfig",
    "EvaluationRun",
    "IncompleteSubmissionError",
    "Judge",
    "JudgeConfig",
    "JudgeError",
    "LABEL_NAMES",
    "MetricSummary",
    "MockJudge",
    "VALID_LABELS",
    "build_judge",
    "compute_metrics",
    "evaluate",
    "load_prompt",
    "normalize_number",
    "numbers_equal",
    "parse_label",
    "prompt_sha256",
    "render_prompt",
]
