#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import stat
import sys
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path

MAX_ARCHIVE_BYTES = 8 * 1024 * 1024
MAX_PAYLOAD_BYTES = 1024 * 1024
NUMBER = re.compile(r"^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$")
GOLD = {
    "pilot-001": {
        "final": Decimal("120.00"),
        "steps": {"gross_profit": Decimal("150.00")},
    },
    "pilot-002": {
        "final": Decimal("0.25"),
        "steps": {"ratio": Decimal("0.25")},
    },
}


class ParticipantError(Exception):
    pass


def fail(code: str) -> None:
    raise ParticipantError(code)


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            fail("JSON_DUPLICATE_KEY")
        result[key] = value
    return result


def exact_fields(value, fields, code):
    if not isinstance(value, dict) or set(value) != set(fields):
        fail(code)


def parse_value(wrapper, code):
    exact_fields(wrapper, {"value"}, code)
    value = wrapper["value"]
    if not isinstance(value, str) or not NUMBER.fullmatch(value):
        fail(code)
    try:
        parsed = Decimal(value)
    except InvalidOperation:
        fail(code)
    if not parsed.is_finite():
        fail(code)
    return parsed


def has_zip64_extra(extra: bytes) -> bool:
    index = 0
    while index + 4 <= len(extra):
        header_id = int.from_bytes(extra[index:index + 2], "little")
        data_size = int.from_bytes(extra[index + 2:index + 4], "little")
        index += 4
        if index + data_size > len(extra):
            fail("ZIP_EXTRA_INVALID")
        if header_id == 0x0001:
            return True
        index += data_size
    if index != len(extra):
        fail("ZIP_EXTRA_INVALID")
    return False


def read_payload(archive_path: Path) -> bytes:
    if not archive_path.is_file() or archive_path.stat().st_size > MAX_ARCHIVE_BYTES:
        fail("ARCHIVE_SIZE_INVALID")
    try:
        with zipfile.ZipFile(archive_path, "r") as archive:
            members = archive.infolist()
            if len(members) != 1:
                fail("ARCHIVE_MEMBER_COUNT_INVALID")
            member = members[0]
            if member.filename != "predictions.jsonl" or member.is_dir():
                fail("ARCHIVE_MEMBER_NAME_INVALID")
            mode = member.external_attr >> 16
            if mode and stat.S_ISLNK(mode):
                fail("ARCHIVE_SYMLINK_REJECTED")
            if (
                member.flag_bits & 0x1
                or has_zip64_extra(member.extra)
                or member.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}
            ):
                fail("ARCHIVE_FEATURE_REJECTED")
            if member.file_size < 1 or member.file_size > MAX_PAYLOAD_BYTES:
                fail("PAYLOAD_SIZE_INVALID")
            if member.compress_size == 0 or member.file_size / member.compress_size > 100:
                fail("ARCHIVE_RATIO_INVALID")
            chunks = []
            actual_size = 0
            with archive.open(member, "r") as source:
                while True:
                    chunk = source.read(64 * 1024)
                    if not chunk:
                        break
                    actual_size += len(chunk)
                    if actual_size > MAX_PAYLOAD_BYTES:
                        fail("PAYLOAD_SIZE_INVALID")
                    chunks.append(chunk)
            if actual_size != member.file_size:
                fail("ARCHIVE_INVALID")
            payload = b"".join(chunks)
    except ParticipantError:
        raise
    except (OSError, zipfile.BadZipFile, RuntimeError):
        fail("ARCHIVE_INVALID")
    if len(payload) > MAX_PAYLOAD_BYTES:
        fail("PAYLOAD_SIZE_INVALID")
    return payload


def parse_predictions(payload: bytes):
    try:
        text = payload.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        fail("PAYLOAD_UTF8_INVALID")
    if "\x00" in text:
        fail("PAYLOAD_NUL_REJECTED")
    lines = text.splitlines()
    if len(lines) != len(GOLD) or any(not line for line in lines):
        fail("PREDICTION_ROW_COUNT_INVALID")
    predictions = {}
    for line in lines:
        try:
            row = json.loads(line, object_pairs_hook=reject_duplicate_keys)
        except ParticipantError:
            raise
        except (json.JSONDecodeError, TypeError):
            fail("PREDICTION_JSON_INVALID")
        exact_fields(row, {"case_id", "final_answer", "steps"}, "PREDICTION_FIELDS_INVALID")
        case_id = row["case_id"]
        if not isinstance(case_id, str) or case_id not in GOLD or case_id in predictions:
            fail("PREDICTION_CASE_ID_INVALID")
        final_answer = parse_value(row["final_answer"], "FINAL_ANSWER_INVALID")
        if not isinstance(row["steps"], list):
            fail("STEPS_INVALID")
        steps = {}
        expected_steps = GOLD[case_id]["steps"]
        for step in row["steps"]:
            exact_fields(step, {"slot_id", "value"}, "STEP_FIELDS_INVALID")
            slot_id = step["slot_id"]
            if not isinstance(slot_id, str) or slot_id not in expected_steps or slot_id in steps:
                fail("STEP_ID_INVALID")
            steps[slot_id] = parse_value(step["value"], "STEP_VALUE_INVALID")
        if set(steps) != set(expected_steps):
            fail("STEP_COVERAGE_INVALID")
        predictions[case_id] = {"final": final_answer, "steps": steps}
    if set(predictions) != set(GOLD):
        fail("PREDICTION_COVERAGE_INVALID")
    return predictions


def score(predictions):
    fac = []
    checkpoints = []
    for case_id, gold in GOLD.items():
        prediction = predictions[case_id]
        fac.append(Decimal(1) if prediction["final"] == gold["final"] else Decimal(0))
        matches = sum(
            prediction["steps"][slot_id] == expected
            for slot_id, expected in gold["steps"].items()
        )
        checkpoints.append(Decimal(matches) / Decimal(len(gold["steps"])))
    seen_fac = sum(fac, Decimal(0)) / Decimal(len(fac))
    seen_checkpoint = sum(checkpoints, Decimal(0)) / Decimal(len(checkpoints))
    return {
        "status": "scored",
        "evaluation_version": "task1-github-pilot-v1",
        "seen_fac": f"{seen_fac:.6f}",
        "seen_checkpoint": f"{seen_checkpoint:.6f}",
        "case_count": len(GOLD),
    }


def main(argv):
    if len(argv) != 2:
        raise RuntimeError("expected one archive path")
    try:
        predictions = parse_predictions(read_payload(Path(argv[1])))
        result = score(predictions)
    except ParticipantError as error:
        result = {"status": "participant_error", "error_code": str(error)}
    sys.stdout.write(json.dumps(result, sort_keys=True, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    try:
        main(sys.argv)
    except Exception:
        sys.stderr.write('{"status":"infrastructure_error","error_code":"SCORER_FAILED"}\n')
        raise SystemExit(1)
