import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchDevelopmentLeaderboard,
  parseDevelopmentLeaderboard,
  TASK1_LEADERBOARD_SCHEMA_VERSION,
} from "../lib/task1-leaderboard.mjs";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

function row(overrides = {}) {
  return {
    rank: 1,
    team_id: "team-one",
    team_display_name: "Team One",
    seen_fac: "0.900000",
    seen_checkpoint: "0.800000",
    submission_id: `dev-20260831T120000Z-team-one-${hashA}`,
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
  const leaderboard = parseDevelopmentLeaderboard(payload());
  assert.equal(leaderboard.phase, "development");
  assert.equal(leaderboard.rows[0].teamId, "team-one");
  assert.equal(leaderboard.rows[0].teamDisplayName, "Team One");
  assert.equal(leaderboard.rows[0].seenCheckpoint, "0.800000");
});

test("allows an authoritative feed with no eligible rows", () => {
  const leaderboard = parseDevelopmentLeaderboard(payload({ rows: [] }));
  assert.deepEqual(leaderboard.rows, []);
});

test("accepts shared ranks and rejects wrong score order, duplicates, and extra fields", () => {
  const tied = row({
    team_id: "team-two",
    team_display_name: "Team Two",
    submission_id: `dev-20260831T120100Z-team-two-${hashB}`,
    accepted_at: "2026-08-31T12:01:00Z",
  });
  assert.equal(parseDevelopmentLeaderboard(payload({ rows: [row(), tied] })).rows[1].rank, 1);

  const unicodeTie = row({
    team_id: "team-strasse",
    team_display_name: "Straße",
    submission_id: `dev-20260831T120200Z-team-strasse-${hashB}`,
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
            row({ seen_fac: "0.700000", seen_checkpoint: "0.700000" }),
            tied,
          ],
        }),
      ),
    /rank or order/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [row(), row()] })),
    /invalid/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ internal_note: "private" })),
    /development-leaderboard/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [{ ...row(), email: "private@example.invalid" }] })),
    /wrong fields/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [row({ seen_fac: ["0.900000"] })] })),
    /invalid/,
  );
});

test("rejects pilot, final, and malformed canonical values", () => {
  assert.throws(
    () =>
      parseDevelopmentLeaderboard(
        payload({ schema_version: "finreason.task1.github-pilot-leaderboard/1.0.0" }),
      ),
    /development-leaderboard/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ phase: "final" })),
    /development-leaderboard/,
  );
  assert.throws(
    () => parseDevelopmentLeaderboard(payload({ rows: [row({ seen_fac: "0.9" })] })),
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
  const valid = await fetchDevelopmentLeaderboard(
    "https://task1-api.example.invalid/leaderboard.json",
    { fetchImpl: async () => Response.json(payload()) },
  );
  assert.equal(valid.rows[0].teamDisplayName, "Team One");

  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    }),
    /returned 503/,
  );
  await assert.rejects(
    fetchDevelopmentLeaderboard("https://task1-api.example.invalid/leaderboard.json", {
      fetchImpl: async () => Response.json({ status: "organizer-pilot" }),
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
