"""Raw ZIP admission and deterministic packaging for Task 1 submissions."""

from __future__ import annotations

import hashlib
import io
import os
import stat
import struct
import tempfile
import zipfile
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .contracts import (
    MAX_FILE_BYTES,
    ValidationIssue,
    ValidationResult,
    load_jsonl_bytes,
    validate_submission,
)


ARCHIVE_MEMBER_NAME = "predictions.jsonl"
MAX_ARCHIVE_BYTES = MAX_FILE_BYTES + 4096
MAX_EXPANSION_RATIO = 100
ALLOWED_COMPRESSION_METHODS = frozenset({zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED})
EOCD_SIGNATURE = b"PK\x05\x06"
LOCAL_SIGNATURE = b"PK\x03\x04"
CENTRAL_SIGNATURE = b"PK\x01\x02"
DATA_DESCRIPTOR_SIGNATURE = b"PK\x07\x08"


@dataclass(frozen=True)
class ArchiveAdmission:
    valid: bool
    archive_sha256: str | None
    predictions_jsonl_sha256: str | None
    issues: tuple[ValidationIssue, ...]
    payload: bytes | None = None
    records: tuple[dict[str, Any], ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "archive_sha256": self.archive_sha256,
            "predictions_jsonl_sha256": self.predictions_jsonl_sha256,
            "record_count": len(self.records),
            "errors": [issue.as_dict() for issue in self.issues],
        }


def _issue(code: str, message: str, *, path: str = "") -> ValidationIssue:
    return ValidationIssue(code=code, path=path, message=message)


def _extra_field_error(extra: bytes, *, location: str) -> str | None:
    offset = 0
    while offset < len(extra):
        if len(extra) - offset < 4:
            return f"{location} extra field is truncated"
        tag, size = struct.unpack_from("<HH", extra, offset)
        offset += 4
        if size > len(extra) - offset:
            return f"{location} extra field payload is truncated"
        if tag == 0x0001:
            return "ZIP64 extra fields are forbidden"
        offset += size
    return None


def _read_regular_file(path: str | Path) -> tuple[bytes | None, tuple[ValidationIssue, ...]]:
    source = Path(path)
    descriptor: int | None = None
    try:
        flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(source, flags)
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode):
            return None, (_issue("E_ARCHIVE", "submission must be one regular ZIP file"),)
        if metadata.st_size > MAX_ARCHIVE_BYTES:
            return None, (
                _issue(
                    "E_RESOURCE",
                    f"ZIP exceeds the frozen {MAX_ARCHIVE_BYTES}-byte archive limit",
                ),
            )
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = os.read(descriptor, min(1024 * 1024, MAX_ARCHIVE_BYTES + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_ARCHIVE_BYTES:
                return None, (
                    _issue(
                        "E_RESOURCE",
                        f"ZIP exceeds the frozen {MAX_ARCHIVE_BYTES}-byte archive limit",
                    ),
                )
        return b"".join(chunks), ()
    except OSError as exc:
        return None, (_issue("E_FILE", f"cannot read submission ZIP: {exc}"),)
    finally:
        if descriptor is not None:
            os.close(descriptor)


def read_submission_archive(path: str | Path) -> ArchiveAdmission:
    """Admit one exact ZIP without extracting any participant-controlled path."""

    content, file_issues = _read_regular_file(path)
    if content is None:
        return ArchiveAdmission(False, None, None, file_issues)
    archive_sha256 = hashlib.sha256(content).hexdigest()
    issues: list[ValidationIssue] = []
    if len(content) < 22 or content[-22:-18] != EOCD_SIGNATURE:
        issues.append(_issue("E_ARCHIVE", "ZIP must end in one comment-free EOCD record"))
        return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
    try:
        (
            _signature,
            disk_number,
            central_disk,
            entries_on_disk,
            total_entries,
            central_size,
            central_offset,
            comment_length,
        ) = struct.unpack_from("<4s4H2LH", content, len(content) - 22)
    except struct.error:
        issues.append(_issue("E_ARCHIVE", "ZIP EOCD record is malformed"))
        return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
    if comment_length != 0:
        issues.append(_issue("E_ARCHIVE", "ZIP comments and trailing bytes are forbidden"))
    if disk_number != 0 or central_disk != 0 or entries_on_disk != total_entries:
        issues.append(_issue("E_ARCHIVE", "multi-disk ZIP archives are forbidden"))
    if total_entries != 1:
        issues.append(_issue("E_ARCHIVE", "ZIP must contain exactly one member"))
    if total_entries == 0xFFFF or central_size == 0xFFFFFFFF or central_offset == 0xFFFFFFFF:
        issues.append(_issue("E_ARCHIVE", "ZIP64 archives are forbidden"))
    expected_eocd_offset = len(content) - 22
    if central_offset + central_size != expected_eocd_offset:
        issues.append(_issue("E_ARCHIVE", "central directory boundary is inconsistent"))
    if not content.startswith(LOCAL_SIGNATURE):
        issues.append(_issue("E_ARCHIVE", "self-extracting prefixes are forbidden"))
    if central_offset + 4 > len(content) or content[central_offset : central_offset + 4] != CENTRAL_SIGNATURE:
        issues.append(_issue("E_ARCHIVE", "central directory signature is missing"))
    if central_offset + 46 > expected_eocd_offset:
        issues.append(_issue("E_ARCHIVE", "central directory record is truncated"))
    else:
        try:
            central_header = struct.unpack_from("<4s6H3L5H2L", content, central_offset)
        except struct.error:
            issues.append(_issue("E_ARCHIVE", "central directory record is malformed"))
        else:
            central_name_length = central_header[10]
            central_extra_length = central_header[11]
            central_comment_length = central_header[12]
            central_disk_start = central_header[13]
            central_local_offset = central_header[16]
            expected_central_size = (
                46
                + central_name_length
                + central_extra_length
                + central_comment_length
            )
            central_name_start = central_offset + 46
            central_name_end = central_name_start + central_name_length
            if central_size != expected_central_size:
                issues.append(_issue("E_ARCHIVE", "central directory has non-member records"))
            if central_comment_length != 0:
                issues.append(_issue("E_ARCHIVE", "member comments are forbidden"))
            if central_disk_start != 0 or central_local_offset != 0:
                issues.append(_issue("E_ARCHIVE", "central member location is invalid"))
            if content[central_name_start:central_name_end] != ARCHIVE_MEMBER_NAME.encode("ascii"):
                issues.append(_issue("E_ARCHIVE", "central member name is not canonical"))
    if issues:
        return ArchiveAdmission(False, archive_sha256, None, tuple(issues))

    try:
        with zipfile.ZipFile(io.BytesIO(content), mode="r") as archive:
            if archive.comment:
                issues.append(_issue("E_ARCHIVE", "ZIP comments are forbidden"))
            members = archive.infolist()
            if len(members) != 1:
                issues.append(_issue("E_ARCHIVE", "ZIP must contain exactly one member"))
                return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
            member = members[0]
            if member.filename != ARCHIVE_MEMBER_NAME or member.orig_filename != ARCHIVE_MEMBER_NAME:
                issues.append(
                    _issue(
                        "E_ARCHIVE",
                        f"the only member must be named exactly {ARCHIVE_MEMBER_NAME}",
                    )
                )
            if member.header_offset != 0:
                issues.append(_issue("E_ARCHIVE", "member local header must begin at byte zero"))
            if member.is_dir():
                issues.append(_issue("E_ARCHIVE", "directories are forbidden"))
            unix_mode = (member.external_attr >> 16) & 0xFFFF
            file_type = stat.S_IFMT(unix_mode)
            if file_type not in {0, stat.S_IFREG}:
                issues.append(_issue("E_ARCHIVE", "member must be a regular non-symlink file"))
            if member.flag_bits & 0x0001 or member.flag_bits & 0x2040:
                issues.append(_issue("E_ARCHIVE", "encrypted ZIP members are forbidden"))
            if member.compress_type not in ALLOWED_COMPRESSION_METHODS:
                issues.append(_issue("E_ARCHIVE", "compression method is not stored or deflate"))
            if member.extract_version > 20:
                issues.append(_issue("E_ARCHIVE", "ZIP features newer than classic ZIP 2.0 are forbidden"))
            if member.file_size > MAX_FILE_BYTES:
                issues.append(
                    _issue(
                        "E_RESOURCE",
                        f"predictions.jsonl exceeds {MAX_FILE_BYTES} decompressed bytes",
                    )
                )
            if member.compress_size == 0 and member.file_size > 0:
                issues.append(_issue("E_ARCHIVE", "non-empty member has zero compressed size"))
            elif member.compress_size and member.file_size > member.compress_size * MAX_EXPANSION_RATIO:
                issues.append(
                    _issue(
                        "E_RESOURCE",
                        f"ZIP expansion ratio exceeds {MAX_EXPANSION_RATIO}:1",
                    )
                )
            central_extra_error = _extra_field_error(member.extra, location="central")
            if central_extra_error:
                issues.append(_issue("E_ARCHIVE", central_extra_error))

            try:
                (
                    local_signature,
                    _version_needed,
                    local_flags,
                    local_method,
                    _modified_time,
                    _modified_date,
                    local_crc,
                    local_compressed_size,
                    local_file_size,
                    local_name_length,
                    local_extra_length,
                ) = struct.unpack_from("<4s5H3L2H", content, member.header_offset)
            except struct.error:
                issues.append(_issue("E_ARCHIVE", "local file header is malformed"))
                return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
            local_name_start = member.header_offset + 30
            local_name_end = local_name_start + local_name_length
            local_extra_end = local_name_end + local_extra_length
            if local_extra_end > central_offset:
                issues.append(_issue("E_ARCHIVE", "local header fields overlap central directory"))
                return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
            local_name = content[local_name_start:local_name_end]
            local_extra = content[local_name_end:local_extra_end]
            if local_signature != LOCAL_SIGNATURE or local_name != ARCHIVE_MEMBER_NAME.encode("ascii"):
                issues.append(_issue("E_ARCHIVE", "local and central member names differ"))
            if local_flags != member.flag_bits or local_method != member.compress_type:
                issues.append(_issue("E_ARCHIVE", "local and central ZIP flags or methods differ"))
            local_extra_error = _extra_field_error(local_extra, location="local")
            if local_extra_error:
                issues.append(_issue("E_ARCHIVE", local_extra_error))
            data_end = local_extra_end + member.compress_size
            if member.flag_bits & 0x0008:
                descriptor = content[data_end:central_offset]
                if len(descriptor) == 16 and descriptor.startswith(DATA_DESCRIPTOR_SIGNATURE):
                    descriptor = descriptor[4:]
                if len(descriptor) != 12:
                    issues.append(_issue("E_ARCHIVE", "data descriptor has a non-canonical size"))
                else:
                    descriptor_crc, descriptor_compressed, descriptor_size = struct.unpack(
                        "<3L", descriptor
                    )
                    if (
                        descriptor_crc != member.CRC
                        or descriptor_compressed != member.compress_size
                        or descriptor_size != member.file_size
                    ):
                        issues.append(_issue("E_ARCHIVE", "data descriptor differs from central directory"))
            else:
                if data_end != central_offset:
                    issues.append(_issue("E_ARCHIVE", "bytes exist between member data and central directory"))
                if (
                    local_crc != member.CRC
                    or local_compressed_size != member.compress_size
                    or local_file_size != member.file_size
                ):
                    issues.append(_issue("E_ARCHIVE", "local and central sizes or CRC differ"))
            if issues:
                return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
            with archive.open(member, mode="r") as handle:
                payload = handle.read(MAX_FILE_BYTES + 1)
                if handle.read(1):
                    payload += b"x"
            if len(payload) > MAX_FILE_BYTES or len(payload) != member.file_size:
                issues.append(_issue("E_RESOURCE", "decompressed member violates its size contract"))
                return ArchiveAdmission(False, archive_sha256, None, tuple(issues))
    except (OSError, RuntimeError, zipfile.BadZipFile, zlib.error) as exc:
        issues.append(_issue("E_ARCHIVE", f"ZIP integrity check failed: {exc}"))
        return ArchiveAdmission(False, archive_sha256, None, tuple(issues))

    loaded = load_jsonl_bytes(payload)
    predictions_sha256 = hashlib.sha256(payload).hexdigest()
    return ArchiveAdmission(
        loaded.valid,
        archive_sha256,
        predictions_sha256,
        loaded.issues,
        payload=payload,
        records=loaded.records,
    )


def validate_submission_archive(
    path: str | Path, questions: Mapping[str, Mapping[str, Any]]
) -> ArchiveAdmission:
    admitted = read_submission_archive(path)
    if not admitted.valid:
        return admitted
    validation: ValidationResult = validate_submission(
        admitted.records, questions, require_complete=True
    )
    return ArchiveAdmission(
        validation.valid,
        admitted.archive_sha256,
        admitted.predictions_jsonl_sha256,
        validation.issues,
        payload=admitted.payload,
        records=validation.records,
    )


def build_submission_archive(predictions_path: str | Path, output_path: str | Path) -> None:
    """Atomically package validated JSONL bytes into a deterministic stored ZIP."""

    source = Path(predictions_path)
    if source.is_symlink() or not source.is_file():
        raise ValueError("predictions input must be one regular file")
    content = source.read_bytes()
    loaded = load_jsonl_bytes(content)
    if not loaded.valid:
        raise ValueError(f"predictions JSONL is structurally invalid: {loaded.as_dict()}")
    target = Path(output_path)
    if target.suffix.lower() != ".zip":
        raise ValueError("submission archive path must end in .zip")
    if target.exists() or target.is_symlink():
        raise ValueError("submission archive output must not already exist")
    target.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    os.close(file_descriptor)
    try:
        info = zipfile.ZipInfo(ARCHIVE_MEMBER_NAME, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED
        info.create_system = 3
        info.external_attr = (stat.S_IFREG | 0o644) << 16
        with zipfile.ZipFile(temporary_name, mode="w", allowZip64=False) as archive:
            archive.writestr(info, content)
        os.chmod(temporary_name, 0o644)
        os.replace(temporary_name, target)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
