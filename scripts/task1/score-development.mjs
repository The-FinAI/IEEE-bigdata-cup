import { createHash, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };
import { decryptSubmissionEnvelope } from "../../lib/task1-envelope.mjs";
import { openDevelopmentReference } from "../../lib/task1-dev-reference.mjs";
import { decodeResultMarker, markerPrefix, signResultRecord } from "./result-record.mjs";

function parseArguments(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith("--") || argv[index + 1] === undefined) throw new Error("Invalid arguments");
    result.set(argv[index].slice(2), argv[index + 1]);
  }
  return result;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "finreason-task1-development-evaluator/1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub read failed with ${response.status}`);
  return response.json();
}

async function fetchIssueComments(issueNumber, token) {
  const comments = [];
  for (let page = 1; page <= 100; page += 1) {
    const batch = await github(
      `/repos/${submissionConfig.repository}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
      token,
    );
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw new Error("Terminal issue comment scan exceeded safety limit");
}

async function fetchTerminalRecords(token) {
  const records = [];
  const labels = [submissionConfig.scored_label, submissionConfig.invalid_label];
  for (const label of labels) {
    for (let page = 1; ; page += 1) {
      const issues = await github(
        `/repos/${submissionConfig.repository}/issues?state=all&labels=${encodeURIComponent(label)}&per_page=100&page=${page}`,
        token,
      );
      for (const issue of issues) {
        if (issue.pull_request) continue;
        const comments = await fetchIssueComments(issue.number, token);
        const marked = comments.filter((comment) => comment.user?.login === "github-actions[bot]" && comment.body?.includes(markerPrefix));
        if (marked.length !== 1) throw new Error("Terminal issue result integrity failure");
        const record = decodeResultMarker(marked[0].body);
        if (
          !record ||
          record.issue_number !== issue.number ||
          record.issue_node_id !== issue.node_id ||
          record.issue_created_at !== issue.created_at ||
          record.actor_id !== issue.user?.id
        ) {
          throw new Error("Terminal issue event binding failure");
        }
        records.push(record);
      }
      if (issues.length < 100) break;
      if (page >= 100) throw new Error("Terminal issue scan exceeded safety limit");
    }
  }
  return records;
}

export function evaluateSubmissionPolicy(records, intake, metadata) {
  const sameIssue = records.find((record) => record.issue_number === intake.issue_number);
  if (sameIssue) return { existing: sameIssue };
  if (Date.parse(intake.issue_created_at) >= Date.parse(submissionConfig.submission_deadline_exclusive)) {
    return { error: "SUBMISSION_DEADLINE_CLOSED" };
  }
  const accepted = records.filter((record) => record.status === "scored" && record.actor_id === intake.actor_id);
  if (accepted.some((record) =>
    record.submission_content_tag_sha256 === metadata.submission_content_tag_sha256 ||
    record.client_submission_id === metadata.client_submission_id
  )) return { error: "REPLAY_REJECTED" };
  if (accepted.length >= submissionConfig.total_quota) return { error: "TOTAL_QUOTA_EXCEEDED" };
  const utcDay = intake.issue_created_at.slice(0, 10);
  if (accepted.filter((record) => record.accepted_at.slice(0, 10) === utcDay).length >= submissionConfig.daily_quota_utc) {
    return { error: "DAILY_QUOTA_EXCEEDED" };
  }
  return {};
}

function eventBase(intake) {
  const acceptedAt = intake.issue_created_at;
  const teamId = `team-gh-${intake.actor_id}`;
  return {
    schema_version: "finreason.task1.github-development-result/1.0.0",
    phase: submissionConfig.phase,
    evaluation_version: submissionConfig.evaluation_version,
    dataset_version: submissionConfig.dataset_version,
    release_version: submissionConfig.release_version,
    repository: intake.repository,
    repository_id: intake.repository_id,
    issue_number: intake.issue_number,
    issue_node_id: intake.issue_node_id,
    issue_created_at: intake.issue_created_at,
    actor_id: intake.actor_id,
    github_login: intake.github_login,
    team_id: teamId,
    accepted_at: acceptedAt,
    envelope_sha256: intake.envelope_sha256,
    event_sha256: intake.event_sha256,
    release_manifest_sha256: submissionConfig.release_manifest_sha256,
    questions_sha256: submissionConfig.questions_sha256,
    expected_ids_sha256: submissionConfig.expected_ids_sha256,
    reference_envelope_sha256: submissionConfig.reference_envelope_sha256,
    workflow_run_id: Number(process.env.GITHUB_RUN_ID),
    workflow_run_attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    workflow_sha: process.env.GITHUB_SHA,
    submission_deadline_exclusive: submissionConfig.submission_deadline_exclusive,
  };
}

function scoredBase(intake, metadata) {
  const base = eventBase(intake);
  return {
    ...base,
    submission_id: `dev-${base.accepted_at.replace(/[-:]/g, "")}-${base.team_id}-${metadata.submission_content_tag_sha256}`,
    client_submission_id: metadata.client_submission_id,
    submission_content_tag_sha256: metadata.submission_content_tag_sha256,
  };
}

export function makeSubmissionContentTag(plaintextSha256, actorId, signingKeyB64) {
  if (!/^[0-9a-f]{64}$/.test(plaintextSha256) || !Number.isInteger(actorId) || actorId < 1) {
    throw new Error("Replay tag input is invalid");
  }
  const key = createPrivateKey({
    key: Buffer.from(signingKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const signature = cryptoSign(
    null,
    Buffer.from(`finreason-task1-development-replay-v1\n${actorId}\n${plaintextSha256}`, "utf8"),
    key,
  );
  return sha256(signature);
}

function signedError(intake, code, signingKeyB64) {
  return signResultRecord({ ...eventBase(intake), status: "participant_error", error_code: code }, signingKeyB64);
}

export async function scoreDevelopment({ intake, envelope, referenceEnvelope, privateKeyB64, signingKeyB64, token, terminalRecords }) {
  let decrypted;
  try {
    decrypted = await decryptSubmissionEnvelope({
      envelope,
      recipientPrivateKeyPkcs8B64: privateKeyB64,
      expectedKeyFingerprintSha256: submissionConfig.key_fingerprint_sha256,
      expectedEvaluationVersion: submissionConfig.evaluation_version,
      expectedPhase: submissionConfig.phase,
      expectedRepository: submissionConfig.repository,
      expectedRepositoryId: submissionConfig.repository_id,
      expectedReleaseManifestSha256: submissionConfig.release_manifest_sha256,
      expectedQuestionsSha256: submissionConfig.questions_sha256,
      expectedIdsSha256: submissionConfig.expected_ids_sha256,
      maxPlaintextBytes: submissionConfig.max_plaintext_bytes,
    });
  } catch {
    return signedError(intake, "ENVELOPE_DECRYPTION_FAILED", signingKeyB64);
  }
  if (decrypted.metadata.github_login.toLowerCase() !== intake.github_login.toLowerCase()) {
    return signedError(intake, "GITHUB_LOGIN_MISMATCH", signingKeyB64);
  }
  decrypted.metadata.submission_content_tag_sha256 = makeSubmissionContentTag(
    decrypted.metadata.plaintext_sha256,
    intake.actor_id,
    signingKeyB64,
  );

  const base = scoredBase(intake, decrypted.metadata);
  const records = terminalRecords ?? await fetchTerminalRecords(token);
  const quota = evaluateSubmissionPolicy(records, intake, decrypted.metadata);
  if (quota.existing) return quota.existing;
  if (quota.error) return signedError(intake, quota.error, signingKeyB64);

  const referenceBytes = Buffer.from(JSON.stringify(referenceEnvelope) + "\n");
  if (sha256(referenceBytes) !== submissionConfig.reference_envelope_sha256) {
    throw new Error("REFERENCE_ENVELOPE_HASH_MISMATCH");
  }
  const reference = await openDevelopmentReference({
    envelope: referenceEnvelope,
    recipientPrivateKeyPkcs8B64: privateKeyB64,
    keyFingerprintSha256: submissionConfig.key_fingerprint_sha256,
    commitments: submissionConfig,
  });
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "finreason-task1-development-"));
  try {
    const archivePath = join(temporaryDirectory, "predictions.zip");
    const goldPath = join(temporaryDirectory, "leaderboard_gold.jsonl");
    const manifestPath = join(temporaryDirectory, "leaderboard_manifest.jsonl");
    await Promise.all([
      writeFile(archivePath, decrypted.archiveBytes, { mode: 0o600 }),
      writeFile(goldPath, reference.goldBytes, { mode: 0o600 }),
      writeFile(manifestPath, reference.manifestBytes, { mode: 0o600 }),
    ]);
    const scorer = resolve("scripts/task1/development_scorer.py");
    const processResult = spawnSync(process.env.TASK1_PYTHON ?? "python3", [
      scorer,
      "--archive", archivePath,
      "--questions", resolve("public/task1/data/development/leaderboard_questions.jsonl"),
      "--expected-ids", resolve("public/task1/data/development/leaderboard_expected_ids.json"),
      "--release-manifest", resolve("public/task1/data/development/release_manifest.json"),
      "--release-manifest-sha256", submissionConfig.release_manifest_sha256,
      "--gold", goldPath,
      "--manifest", manifestPath,
      "--evaluation-version", submissionConfig.evaluation_version,
    ], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", PYTHONHASHSEED: "0" },
      timeout: 120_000,
      maxBuffer: 128 * 1024,
    });
    let scored;
    try {
      scored = JSON.parse(processResult.stdout);
    } catch {
      throw new Error("SCORER_OUTPUT_INVALID");
    }
    if (processResult.status === 2 && scored.status === "participant_error" && scored.error_code === "SUBMISSION_REJECTED") {
      return signedError(intake, "SUBMISSION_REJECTED", signingKeyB64);
    }
    if (
      processResult.status !== 0 ||
      scored.status !== "scored" ||
      scored.evaluation_version !== submissionConfig.evaluation_version ||
      scored.archive_sha256 !== decrypted.metadata.plaintext_sha256 ||
      scored.case_count !== submissionConfig.expected_rows ||
      !/^(?:0\.\d{6}|1\.000000)$/.test(scored.seen_fac) ||
      !/^(?:0\.\d{6}|1\.000000)$/.test(scored.seen_checkpoint)
    ) {
      throw new Error("SCORER_OUTPUT_INVALID");
    }
    return signResultRecord({
      ...base,
      status: "scored",
      seen_fac: scored.seen_fac,
      seen_checkpoint: scored.seen_checkpoint,
      case_count: scored.case_count,
    }, signingKeyB64);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const intakePath = args.get("intake");
  const envelopePath = args.get("envelope");
  const referencePath = args.get("reference");
  const outputPath = args.get("out");
  const privateKeyB64 = process.env.TASK1_PILOT_PRIVATE_KEY_PKCS8_B64;
  const signingKeyB64 = process.env.TASK1_PILOT_SIGNING_PRIVATE_KEY_PKCS8_B64;
  const token = process.env.GITHUB_TOKEN;
  if (!intakePath || !envelopePath || !referencePath || !outputPath || !privateKeyB64 || !signingKeyB64 || !token) {
    throw new Error("Missing development evaluator input or key");
  }
  const [intake, envelope, referenceEnvelope] = await Promise.all([
    readFile(resolve(intakePath), "utf8").then(JSON.parse),
    readFile(resolve(envelopePath), "utf8").then(JSON.parse),
    readFile(resolve(referencePath), "utf8").then(JSON.parse),
  ]);
  const result = await scoreDevelopment({ intake, envelope, referenceEnvelope, privateKeyB64, signingKeyB64, token });
  await writeFile(resolve(outputPath), `${JSON.stringify(result)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: result.status, issue_number: result.issue_number })}\n`);
}

if (process.argv[1]?.endsWith("score-development.mjs")) {
  main().catch(() => {
    process.stderr.write('{"status":"infrastructure_error","error_code":"SCORING_PIPELINE_FAILED"}\n');
    process.exitCode = 1;
  });
}
