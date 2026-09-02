import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };

export const markerPrefix = "<!-- finreason-task1-development-result:v1 ";

const friendlyErrors = Object.freeze({
  ENVELOPE_DECRYPTION_FAILED: "The encrypted file is invalid or was prepared for a different release key.",
  GITHUB_LOGIN_MISMATCH: "The GitHub login inside the encrypted submission does not match the issue author.",
  SUBMISSION_REJECTED: "The ZIP does not satisfy the exact 580-row V4 submission contract.",
  REPLAY_REJECTED: "This submission content or client submission ID was already accepted.",
  DAILY_QUOTA_EXCEEDED: "This GitHub actor has reached the limit of 2 accepted development submissions for this UTC day.",
  TOTAL_QUOTA_EXCEEDED: "This GitHub actor has reached the limit of 40 accepted development submissions.",
  SUBMISSION_DEADLINE_CLOSED: "The issue was created after the published submission deadline.",
});

const commonFields = [
  "schema_version",
  "status",
  "phase",
  "evaluation_version",
  "dataset_version",
  "release_version",
  "repository",
  "repository_id",
  "issue_number",
  "issue_node_id",
  "issue_created_at",
  "actor_id",
  "github_login",
  "team_id",
  "accepted_at",
  "envelope_sha256",
  "event_sha256",
  "release_manifest_sha256",
  "questions_sha256",
  "expected_ids_sha256",
  "reference_envelope_sha256",
  "workflow_run_id",
  "workflow_run_attempt",
  "workflow_sha",
  "submission_deadline_exclusive",
  "signature_algorithm",
  "signing_key_fingerprint_sha256",
];
const scoredFields = [
  ...commonFields,
  "submission_id",
  "client_submission_id",
  "submission_content_tag_sha256",
  "seen_fac",
  "seen_checkpoint",
  "case_count",
];
const errorFields = [...commonFields, "error_code"];

function exactFields(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("RESULT_INVALID");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((field, index) => field !== wanted[index])) {
    throw new Error("RESULT_INVALID");
  }
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function isTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().replace(".000Z", "Z") === value;
}

function isSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isScore(value) {
  return typeof value === "string" && /^(?:0\.\d{6}|1\.000000)$/.test(value);
}

function publicKeyOptions(options = {}) {
  return {
    publicKeySpkiB64: options.publicKeySpkiB64 ?? submissionConfig.signing_public_key_spki_b64,
    fingerprintSha256: options.fingerprintSha256 ?? submissionConfig.signing_key_fingerprint_sha256,
  };
}

function unsignedRecord(record) {
  const { signature_b64: _signature, ...unsigned } = record;
  return unsigned;
}

function validateUnsignedResult(record, expectedFingerprint = submissionConfig.signing_key_fingerprint_sha256) {
  exactFields(record, record?.status === "scored" ? scoredFields : errorFields);
  const expectedTeamId = `team-gh-${record.actor_id}`;
  if (
    record.schema_version !== "finreason.task1.github-development-result/1.0.0" ||
    record.phase !== submissionConfig.phase ||
    record.evaluation_version !== submissionConfig.evaluation_version ||
    record.dataset_version !== submissionConfig.dataset_version ||
    record.release_version !== submissionConfig.release_version ||
    record.repository !== submissionConfig.repository ||
    record.repository_id !== submissionConfig.repository_id ||
    record.release_manifest_sha256 !== submissionConfig.release_manifest_sha256 ||
    record.questions_sha256 !== submissionConfig.questions_sha256 ||
    record.expected_ids_sha256 !== submissionConfig.expected_ids_sha256 ||
    record.reference_envelope_sha256 !== submissionConfig.reference_envelope_sha256 ||
    record.submission_deadline_exclusive !== submissionConfig.submission_deadline_exclusive ||
    !Number.isInteger(record.issue_number) || record.issue_number < 1 ||
    typeof record.issue_node_id !== "string" || !/^I_[A-Za-z0-9_-]+$/.test(record.issue_node_id) ||
    !Number.isInteger(record.actor_id) || record.actor_id < 1 ||
    typeof record.github_login !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(record.github_login) ||
    record.team_id !== expectedTeamId ||
    !isTimestamp(record.issue_created_at) || record.accepted_at !== record.issue_created_at ||
    !isSha256(record.envelope_sha256) || !isSha256(record.event_sha256) ||
    !Number.isInteger(record.workflow_run_id) || record.workflow_run_id < 1 ||
    !Number.isInteger(record.workflow_run_attempt) || record.workflow_run_attempt < 1 ||
    typeof record.workflow_sha !== "string" || !/^[0-9a-f]{40}$/.test(record.workflow_sha) ||
    record.signature_algorithm !== "Ed25519" ||
    record.signing_key_fingerprint_sha256 !== expectedFingerprint
  ) {
    throw new Error("RESULT_INVALID");
  }
  if (record.status === "scored") {
    const expectedSubmissionId = `dev-${record.accepted_at.replace(/[-:]/g, "")}-${expectedTeamId}-${record.submission_content_tag_sha256}`;
    if (
      typeof record.client_submission_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.client_submission_id) ||
      !isSha256(record.submission_content_tag_sha256) ||
      record.submission_id !== expectedSubmissionId ||
      !isScore(record.seen_fac) ||
      !isScore(record.seen_checkpoint) ||
      record.case_count !== submissionConfig.expected_rows
    ) {
      throw new Error("RESULT_INVALID");
    }
  } else if (record.status === "participant_error") {
    if (!friendlyErrors[record.error_code]) throw new Error("RESULT_INVALID");
  } else {
    throw new Error("RESULT_INVALID");
  }
  return record;
}

export function signResultRecord(record, privateKeyPkcs8B64, options = {}) {
  const expected = publicKeyOptions(options);
  const signable = {
    ...record,
    signature_algorithm: "Ed25519",
    signing_key_fingerprint_sha256: expected.fingerprintSha256,
  };
  validateUnsignedResult(signable, expected.fingerprintSha256);
  const privateKey = createPrivateKey({ key: Buffer.from(privateKeyPkcs8B64, "base64"), format: "der", type: "pkcs8" });
  const publicDer = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  if (
    publicDer.toString("base64") !== expected.publicKeySpkiB64 ||
    createHash("sha256").update(publicDer).digest("hex") !== expected.fingerprintSha256
  ) {
    throw new Error("RESULT_SIGNING_KEY_MISMATCH");
  }
  return {
    ...signable,
    signature_b64: cryptoSign(null, Buffer.from(canonicalJson(signable), "utf8"), privateKey).toString("base64"),
  };
}

export function validateResultRecord(record, options = {}) {
  exactFields(record, [...(record?.status === "scored" ? scoredFields : errorFields), "signature_b64"]);
  const expected = publicKeyOptions(options);
  const unsigned = validateUnsignedResult(unsignedRecord(record), expected.fingerprintSha256);
  if (record.signing_key_fingerprint_sha256 !== expected.fingerprintSha256 || typeof record.signature_b64 !== "string") {
    throw new Error("RESULT_SIGNATURE_INVALID");
  }
  const publicDer = Buffer.from(expected.publicKeySpkiB64, "base64");
  if (createHash("sha256").update(publicDer).digest("hex") !== expected.fingerprintSha256) {
    throw new Error("RESULT_SIGNATURE_INVALID");
  }
  const valid = cryptoVerify(
    null,
    Buffer.from(canonicalJson(unsigned), "utf8"),
    createPublicKey({ key: publicDer, format: "der", type: "spki" }),
    Buffer.from(record.signature_b64, "base64"),
  );
  if (!valid) throw new Error("RESULT_SIGNATURE_INVALID");
  return record;
}

export function encodeResultMarker(record, options = {}) {
  validateResultRecord(record, options);
  return `${markerPrefix}${Buffer.from(JSON.stringify(record)).toString("base64url")} -->`;
}

export function decodeResultMarker(body, options = {}) {
  if (typeof body !== "string") return null;
  const start = body.indexOf(markerPrefix);
  if (start < 0 || body.indexOf(markerPrefix, start + markerPrefix.length) >= 0) return null;
  const end = body.indexOf(" -->", start + markerPrefix.length);
  if (end < 0) return null;
  try {
    return validateResultRecord(JSON.parse(Buffer.from(body.slice(start + markerPrefix.length, end), "base64url").toString("utf8")), options);
  } catch {
    return null;
  }
}

export function renderResultComment(record, options = {}) {
  validateResultRecord(record, options);
  const marker = encodeResultMarker(record, options);
  if (record.status === "scored") {
    return `${marker}\n\n## Task 1 development result\n\n| Metric | Score |\n| --- | ---: |\n| SeenFAC | \`${record.seen_fac}\` |\n| SeenCheckpoint | \`${record.seen_checkpoint}\` |\n\n[View the development leaderboard](https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/)\n\nThis signed result contains aggregate development metrics only. The encrypted attachment remains ciphertext.`;
  }
  return `${marker}\n\n## Task 1 development result\n\nThe submission was not scored: ${friendlyErrors[record.error_code]}\n\nCorrect the file and create a new development submission issue. The encrypted attachment remains ciphertext.`;
}
