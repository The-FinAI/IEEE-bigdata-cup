# Task 1 participant contacts

The original Development portal did not collect email; the original Test portal
kept a keyed identifier but no recoverable email. Historical addresses cannot be
reconstructed from those records. Do not describe paper authors or the old
interest list as a complete list of system submitters.

From 29 October 2026 each portal has a separate optional contact form. Test matches
the original email-derived identifier and accepted Team Name. Development matches
a Team Name and accepted receipt; its contact is self-declared and email ownership
is not verified. The forms remain available after the prediction cutoff. They
create only encrypted `contacts/v1/*.json.enc` records in the existing private
vaults. No prediction, event, score, rank, or deadline is modified. The notice
requires explicit agreement to paper reminders and competition administration.

`participant_contacts.py` uses X25519, HKDF-SHA256 with a contact-specific domain,
and AES-256-GCM. The portals have only the public encryption key. Existing
organizer vault private keys decrypt contacts. No contact email, team name, or
accepted submission reference is stored in the unencrypted envelope. Both portals
run the bounded synthetic crypto/integrity self-check on startup.

`export_participant_contacts.py` exports the latest contact registration per
phase/team into a new private CSV, pinned to the observed vault revision. It does
not overwrite an existing export or output addresses to stdout. Inject `HF_TOKEN`
and the appropriate organizer key through the approved secret manager. The
Development key environment variable is `FINREASON_DEV_VAULT_PRIVATE_KEY_B64`;
the Test key variable is `FINREASON_TEST_VAULT_PRIVATE_KEY_B64`. The exporter skips
the organizer smoke account. Exported emails are not an email-ownership assertion.

Mailing coverage must be tracked against all accepted system submitters, with
Development and Test distinguished. Paper status is a separate field. Reconcile
known participant correspondence, explicit paper/team links, and these opt-in
contacts. Respect recorded opt-outs; an unknown or unmatched paper is not proof
that the team has not submitted a paper. Keep email addresses in restricted
organizer channels and BCC, never public leaderboards or the public repository.

Participant email and Discord sends follow the user's normal review rules.
Neither a contact export nor a public banner proves delivery to all participants.
