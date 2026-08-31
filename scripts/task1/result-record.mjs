import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import pilotConfig from "../../public/task1/pilot-config.json" with { type: "json" };

export const markerPrefix = "<!-- finreason-task1-pilot-result:v1 ";

const friendlyErrors = Object.freeze({
  ENVELOPE_DECRYPTION_FAILED: "The encrypted submission file is invalid or was prepared for a different pilot key.",
  GITHUB_LOGIN_MISMATCH: "The GitHub login inside the encrypted submission does not match the issue author.",
  ARCHIVE_SIZE_INVALID: "The predictions ZIP is empty or exceeds the pilot size limit.",
  ARCHIVE_MEMBER_COUNT_INVALID: "The ZIP must contain exactly one file.",
  ARCHIVE_MEMBER_NAME_INVALID: "The only ZIP member must be named predictions.jsonl.",
  ARCHIVE_SYMLINK_REJECTED: "Symbolic links are not accepted.",
  ARCHIVE_FEATURE_REJECTED: "Unsupported, encrypted, or ZIP64 archive features are not accepted.",
  ZIP_EXTRA_INVALID: "The ZIP contains a malformed extra-field record.",
  ARCHIVE_RATIO_INVALID: "The ZIP compression ratio exceeds the pilot limit.",
  ARCHIVE_INVALID: "The uploaded payload is not a valid ZIP archive.",
  PAYLOAD_SIZE_INVALID: "predictions.jsonl exceeds the pilot size limit.",
  PAYLOAD_UTF8_INVALID: "predictions.jsonl must be valid UTF-8.",
  PAYLOAD_NUL_REJECTED: "predictions.jsonl contains an invalid NUL byte.",
  PREDICTION_ROW_COUNT_INVALID: "The synthetic pilot requires exactly two prediction rows.",
  PREDICTION_JSON_INVALID: "One or more prediction rows are not valid JSON objects.",
  JSON_DUPLICATE_KEY: "Duplicate JSON keys are not accepted.",
  PREDICTION_FIELDS_INVALID: "A prediction row has missing or extra fields.",
  PREDICTION_CASE_ID_INVALID: "A synthetic case ID is missing, duplicated, or unknown.",
  PREDICTION_COVERAGE_INVALID: "The prediction file does not cover the complete synthetic pilot set.",
  FINAL_ANSWER_INVALID: "A final answer does not match the synthetic pilot value format.",
  STEPS_INVALID: "The steps field must be a JSON array.",
  STEP_FIELDS_INVALID: "A checkpoint row has missing or extra fields.",
  STEP_ID_INVALID: "A checkpoint ID is missing, duplicated, or unknown.",
  STEP_VALUE_INVALID: "A checkpoint value does not match the synthetic pilot value format.",
  STEP_COVERAGE_INVALID: "The prediction file does not cover all synthetic checkpoints.",
});

const commonFields = [
  "schema_version",
  "status",
  "evaluation_version",
  "repository",
  "issue_number",
  "issue_node_id",
  "issue_created_at",
  "actor_id",
  "github_login",
];
const signatureFields = [
  "signature_algorithm",
  "signing_key_fingerprint_sha256",
  "signature_b64",
];
const scoredFields = [...commonFields, "seen_fac", "seen_checkpoint", "case_count"];
const errorFields = [...commonFields, "error_code"];

function exactFields(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("RESULT_INVALID");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((field, index) => field !== wanted[index])) {
    throw new Error("RESULT_INVALID");
  }
}

function isIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isScore(value) {
  return typeof value === "string" && /^(?:0\.\d{6}|1\.000000)$/.test(value);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function signingOptions(options = {}) {
  return {
    publicKeySpkiB64: options.publicKeySpkiB64 ?? pilotConfig.signing_public_key_spki_b64,
    fingerprintSha256:
      options.fingerprintSha256 ?? pilotConfig.signing_key_fingerprint_sha256,
  };
}

function validateUnsignedResult(record) {
  const expectedFields = record?.status === "scored" ? scoredFields : errorFields;
  exactFields(record, expectedFields);
  if (
    record.schema_version !== "finreason.task1.github-pilot-result/1.0.0" ||
    record.evaluation_version !== pilotConfig.evaluation_version ||
    record.repository !== pilotConfig.repository ||
    !Number.isInteger(record.issue_number) ||
    record.issue_number < 1 ||
    !Number.isInteger(record.actor_id) ||
    record.actor_id < 1 ||
    typeof record.issue_node_id !== "string" ||
    !/^I_[A-Za-z0-9_-]+$/.test(record.issue_node_id) ||
    !isIsoTimestamp(record.issue_created_at) ||
    typeof record.github_login !== "string" ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(record.github_login)
  ) {
    throw new Error("RESULT_INVALID");
  }
  if (record.status === "scored") {
    if (!isScore(record.seen_fac) || !isScore(record.seen_checkpoint) || record.case_count !== 2) {
      throw new Error("RESULT_INVALID");
    }
  } else if (record.status === "participant_error") {
    if (typeof record.error_code !== "string" || !friendlyErrors[record.error_code]) {
      throw new Error("RESULT_INVALID");
    }
  } else {
    throw new Error("RESULT_INVALID");
  }
  return record;
}

function unsignedRecord(record) {
  const {
    signature_algorithm: _signatureAlgorithm,
    signing_key_fingerprint_sha256: _fingerprint,
    signature_b64: _signature,
    ...unsigned
  } = record;
  return unsigned;
}

export function signResultRecord(record, privateKeyPkcs8B64, options = {}) {
  validateUnsignedResult(record);
  if (typeof privateKeyPkcs8B64 !== "string") throw new Error("RESULT_SIGNING_KEY_INVALID");
  const expected = signingOptions(options);
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyPkcs8B64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const publicDer = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  const observedFingerprint = createHash("sha256").update(publicDer).digest("hex");
  if (
    publicDer.toString("base64") !== expected.publicKeySpkiB64 ||
    observedFingerprint !== expected.fingerprintSha256
  ) {
    throw new Error("RESULT_SIGNING_KEY_MISMATCH");
  }
  const signature = cryptoSign(null, Buffer.from(canonicalJson(record), "utf8"), privateKey);
  return {
    ...record,
    signature_algorithm: "Ed25519",
    signing_key_fingerprint_sha256: expected.fingerprintSha256,
    signature_b64: signature.toString("base64"),
  };
}

export function validateResultRecord(record, options = {}) {
  const expectedFields = record?.status === "scored"
    ? [...scoredFields, ...signatureFields]
    : [...errorFields, ...signatureFields];
  exactFields(record, expectedFields);
  const expected = signingOptions(options);
  if (
    record.signature_algorithm !== "Ed25519" ||
    record.signing_key_fingerprint_sha256 !== expected.fingerprintSha256 ||
    typeof record.signature_b64 !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(record.signature_b64)
  ) {
    throw new Error("RESULT_SIGNATURE_INVALID");
  }
  const unsigned = validateUnsignedResult(unsignedRecord(record));
  const publicDer = Buffer.from(expected.publicKeySpkiB64, "base64");
  const observedFingerprint = createHash("sha256").update(publicDer).digest("hex");
  if (observedFingerprint !== expected.fingerprintSha256) throw new Error("RESULT_SIGNATURE_INVALID");
  const publicKey = createPublicKey({ key: publicDer, format: "der", type: "spki" });
  const valid = cryptoVerify(
    null,
    Buffer.from(canonicalJson(unsigned), "utf8"),
    publicKey,
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
    const encoded = body.slice(start + markerPrefix.length, end);
    const record = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return validateResultRecord(record, options);
  } catch {
    return null;
  }
}

export function renderResultComment(record, options = {}) {
  validateResultRecord(record, options);
  const marker = encodeResultMarker(record, options);
  const leaderboardUrl = "https://the-finai.github.io/IEEE-bigdata-cup/task1/pilot/leaderboard/";
  if (record.status === "scored") {
    return `${marker}\n\n## Task 1 GitHub-only pilot result\n\n| Metric | Score |\n| --- | ---: |\n| Seen FAC | \`${record.seen_fac}\` |\n| Seen checkpoint | \`${record.seen_checkpoint}\` |\n\n[View the synthetic pilot leaderboard](${leaderboardUrl})\n\nThis confirms the GitHub upload and automatic scoring path only. It is not an official FinReason Cup score.`;
  }
  return `${marker}\n\n## Task 1 GitHub-only pilot result\n\nThe synthetic submission was not scored: ${friendlyErrors[record.error_code]}\n\nCorrect the file and create a new pilot submission issue. This result is not an official FinReason Cup score.`;
}
