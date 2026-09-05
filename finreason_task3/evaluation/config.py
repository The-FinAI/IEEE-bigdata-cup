"""Evaluation configuration loading and freezing."""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

__all__ = ["JudgeConfig", "EvaluationConfig", "MISSING_PREDICTION_POLICIES"]

#: How the evaluator treats a case that has no prediction.
#:
#: ``invalid_submission`` - refuse to score at all (official default for the
#: final leaderboard; incomplete submissions are rejected during validation).
#: ``structural_error`` - score the missing case as ``S``.
#: ``skip`` - drop the case from the denominators (development convenience only;
#: NEVER use for official scoring - it makes partial submissions look better).
MISSING_PREDICTION_POLICIES = ("invalid_submission", "structural_error", "skip")


@dataclass
class JudgeConfig:
    provider: str = "openai"
    model: str = "gpt-5-mini"
    reasoning_effort: str = "minimal"
    verbosity: str = "low"
    base_url: Optional[str] = None
    timeout: float = 120.0
    #: Extra keyword arguments forwarded verbatim to the provider SDK call.
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, obj: Dict[str, Any]) -> "JudgeConfig":
        known = {f for f in cls.__dataclass_fields__ if f != "extra"}
        extra = {k: v for k, v in obj.items() if k not in known and k != "extra"}
        extra.update(obj.get("extra") or {})
        return cls(**{k: v for k, v in obj.items() if k in known}, extra=extra)


@dataclass
class EvaluationConfig:
    """Everything that determines an evaluation result, in one frozen object."""

    evaluation_version: str = "1.0"
    prompt_version: str = "finmr-judge-v1"
    judge: JudgeConfig = field(default_factory=JudgeConfig)
    max_retries: int = 3
    retry_base_delay: float = 2.0
    workers: int = 5
    cache: bool = True
    cache_path: str = ".cache/evaluation_cache.sqlite"
    missing_prediction_policy: str = "invalid_submission"
    dataset_version: str = "unspecified"

    def __post_init__(self) -> None:
        if self.missing_prediction_policy not in MISSING_PREDICTION_POLICIES:
            raise ValueError(
                f"missing_prediction_policy must be one of {MISSING_PREDICTION_POLICIES}, "
                f"got {self.missing_prediction_policy!r}"
            )
        if self.workers < 1:
            raise ValueError("workers must be >= 1")
        if self.max_retries < 0:
            raise ValueError("max_retries must be >= 0")

    @classmethod
    def from_dict(cls, obj: Dict[str, Any]) -> "EvaluationConfig":
        obj = dict(obj or {})
        judge = JudgeConfig.from_dict(obj.pop("judge", {}) or {})
        known = set(cls.__dataclass_fields__)
        unknown = set(obj) - known
        if unknown:
            raise ValueError(f"Unknown configuration key(s): {', '.join(sorted(unknown))}")
        return cls(judge=judge, **obj)

    @classmethod
    def from_yaml(cls, path: Path | str) -> "EvaluationConfig":
        import yaml  # imported lazily so the package works without PyYAML installed

        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"Evaluation config not found: {path}")
        with path.open("r", encoding="utf-8") as handle:
            return cls.from_dict(yaml.safe_load(handle) or {})

    @classmethod
    def load(cls, path: Optional[Path | str] = None) -> "EvaluationConfig":
        """Load ``path`` if given, otherwise return documented defaults."""
        return cls.from_yaml(path) if path else cls()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def resolved_cache_path(self, base_dir: Optional[Path] = None) -> Path:
        path = Path(self.cache_path).expanduser()
        if not path.is_absolute() and base_dir is not None:
            path = Path(base_dir) / path
        return path


def require_api_key(env_var: str = "OPENAI_API_KEY") -> str:
    """Read an API key from the environment, failing with actionable guidance."""
    key = os.environ.get(env_var, "").strip()
    if not key:
        raise RuntimeError(
            f"Environment variable {env_var} is not set. "
            f"Copy .env.example to .env and fill it in, or run: export {env_var}=sk-...\n"
            "Never hard-code API keys or commit them."
        )
    return key
