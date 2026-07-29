"""Fail if an organizer-draft starter kit still contains unresolved markers."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = re.compile(r"\b(TODO|TBD|PLACEHOLDER)\b", re.IGNORECASE)
TEXT_SUFFIXES = {".md", ".json", ".py", ".toml", ".yaml", ".yml", ".csv"}
IGNORED = {
    ROOT / "scripts" / "release_readiness.py",
    ROOT / "tests" / "test_contracts.py",
}


def main() -> int:
    findings: list[tuple[Path, int, str]] = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if path in IGNORED or "__pycache__" in path.parts:
            continue
        for line_number, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if MARKER.search(line):
                findings.append((path.relative_to(ROOT), line_number, line.strip()))

    if findings:
        print(f"NOT READY: {len(findings)} unresolved release markers found.")
        for path, line_number, line in findings[:80]:
            print(f"- {path}:{line_number}: {line}")
        if len(findings) > 80:
            print(f"- … {len(findings) - 80} additional findings")
        return 1

    print("READY: no unresolved release markers found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
