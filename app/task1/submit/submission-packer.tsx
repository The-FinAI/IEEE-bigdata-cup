"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import pilotConfig from "@/public/task1/pilot-config.json";
import { createSubmissionEnvelope } from "@/lib/task1-envelope.mjs";

const repositoryUrl = `https://github.com/${pilotConfig.repository}`;

type PreparedSubmission = {
  downloadUrl: string;
  downloadName: string;
  issueUrl: string;
};

export function SubmissionPacker() {
  const [archive, setArchive] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<PreparedSubmission | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.downloadUrl);
    };
  }, [prepared]);

  const maxSize = useMemo(
    () => `${Math.floor(pilotConfig.max_plaintext_bytes / (1024 * 1024))} MiB`,
    [],
  );

  function resetPrepared() {
    if (prepared) URL.revokeObjectURL(prepared.downloadUrl);
    setPrepared(null);
    setMessage("");
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const githubLogin = String(new FormData(event.currentTarget).get("github-login") ?? "");
    resetPrepared();
    if (!archive) {
      setMessage("Choose a predictions ZIP first.");
      return;
    }
    if (!archive.name.toLowerCase().endsWith(".zip")) {
      setMessage("The selected file must be a .zip archive.");
      return;
    }
    if (archive.size === 0 || archive.size > pilotConfig.max_plaintext_bytes) {
      setMessage(`The ZIP must be non-empty and no larger than ${maxSize}.`);
      return;
    }

    setBusy(true);
    setMessage("Encrypting locally in this browser…");
    try {
      const clientSubmissionId = globalThis.crypto.randomUUID();
      const envelope = await createSubmissionEnvelope({
        archiveBytes: new Uint8Array(await archive.arrayBuffer()),
        githubLogin,
        evaluationVersion: pilotConfig.evaluation_version,
        recipientPublicKeyB64: pilotConfig.recipient_public_key_b64,
        keyFingerprintSha256: pilotConfig.key_fingerprint_sha256,
        maxPlaintextBytes: pilotConfig.max_plaintext_bytes,
        clientSubmissionId,
      });
      const blob = new Blob([JSON.stringify(envelope)], {
        type: "application/json",
      });
      const downloadName = `finreason-task1-pilot-${clientSubmissionId}.json`;
      const downloadUrl = URL.createObjectURL(blob);
      const issueUrl = new URL(`${repositoryUrl}/issues/new`);
      issueUrl.searchParams.set("template", pilotConfig.issue_template);
      issueUrl.searchParams.set("github_login", githubLogin.trim());
      setPrepared({
        downloadUrl,
        downloadName,
        issueUrl: issueUrl.toString(),
      });
      setMessage(
        "Encrypted submission ready. Download it, then upload that JSON file in the GitHub form.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare the submission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="submission-packer" onSubmit={prepare}>
      <div className="pilot-banner">
        <strong>Organizer pilot</strong>
        <span>Synthetic examples only. Results are not official competition scores.</span>
      </div>

      <label htmlFor="github-login">GitHub login</label>
      <input
        id="github-login"
        name="github-login"
        autoComplete="username"
        onChange={resetPrepared}
        placeholder="Example: ZhuohanX"
        required
      />

      <label htmlFor="predictions-zip">Predictions ZIP</label>
      <input
        id="predictions-zip"
        name="predictions-zip"
        type="file"
        accept=".zip,application/zip"
        onChange={(event) => {
          setArchive(event.target.files?.[0] ?? null);
          resetPrepared();
        }}
        required
      />
      <p className="field-note">
        The ZIP is encrypted inside your browser and is not uploaded by this page. Pilot limit: {maxSize}.
      </p>

      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? "Preparing…" : "Prepare encrypted submission"}
      </button>

      {message ? <p className="packer-status" role="status">{message}</p> : null}

      {prepared ? (
        <div className="prepared-actions">
          <a
            className="button button-bright"
            href={prepared.downloadUrl}
            download={prepared.downloadName}
          >
            Download encrypted file
          </a>
          <a
            className="button button-ghost-dark"
            href={prepared.issueUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open GitHub submission form ↗
          </a>
        </div>
      ) : null}
    </form>
  );
}
