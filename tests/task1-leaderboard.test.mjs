import assert from "node:assert/strict";
import test from "node:test";
import {
  combineDevelopmentRankings,
  DEVELOPMENT_BASELINES,
  fetchDevelopmentLeaderboard,
  parseDevelopmentLeaderboard,
  TASK1_LEADERBOARD_SCHEMA_VERSION,
} from "../lib/task1-leaderboard.mjs";

function row(overrides = {}) {
  return {
    rank: 1,
    team_name: "Team One",
    final_answer_score: "0.900000",
    reasoning_steps_score: "0.800000",
    accepted_at: "2026-08-31T12:00:00Z",
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    schema_version: TASK1_LEADERBOARD_SCHEMA_VERSION,
    phase: "development",
    rows: [row()],
    ...overrides,
  };
}

test("ranks hosted development baselines with participants by their scores", () => {
  const participants = parseDevelopmentLeaderboard(payload({ rows: [
    row({
      team_name: "CPD",
      final_answer_score: "0.441429",
      reasoning_steps_score: "0.461746",
    }),
    row({
      rank: 2,
      team_name: "Middle Team",
      final_answer_score: "0.100000",
      reasoning_steps_score: "0.900000",
    }),
    row({
      rank: 3,
      team_name: "Lower Team",
      final_answer_score: "0.010000",
      reasoning_steps_score: "0.900000",
    }),
  ] })).rows;

  const combined = combineDevelopmentRankings(participants);
  assert.deepEqual(
    combined.map(({ teamDisplayName, displayRank, participantRank }) =>
      [teamDisplayName, displayRank, participantRank]),
    [
      ["CPD", 1, 1],
      ["Organizer Baseline", 2, null],
      ["Middle Team", 3, 2],
      ["Financial Rules", 4, null],
      ["Lower Team", 5, 3],
    ],
  );
  assert.equal(combined.find(({ teamDisplayName }) => teamDisplayName === "Lower Team").rank, 3);
});

test("uses the hosted baseline scores and acceptance times without participants", () => {
  const combined = combineDevelopmentRankings([]);
  assert.deepEqual(
    combined.map(({ id, seenFac, seenCheckpoint, acceptedAt, displayRank }) =>
      [id, seenFac, seenCheckpoint, acceptedAt, displayRank]),
    [
      ["baseline:B2", "0.234048", "0.555354", "2026-09-03T06:28:43Z", 1],
      ["baseline:B1", "0.020833", "0.011574", "2026-09-03T06:28:02Z", 2],
    ],
  );
});

test("shares rank only for both equal scores and orders tied names deterministically", () => {
  const participants = parseDevelopmentLeaderboard(payload({ rows: [
    row({
      team_name: "Higher Reasoning",
      final_answer_score: "0.234048",
      reasoning_steps_score: "0.600000",
    }),
    row({
      rank: 2,
      team_name: "Zulu",
      final_answer_score: "0.234048",
      reasoning_steps_score: "0.555354",
    }),
    row({
      rank: 2,
      team_name: "Alpha",
      final_answer_score: "0.234048",
      reasoning_steps_score: "0.555354",
    }),
  ] })).rows;
  const combined = combineDevelopmentRankings(participants);
  assert.deepEqual(
    combined.map(({ teamDisplayName, displayRank }) => [teamDisplayName, displayRank]),
    [
      ["Higher Reasoning", 1],
      ["Alpha", 2],
      ["Organizer Baseline", 2],
      ["Zulu", 2],
      ["Financial Rules", 5],
    ],
  );
  assert.deepEqual(combineDevelopmentRankings([...participants].reverse()), combined);
});

test("keeps zero-score participants and baseline-name collisions distinct", () => {
  const participants = parseDevelopmentLeaderboard(payload({ rows: [
    row({
      team_name: "Financial Rules",
      final_answer_score: "0.000000",
      reasoning_steps_score: "0.000000",
    }),
  ] })).rows;
  const combined = combineDevelopmentRankings(participants);
  const sameNameRows = combined.filter(({ teamDisplayName }) => teamDisplayName === "Financial Rules");
  assert.deepEqual(
    sameNameRows.map(({ id, kind, displayRank, participantRank }) =>
      [id, kind, displayRank, participantRank]),
    [
      ["baseline:B1", "baseline", 2, null],
      ["participant:Financial Rules", "participant", 3, 1],
    ],
  );
  assert.equal(combined.find(({ kind }) => kind === "participant").seenFac, "0.000000");
  assert.equal(combined.find(({ kind }) => kind === "participant").seenCheckpoint, "0.000000");
  assert.equal(new Set(combined.map(({ id }) => id)).size, combined.length);
});

test("leaves participants and baseline constants unchanged when combining", () => {
  const participants = parseDevelopmentLeaderboard(payload()).rows;
  const originalParticipants = structuredClone(participants);
  const originalBaselines = structuredClone(DEVELOPMENT_BASELINES);
  participants.forEach(Object.freeze);
  Object.freeze(participants);

  const combined = combineDevelopmentRankings(participants);
  assert.deepEqual(participants, originalParticipants);
  assert.deepEqual(DEVELOPMENT_BASELINES, originalBaselines);
  combined.find(({ kind }) => kind === "participant").teamDisplayName = "Changed";
  combined.find(({ kind }) => kind === "baseline").teamDisplayName = "Changed";
  assert.deepEqual(participants, originalParticipants);
  assert.deepEqual(DEVELOPMENT_BASELINES, originalBaselines);

  const participant = combineDevelopmentRankings(participants).find(({ kind }) => kind === "participant");
  assert.equal(participant.id, "participant:Team One");
  assert.equal(participant.rank, originalParticipants[0].rank);
});

test("parses the canonical Task 1 development leaderboard contract", () => {
  assert.equal(
    TASK1_LEADERBOARD_SCHEMA_VERSION,
    "finreason.task1.development-leaderboard/2.0.0",
  );
  const leaderboard = parseDevelopmentLeaderboard(payload());
  assert.equal(leaderboard.phase, "development");
  assert.equal(leaderboard.rows[0].teamDisplayName, "Team One");
  assert.equal(leaderboard.rows[0].seenCheckpoint, "0.800000");
});

test("allows an authoritative feed with no eligible rows", () => {
  const leaderboard = parseDevelopmentLeaderboard(payload({ rows: [] }));
  assert.deepEqual(leaderboard.rows, []);
});

test("accepts shared ranks and rejects wrong score order, non-canonical names, and extra fields", () => {
  const tied = row({
    team_name: "Team Two",
    accepted_at: "2026-08-31T12:01:00Z",
  });
  assert.equal(parseDevelopmentLeaderboard(payload({ rows: [row(), tied] })).rows[1].rank, 1);

  const unicodeTie = row({
    team_name: "Straße",
    accepted_at: "2026-08-31T12:02:00Z",
  });
  assert.equal(
    parseDevelopmentLeaderboard(payload({ rows: [unicodeTie, row()] })).rows.length,
    2,
  );

  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [row({ rank: 2 })] })),
    /rank or order/,
  );
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({
          rows: [
            row({
              final_answer_score: "0.700000",
              reasoning_steps_score: "0.700000",
            }),
            tied,
          ],
        }),
      ),
    /rank or order/,
  );
  for (const team_name of [
    " Team One",
    "Team One ",
    "Team  One",
    "Team\u00a0One",
    "Ｔｅａｍ One",
    "Team\u202eOne",
  ]) {
    assert.throws(
      () => parseDevelopmentLeaderboard(payload({ rows: [row({ team_name })] })),
      /team_name/,
    );
  }
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ internal_note: "private" })),
    /development-leaderboard/,
  );
  for (const privateField of [
    "email",
    "contact_email",
    "team_id",
    "submission_id",
    "receipt_id",
    "access_code",
    "team_key",
    "raw_submission",
    "test_score",
    "diagnostic",
  ]) {
    assert.throws(
      () =>
        parseDevelopmentLeaderboard(
          payload({ rows: [{ ...row(), [privateField]: "private" }] }),
        ),
      /wrong fields/,
    );
  }
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({ rows: [row({ final_answer_score: ["0.900000"] })] }),
      ),
    /invalid/,
  );
});

test("rejects legacy, final, and malformed canonical values", () => {
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({ schema_version: "finreason.task1.development-leaderboard/1.0.0" }),
      ),
    /development-leaderboard/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ phase: "final" })),
    /development-leaderboard/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ phase: "test" })),
    /development-leaderboard/,
  );
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({ rows: [row({ final_answer_score: "0.9" })] }),
      ),
    /invalid/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [row({ accepted_at: "yesterday" })] })),
    /accepted_at/,
  );
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({ rows: [row({ accepted_at: "2026-02-30T12:00:00Z" })] }),
      ),
    /accepted_at/,
  );
});

test("fetches, validates, and bounds the public leaderboard request", async () => {
  let requestOptions;
  const valid = await fetchDevelopmentLeaderboard(
    "https://task1-api.example.invalid/leaderboard.json",
    {
      fetchImpl: async (_url, options) => {
        requestOptions = options;
        return Response.json(payload());
      },
    },
  );
  assert.equal(valid.rows[0].teamDisplayName, "Team One");
  assert.equal(requestOptions.credentials, "omit");
  assert.deepEqual(requestOptions.headers, { Accept: "application/json" });

  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    }),
    /returned 503/,
  );
  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () => Response.json({ status: "untrusted" }),
    }),
    /development-leaderboard/,
  );
  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () =>
        new Response("{}", { headers: { "content-length": "1048577" } }),
    }),
    /too large/,
  );
  let pullCount = 0;
  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              pullCount += 1;
              controller.enqueue(new Uint8Array(pullCount === 1 ? 800_000 : 300_000));
              if (pullCount === 2) controller.close();
            },
          }),
        ),
    }),
    /too large/,
  );
  assert.equal(pullCount, 2);
  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      timeoutMs: 5,
      fetchImpl: async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          );
        }),
    }),
    /timed out/,
  );
});
