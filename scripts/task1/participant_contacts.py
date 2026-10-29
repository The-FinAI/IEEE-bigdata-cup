"""Private, opt-in contact records, independent of competition submissions."""

from __future__ import annotations

import base64
import hashlib
import io
import json
import re
import secrets
from datetime import datetime, timezone

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from huggingface_hub import CommitOperationAdd

SCHEMA = "finreason.task1.contact/1.0.0"
PURPOSE = "Working Notes reminders and competition administration"
DOMAIN = b"finreason-task1-contact-v1\x00"


def _json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def normalize_contact_email(value):
    if not isinstance(value, str):
        raise ValueError("Enter a valid contact email.")
    email = value.strip().casefold()
    if (not 3 <= len(email) <= 254 or not email.isascii()
            or not re.fullmatch(r"[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+", email)):
        raise ValueError("Enter a valid contact email.")
    return email


def seal_contact(record, public_key_b64):
    public_key = base64.b64decode(public_key_b64, validate=True)
    ephemeral = X25519PrivateKey.generate()
    context = {
        "schema_version": SCHEMA,
        "contact_id": record["contact_id"],
        "recipient_key_sha256": hashlib.sha256(public_key).hexdigest(),
    }
    aad = _json(context)
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=DOMAIN + aad).derive(
        ephemeral.exchange(X25519PublicKey.from_public_bytes(public_key))
    )
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(key).encrypt(nonce, _json(record), aad)
    return _json({
        **context,
        "ephemeral_public_key_b64": base64.b64encode(ephemeral.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode(),
        "nonce_b64": base64.b64encode(nonce).decode(),
        "ciphertext_b64": base64.b64encode(ciphertext).decode(),
    }) + b"\n"


def open_contact(envelope_bytes, private_key_b64):
    envelope = json.loads(envelope_bytes)
    if envelope.get("schema_version") != SCHEMA:
        raise ValueError("Unsupported contact record.")
    private_key = X25519PrivateKey.from_private_bytes(base64.b64decode(private_key_b64, validate=True))
    public_key = private_key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    if envelope["recipient_key_sha256"] != hashlib.sha256(public_key).hexdigest():
        raise ValueError("Wrong organizer key.")
    aad = _json({k: envelope[k] for k in ("schema_version", "contact_id", "recipient_key_sha256")})
    shared = private_key.exchange(X25519PublicKey.from_public_bytes(base64.b64decode(envelope["ephemeral_public_key_b64"], validate=True)))
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=DOMAIN + aad).derive(shared)
    record = json.loads(AESGCM(key).decrypt(base64.b64decode(envelope["nonce_b64"], validate=True),
                                         base64.b64decode(envelope["ciphertext_b64"], validate=True), aad))
    if record.get("contact_id") != envelope["contact_id"] or record.get("schema_version") != SCHEMA:
        raise ValueError("Inconsistent contact record.")
    return record


def save_contact(*, api, repo_id, token, public_key_b64, phase, team_id,
                 team_name, email, match_method, submission_id, consent):
    if consent is not True:
        raise ValueError("Please agree to the contact notice before saving.")
    if phase not in {"development", "test"} or not team_id or not submission_id:
        raise ValueError("A matching accepted submission is required.")
    contact_id = "contact-" + secrets.token_hex(16)
    record = {
        "schema_version": SCHEMA,
        "contact_id": contact_id,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "phase": phase,
        "team_id": team_id,
        "team_name": team_name,
        "contact_email": normalize_contact_email(email),
        "match_method": match_method,
        "submission_id": submission_id,
        "purpose": PURPOSE,
        "consent_notice_version": "2026-10-29",
    }
    content = seal_contact(record, public_key_b64)
    # A separate prefix keeps these records out of every submission/scoring loader.
    path = "contacts/v1/" + contact_id + ".json.enc"
    commit = api.create_commit(repo_id=repo_id, repo_type="dataset", token=token,
                               operations=[CommitOperationAdd(path_in_repo=path, path_or_fileobj=io.BytesIO(content))],
                               commit_message="Save encrypted participant contact")
    # Confirm storage at the exact commit, without exposing the email in a receipt.
    from huggingface_hub import hf_hub_download
    stored = hf_hub_download(repo_id=repo_id, repo_type="dataset", token=token,
                             revision=commit.oid, filename=path)
    from pathlib import Path
    if Path(stored).read_bytes() != content:
        raise RuntimeError("Contact storage could not be confirmed.")
    return "Contact saved for paper reminders and competition administration. Receipt: " + contact_id
