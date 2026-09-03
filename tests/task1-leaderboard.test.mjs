import assert from "node:assert/strict";
import test from "node:test";
import {
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
