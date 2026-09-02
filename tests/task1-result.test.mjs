import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import config from "../config/task1-evaluator.json" with { type: "json" };
import { buildLeaderboard, resultMatchesIssue } from "../scripts/task1/build-leaderboard.mjs";
import { publishResult, validatePublishEvent } from "../scripts/task1/publish-result.mjs";
import {
  decodeResultMarker,
  encodeResultMarker,
  renderResultComment,
  signResultRecord,
} from "../scripts/task1/result-record.mjs";
import { evaluateSubmissionPolicy, makeSubmissionContentTag } from "../scripts/task1/score-development.mjs";

const keys = generateKeyPairSync("ed25519");
const publicDer = keys.publicKey.export({ format: "der", type: "spki" });
const privateKeyB64 = keys.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const verification = {
  publicKeySpkiB64: publicDer.toString("base64"),
  fingerprintSha256: createHash("sha256").update(publicDer).digest("hex"),
};
const hashA = "a".repeat(64);

function unsignedBase(overrides = {}) {
  const issueCreatedAt = overrides.issue_created_at ?? "2026-11-15T12:00:00Z";
  const actorId = overrides.actor_id ?? 10;
  const teamId = `team-gh-${actorId}`;
  const contentTag = overrides.submission_content_tag_sha256 ?? hashA;
  return {
    schema_version: "finreason.task1.github-development-result/1.0.0",
    status: "scored",
    phase: config.phase,
    evaluation_version: config.evaluation_version,
    dataset_version: config.dataset_version,
    release_version: config.release_version,
    repository: config.repository,
    repository_id: config.repository_id,
    issue_number: 1,
    issue_node_id: "I_1",
    issue_created_at: issueCreatedAt,
    actor_id: actorId,
    github_login: "TeamOne",
    team_id: teamId,
    accepted_at: issueCreatedAt,
    envelope_sha256: "b".repeat(64),
    event_sha256: "c".repeat(64),
    release_manifest_sha256: config.release_manifest_sha256,
    questions_sha256: config.questions_sha256,
    expected_ids_sha256: config.expected_ids_sha256,
    reference_envelope_sha256: config.reference_envelope_sha256,
    workflow_run_id: 123,
    workflow_run_attempt: 1,
    workflow_sha: "d".repeat(40),
    submission_deadline_exclusive: config.submission_deadline_exclusive,
    submission_id: `dev-${issueCreatedAt.replace(/[-:]/g, "")}-${teamId}-${contentTag}`,
    client_submission_id: "11111111-1111-4111-8111-111111111111",
    submission_content_tag_sha256: contentTag,
    seen_fac: "0.500000",
    seen_checkpoint: "1.000000",
    case_count: 580,
    ...overrides,
  };
}

function scored(overrides = {}) {
  return signResultRecord(unsignedBase(overrides), privateKeyB64, verification);
}

function participantError(errorCode, overrides = {}) {
  const base = unsignedBase(overrides);
  for (const field of ["submission_id", "client_submission_id", "submission_content_tag_sha256", "seen_fac", "seen_checkpoint", "case_count"]) {
    delete base[field];
  }
  return signResultRecord({ ...base, status: "participant_error", error_code: errorCode }, privateKeyB64, verification);
}

function issueFor(record) {
  return {
    number: record.issue_number,
    node_id: record.issue_node_id,
    created_at: record.issue_created_at,
    user: { id: record.actor_id, login: record.github_login },
  };
}

test("publishes one signed aggregate-only record with a keyed replay tag", () => {
  const rawHash = "e".repeat(64);
  const tag = makeSubmissionContentTag(rawHash, 10, privateKeyB64);
  assert.equal(tag, makeSubmissionContentTag(rawHash, 10, privateKeyB64));
  assert.notEqual(tag, rawHash);
  assert.notEqual(tag, makeSubmissionContentTag("f".repeat(64), 10, privateKeyB64));
  assert.notEqual(tag, makeSubmissionContentTag(rawHash, 20, privateKeyB64));

  const record = scored({ submission_content_tag_sha256: tag });
  const marker = encodeResultMarker(record, verification);
  const comment = renderResultComment(record, verification);
  assert.deepEqual(decodeResultMarker(marker, verification), record);
  assert.match(comment, /SeenFAC/);
  assert.match(comment, /development leaderboard/);
  assert.doesNotMatch(comment, new RegExp(rawHash));
  for (const privateField of ["plaintext_sha256", "archive_sha256", "predictions_jsonl_sha256"]) {
    assert.equal(privateField in record, false);
  }
  assert.throws(() => encodeResultMarker({ ...record, seen_fac: "1.000000" }, verification), /RESULT_SIGNATURE_INVALID/);
});

test("enforces the exclusive deadline, replay, daily quota, and total quota", () => {
  const metadata = { submission_content_tag_sha256: hashA, client_submission_id: "11111111-1111-4111-8111-111111111111" };
  const intake = { issue_number: 50, issue_created_at: "2026-11-16T11:59:59Z", actor_id: 10 };
  assert.deepEqual(evaluateSubmissionPolicy([], intake, metadata), {});
  assert.deepEqual(evaluateSubmissionPolicy([], { ...intake, issue_created_at: "2026-11-16T12:00:00Z" }, metadata), { error: "SUBMISSION_DEADLINE_CLOSED" });
  assert.deepEqual(evaluateSubmissionPolicy([unsignedBase()], intake, metadata), { error: "REPLAY_REJECTED" });

  const attempts = [1, 2].map((issue, index) => unsignedBase({
    issue_number: issue,
    issue_node_id: `I_${issue}`,
    issue_created_at: `2026-11-16T10:0${index}:00Z`,
    submission_content_tag_sha256: `${issue}`.repeat(64),
    client_submission_id: `00000000-0000-4000-8000-${String(issue).padStart(12, "0")}`,
  }));
  assert.deepEqual(evaluateSubmissionPolicy(attempts, intake, metadata), { error: "DAILY_QUOTA_EXCEEDED" });
  const total = Array.from({ length: 40 }, (_, index) => ({
    ...attempts[0], issue_number: index + 1, accepted_at: `2026-10-${String((index % 20) + 1).padStart(2, "0")}T10:00:00Z`,
    submission_content_tag_sha256: createHash("sha256").update(String(index)).digest("hex"),
    client_submission_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  }));
  assert.deepEqual(evaluateSubmissionPolicy(total, intake, metadata), { error: "TOTAL_QUOTA_EXCEEDED" });
});

test("builds best-per-actor shared ranks and excludes organizer smoke actor", () => {
  const records = [
    scored(),
    scored({ issue_number: 2, issue_node_id: "I_2", issue_created_at: "2026-11-15T12:01:00Z", seen_fac: "0.900000", submission_content_tag_sha256: "2".repeat(64) }),
    scored({ issue_number: 3, issue_node_id: "I_3", issue_created_at: "2026-11-15T12:02:00Z", actor_id: 20, github_login: "TeamTwo", seen_fac: "0.900000", submission_content_tag_sha256: "3".repeat(64) }),
    scored({ issue_number: 4, issue_node_id: "I_4", issue_created_at: "2026-11-15T12:03:00Z", actor_id: 34633896, github_login: "ZhuohanX", seen_fac: "1.000000", submission_content_tag_sha256: "4".repeat(64) }),
  ];
  const leaderboard = buildLeaderboard(records, verification);
  assert.equal(leaderboard.rows.length, 2);
  assert.equal(leaderboard.rows[0].rank, 1);
  assert.equal(leaderboard.rows[1].rank, 1);
  assert.equal(leaderboard.rows.some((row) => row.team_id === "team-gh-34633896"), false);
  assert.equal(leaderboard.rows.find((row) => row.team_id === "team-gh-10").submission_id, records[1].submission_id);
});

test("binds publication to the issue and closes and locks after one comment", async () => {
  const record = scored();
  const event = { action: "opened", repository: { id: config.repository_id, full_name: config.repository }, issue: issueFor(record) };
  assert.equal(resultMatchesIssue(record, event.issue), true);
  assert.equal(validatePublishEvent(record, event, verification), record);
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method, body: options.body });
    if (url.includes("/comments?")) return Response.json([]);
    if (options.method === "PUT") return new Response(null, { status: 204 });
    return Response.json({});
  };
  const outcome = await publishResult({ record, event, token: "token", fetchImpl, verification });
  assert.equal(outcome.status, "published");
  assert.equal(requests.filter((request) => request.method === "POST" && request.url.endsWith("/comments")).length, 1);
  assert.equal(requests.some((request) => request.method === "PATCH" && request.url.endsWith("/issues/1")), true);
  assert.equal(requests.some((request) => request.method === "PUT" && request.url.endsWith("/issues/1/lock")), true);

  const rejection = participantError("SUBMISSION_REJECTED");
  assert.match(renderResultComment(rejection, verification), /not scored/);
});
