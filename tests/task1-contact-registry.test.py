"""Run on CI, without competition data, secrets, or remote writes."""
import base64
import importlib.util
import json
import pathlib
import unittest

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey

spec = importlib.util.spec_from_file_location("contacts", pathlib.Path(__file__).parents[1] / "scripts/task1/participant_contacts.py")
contacts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contacts)


class ContactEncryptionTest(unittest.TestCase):
    def setUp(self):
        key = X25519PrivateKey.generate()
        self.private = base64.b64encode(key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())).decode()
        self.public = base64.b64encode(key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode()
        self.record = {"schema_version": contacts.SCHEMA, "contact_id": "contact-example", "contact_email": "participant@example.org", "team_name": "Example"}

    def test_recoverable_only_with_organizer_key(self):
        encrypted = contacts.seal_contact(self.record, self.public)
        self.assertNotIn(b"participant@example.org", encrypted)
        self.assertNotIn(b"Example", encrypted)
        self.assertEqual(contacts.open_contact(encrypted, self.private), self.record)
        self.assertNotEqual(encrypted, contacts.seal_contact(self.record, self.public))
        wrong = base64.b64encode(bytes(32)).decode()
        with self.assertRaises(ValueError):
            contacts.open_contact(encrypted, wrong)

    def test_tamper_detection(self):
        envelope = json.loads(contacts.seal_contact(self.record, self.public))
        envelope["contact_id"] = "contact-replaced"
        with self.assertRaises(InvalidTag):
            contacts.open_contact(json.dumps(envelope).encode(), self.private)

    def test_email_and_consent(self):
        self.assertEqual(contacts.normalize_contact_email(" Person@Example.org "), "person@example.org")
        for value in ("not-email", "x@example.org\nBcc: y@example.org", "", None):
            with self.assertRaises(ValueError):
                contacts.normalize_contact_email(value)
        with self.assertRaisesRegex(ValueError, "agree"):
            contacts.save_contact(api=None, repo_id="", token="", public_key_b64=self.public,
                                  phase="test", team_id="team-example", team_name="Example",
                                  email="participant@example.org", match_method="test", submission_id="test-example", consent=False)


if __name__ == "__main__":
    unittest.main()
