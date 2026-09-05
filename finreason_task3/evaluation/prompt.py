"""Versioned judge prompts.

The official prompt is stored as a plain text file under ``prompts/`` and is
loaded by version name.  It must never be edited in place during a competition
phase: publish a new version instead (see EVALUATION.md, "Prompt versioning").
"""

from __future__ import annotations

import hashlib
from functools import lru_cache
from pathlib import Path
from typing import Dict

__all__ = ["PROMPTS_DIR", "available_versions", "load_prompt", "prompt_sha256", "render_prompt"]

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

#: The prompt used by the reference notebook, verbatim.
DEFAULT_PROMPT_VERSION = "finmr-judge-v1"


def _version_to_path(version: str) -> Path:
    return PROMPTS_DIR / f"{version.replace('-', '_')}.txt"


def available_versions() -> Dict[str, Path]:
    if not PROMPTS_DIR.is_dir():
        return {}
    return {p.stem.replace("_", "-"): p for p in sorted(PROMPTS_DIR.glob("*.txt"))}


@lru_cache(maxsize=8)
def load_prompt(version: str = DEFAULT_PROMPT_VERSION) -> str:
    """Return the raw template text for ``version``."""
    path = _version_to_path(version)
    if not path.is_file():
        known = ", ".join(available_versions()) or "<none>"
        raise FileNotFoundError(
            f"Unknown prompt version {version!r} (looked for {path}). Known versions: {known}"
        )
    return path.read_text(encoding="utf-8")


@lru_cache(maxsize=8)
def prompt_sha256(version: str = DEFAULT_PROMPT_VERSION) -> str:
    """Hash of the prompt text, recorded in evaluation metadata for auditing."""
    return hashlib.sha256(load_prompt(version).encode("utf-8")).hexdigest()


def render_prompt(true_answer: str, pred_answer: str, version: str = DEFAULT_PROMPT_VERSION) -> str:
    """Fill the two placeholders.

    ``str.replace`` is used rather than ``str.format`` because the template
    contains literal JSON braces that ``format`` would try to interpret.
    """
    template = load_prompt(version)
    return template.replace("{true_answer}", true_answer).replace("{pred_answer}", pred_answer)
