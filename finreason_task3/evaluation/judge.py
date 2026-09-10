"""Judge backends.

A judge maps ``(gold_text, pred_text)`` to a raw response string.  Label parsing
and retry accounting live in :mod:`evaluation.evaluator`, so a backend only has
to make one call and hand back whatever the provider said.
"""

from __future__ import annotations

import abc
import logging
import random
import time
from typing import Callable, List, Optional

from .config import EvaluationConfig, require_api_key
from .parser import parse_label
from .prompt import render_prompt

__all__ = ["Judge", "JudgeError", "OpenAIJudge", "MockJudge", "build_judge", "register_judge"]

logger = logging.getLogger(__name__)


class JudgeError(RuntimeError):
    """Raised when a judge call fails after exhausting retries."""


class Judge(abc.ABC):
    """Base class for judge backends."""

    #: Recorded in evaluation metadata and in the cache key.
    provider: str = "unknown"

    def __init__(self, config: EvaluationConfig) -> None:
        self.config = config

    @property
    def model(self) -> str:
        return self.config.judge.model

    def build_prompt(self, gold_text: str, pred_text: str) -> str:
        return render_prompt(gold_text, pred_text, version=self.config.prompt_version)

    @abc.abstractmethod
    def _call(self, prompt: str) -> str:
        """Make one provider call and return the raw response text."""

    def judge(self, gold_text: str, pred_text: str) -> "JudgeOutcome":
        """Call the judge with retries; retry on transport errors *and* on an
        unparseable label, matching the spec's retry requirements."""
        prompt = self.build_prompt(gold_text, pred_text)
        attempts = 0
        last_raw: Optional[str] = None
        last_error: Optional[str] = None

        for attempt in range(self.config.max_retries + 1):
            attempts = attempt + 1
            try:
                raw = self._call(prompt)
            except Exception as exc:  # noqa: BLE001 - provider SDKs raise many types
                last_error = f"{type(exc).__name__}: {exc}"
                last_raw = None
                logger.warning("Judge call failed (attempt %d): %s", attempts, last_error)
            else:
                last_raw = raw
                label = parse_label(raw)
                if label is not None:
                    return JudgeOutcome(label=label, raw=raw, attempts=attempts, error=None)
                last_error = f"invalid judge output: {str(raw)[:200]!r}"
                logger.warning("Judge returned an unparseable label (attempt %d)", attempts)

            if attempt < self.config.max_retries:
                self._sleep(attempt)

        return JudgeOutcome(label=None, raw=last_raw, attempts=attempts, error=last_error)

    def _sleep(self, attempt: int) -> None:
        """Exponential backoff with jitter; bounded by construction."""
        delay = self.config.retry_base_delay * (2**attempt)
        time.sleep(min(delay, 60.0) * (0.5 + random.random() / 2))


class JudgeOutcome:
    """Result of one judged case."""

    __slots__ = ("label", "raw", "attempts", "error")

    def __init__(self, label: Optional[str], raw: Optional[str], attempts: int, error: Optional[str]):
        self.label = label
        self.raw = raw
        self.attempts = attempts
        self.error = error


class OpenAIJudge(Judge):
    """The reference judge: OpenAI Responses API, as used by the notebook."""

    provider = "openai"

    def __init__(self, config: EvaluationConfig) -> None:
        super().__init__(config)
        try:
            from openai import OpenAI
        except ImportError as exc:  # pragma: no cover
            raise JudgeError(
                "The 'openai' package is required for the official judge. "
                "Install it with: pip install 'openai>=1.40'"
            ) from exc
        kwargs = {"api_key": require_api_key(), "timeout": config.judge.timeout}
        if config.judge.base_url:
            kwargs["base_url"] = config.judge.base_url
        self._client = OpenAI(**kwargs)

    def _call(self, prompt: str) -> str:
        judge_cfg = self.config.judge
        response = self._client.responses.create(
            model=judge_cfg.model,
            input=prompt,
            reasoning={"effort": judge_cfg.reasoning_effort},
            text={"verbosity": judge_cfg.verbosity},
            **judge_cfg.extra,
        )
        return response.output_text


class MockJudge(Judge):
    """Deterministic offline judge for tests, CI and dry runs.

    ``responses`` is either a callable ``(gold_text, pred_text) -> str`` or a list
    of canned responses consumed in order.
    """

    provider = "mock"

    def __init__(
        self,
        config: EvaluationConfig,
        responses: Callable[[str, str], str] | List[str] | None = None,
    ) -> None:
        super().__init__(config)
        self._responses = responses
        self._index = 0
        self.calls: List[str] = []
        self._gold_pred: List[tuple] = []

    def judge(self, gold_text: str, pred_text: str) -> JudgeOutcome:
        self._gold_pred.append((gold_text, pred_text))
        return super().judge(gold_text, pred_text)

    def _call(self, prompt: str) -> str:
        self.calls.append(prompt)
        gold_text, pred_text = self._gold_pred[-1]
        if callable(self._responses):
            return self._responses(gold_text, pred_text)
        if isinstance(self._responses, list):
            if self._index >= len(self._responses):
                raise JudgeError("MockJudge ran out of canned responses")
            value = self._responses[self._index]
            self._index += 1
            return value
        from .deterministic import deterministic_label

        return deterministic_label(gold_text, pred_text)

    def _sleep(self, attempt: int) -> None:  # no delays in tests
        return


class DeterministicJudge(Judge):
    """Rule-based A/S/E/C classifier used by the deterministic-evaluator study.

    Not the official judge: see DETERMINISTIC_EVALUATION_ANALYSIS.md.
    """

    provider = "deterministic"

    @property
    def model(self) -> str:
        return "rule-based-v1"

    def _call(self, prompt: str) -> str:  # pragma: no cover - unused
        raise JudgeError("DeterministicJudge does not use prompts")

    def judge(self, gold_text: str, pred_text: str) -> JudgeOutcome:
        from .deterministic import deterministic_label

        label = deterministic_label(gold_text, pred_text)
        return JudgeOutcome(label=label, raw=label, attempts=1, error=None)


_REGISTRY = {
    "openai": OpenAIJudge,
    "mock": MockJudge,
    "deterministic": DeterministicJudge,
}


def register_judge(name: str, factory) -> None:
    """Register a custom judge backend under ``name``."""
    _REGISTRY[name] = factory


def build_judge(config: EvaluationConfig) -> Judge:
    provider = config.judge.provider
    if provider not in _REGISTRY:
        raise JudgeError(
            f"Unknown judge provider {provider!r}. Known: {', '.join(sorted(_REGISTRY))}"
        )
    return _REGISTRY[provider](config)
