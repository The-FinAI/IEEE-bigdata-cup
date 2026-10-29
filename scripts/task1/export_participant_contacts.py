"""Organizer-only export. Inject HF_TOKEN and the relevant vault private key.

Run in the authorized organizer environment; never commit the generated CSV.
Example: --repo Zhuohan/finreason-task1-test-v2-vault --output /private/contacts.csv
"""

import argparse
import csv
import json
import os
from pathlib import Path

from huggingface_hub import HfApi, hf_hub_download
from participant_contacts import open_contact


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--private-key-env", default="FINREASON_TEST_VAULT_PRIVATE_KEY_B64")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    allowed = {"Zhuohan/finreason-task1-test-v2-vault", "Zhuohan/finreason-task1-development-vault-production-v1"}
    if args.repo not in allowed:
        parser.error("Use a verified Task 1 private vault.")
    token = os.environ.pop("HF_TOKEN")
    private_key = os.environ.pop(args.private_key_env)
    api = HfApi(token=token)
    info = api.repo_info(args.repo, repo_type="dataset")
    latest = {}
    for item in info.siblings:
        path = item.rfilename
        if not (path.startswith("contacts/v1/") and path.endswith(".json.enc")):
            continue
        saved = hf_hub_download(args.repo, filename=path, repo_type="dataset", revision=info.sha, token=token)
        row = open_contact(Path(saved).read_bytes(), private_key)
        if row["team_name"] == "Organizer V2 Smoke Test":
            continue
        key = (row["phase"], row["team_id"])
        if key not in latest or row["recorded_at"] > latest[key]["recorded_at"]:
            latest[key] = row
    fields = ["phase", "team_name", "contact_email", "recorded_at", "match_method", "contact_id", "submission_id"]
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in sorted(latest.values(), key=lambda value: (value["phase"], value["team_name"].casefold())):
            writer.writerow(row)
    print(json.dumps({"repo": args.repo, "revision": info.sha, "contacts": len(latest), "output": str(args.output)}))


if __name__ == "__main__":
    main()
