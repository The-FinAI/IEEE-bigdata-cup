"""Small crypto check run by each portal on startup, never with participant data."""
import base64
import json

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from participant_contacts import SCHEMA, normalize_contact_email, open_contact, seal_contact


def verify_contact_encryption():
    key = X25519PrivateKey.generate()
    private = base64.b64encode(key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())).decode()
    public = base64.b64encode(key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode()
    record = {"schema_version": SCHEMA, "contact_id": "startup-check", "contact_email": "synthetic@example.org"}
    encrypted = seal_contact(record, public)
    if b"synthetic@example.org" in encrypted or open_contact(encrypted, private) != record:
        raise RuntimeError("Contact encryption check failed.")
    envelope = json.loads(encrypted)
    envelope["contact_id"] = "tampered"
    try:
        open_contact(json.dumps(envelope).encode(), private)
    except InvalidTag:
        pass
    else:
        raise RuntimeError("Contact integrity check failed.")
    if normalize_contact_email(" Synthetic@Example.org ") != "synthetic@example.org":
        raise RuntimeError("Contact normalization check failed.")
