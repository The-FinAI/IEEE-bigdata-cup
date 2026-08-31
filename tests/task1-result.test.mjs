import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { buildLeaderboard, resultMatchesIssue } from "../scripts/task1/build-leaderboard.mjs";
import { publishResult, validatePublishEvent } from "../scripts/task1/publish-result.mjs";
import {
  decodeResultMarker,
  encodeResultMarker,
  renderResultComment,
  signResultRecord,
} from "../scripts/task1/result-record.mjs";

const signingKeys = generateKeyPairSync("ed25519");
const testPublicDer = signingKeys.publicKey.export({ format: "der", type: "spki" });
const testPrivateKeyB64 = signingKeys.privateKey
  .export({ format: "der", type: "pkcs8" })
  .toString("base64");
const verification = {
  publicKeySpkiB64: testPublicDer.toString("base64"),
  fingerprintSha256: createHash("sha256").update(testPublicDer).digest("hex"),
};

function scored(overrides = {}) {
  return signResultRecord({
    schema_version: "finreason.task1.github-pilot-result/1.0.0",
    status: "scored",
    evaluation_version: "task1-github-pilot-v1",
    repository: "The-FinAI/IEEE-bigdata-cup",
    issue_number: 1,
    issue_node_id: "I_1",
    issue_created_at: "2026-08-30T12:00:00Z",
    actor_id: 10,
    github_login: "TeamOne",
    seen_fac: "0.500000",
    seen_checkpoint: "1.000000",
    case_count: 2,
    ...overrides,
  }, testPrivateKeyB64, verification);
}

function participantError(errorCode) {
  return signResultRecord({
    schema_version: "finreason.task1.github-pilot-result/1.0.0",
    status: "participant_error",
    error_code: errorCode,
    evaluation_version: "task1-github-pilot-v1",
    repository: "The-FinAI/IEEE-bigdata-cup",
    issue_number: 1,
    issue_node_id: "I_1",
    issue_created_at: "2026-08-30T12:00:00Z",
    actor_id: 10,
    github_login: "TeamOne",
  }, testPrivateKeyB64, verification);
}

test("encodes one machine-readable aggregate result marker", () => {
  const record = scored();
  const marker = encodeResultMarker(record, verification);
  const comment = renderResultComment(record, verification);
  assert.deepEqual(decodeResultMarker(marker, verification), record);
  assert.match(comment, /Seen FAC/);
  assert.match(comment, /0\.500000/);
  assert.match(comment, /task1\/pilot\/leaderboard/);
  assert.doesNotMatch(comment, /predictions\.jsonl|pilot-001/);
  assert.equal("plaintext_sha256" in record, false);
  assert.equal("client_submission_id" in record, false);
  assert.equal("envelope_sha256" in record, false);

  const tampered = { ...record, seen_fac: "1.000000" };
  assert.throws(() => encodeResultMarker(tampered, verification), /RESULT_SIGNATURE_INVALID/);
});

test("builds best-per-account rows with attempts and shared ranks", () => {
  const records = [
    scored(),
    scored({
      issue_number: 2,
      issue_node_id: "I_2",
      issue_created_at: "2026-08-30T12:10:00Z",
      seen_fac: "1.000000",
    }),
    scored({
      issue_number: 3,
      issue_node_id: "I_3",
      issue_created_at: "2026-08-30T12:05:00Z",
      actor_id: 20,
      github_login: "TeamTwo",
      seen_fac: "1.000000",
    }),
  ];
  const leaderboard = buildLeaderboard(records, "2026-08-30T13:00:00Z");
  assert.equal(leaderboard.rows.length, 2);
  assert.equal(leaderboard.rows[0].rank, 1);
  assert.equal(leaderboard.rows[1].rank, 1);
  assert.equal(leaderboard.rows.find((row) => row.github_login === "TeamOne").attempts, 2);
  assert.equal(leaderboard.rows.find((row) => row.github_login === "TeamOne").last_submission_issue, 2);
});

test("publishes a signed malformed-ZIP-extra rejection", () => {
  const record = participantError("ZIP_EXTRA_INVALID");
  const comment = renderResultComment(record, verification);
  assert.match(comment, /malformed extra-field record/);
  assert.deepEqual(decodeResultMarker(comment, verification), record);
});

test("binds a signed result to the enclosing GitHub issue", () => {
  const record = scored();
  const issue = {
    number: 1,
    node_id: "I_1",
    created_at: "2026-08-30T12:00:00Z",
    user: { id: 10, login: "TeamOne" },
  };
  assert.equal(resultMatchesIssue(record, issue), true);
  assert.equal(resultMatchesIssue(record, { ...issue, number: 99 }), false);

  const event = {
    action: "opened",
    repository: { id: 1313988496, full_name: "The-FinAI/IEEE-bigdata-cup" },
    issue,
  };
  assert.equal(validatePublishEvent(record, event, verification), record);
  assert.throws(
    () => validatePublishEvent(record, { ...event, issue: { ...issue, number: 99 } }, verification),
    /RESULT_EVENT_MISMATCH/,
  );
});

test("treats an identical signed result comment as an idempotent rerun", async () => {
  const record = scored();
  const event = {
    action: "opened",
    repository: { id: 1313988496, full_name: "The-FinAI/IEEE-bigdata-cup" },
    issue: {
      number: 1,
      node_id: "I_1",
      created_at: "2026-08-30T12:00:00Z",
      user: { id: 10, login: "TeamOne" },
    },
  };
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method, body: options.body });
    if (url.includes("/comments?")) {
      return Response.json([
        { user: { login: "github-actions[bot]" }, body: renderResultComment(record, verification) },
      ]);
    }
    return Response.json([]);
  };
  const outcome = await publishResult({
    record,
    event,
    token: "test-token",
    fetchImpl,
    verification,
  });
  assert.equal(outcome.status, "already-published");
  assert.equal(requests.filter((request) => request.url.endsWith("/comments") && request.method === "POST").length, 0);
  assert.equal(requests.some((request) => request.url.endsWith("/dispatches")), false);
});
