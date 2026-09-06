// tests/task3-leaderboard.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  TASK3_LEADERBOARD_SCHEMA_VERSION,
  parseDevelopmentLeaderboard,
  fetchDevelopmentLeaderboard,
} from "../lib/task3-leaderboard.mjs";

function row(over = {}) {
  return {
    rank: 1, team_name: "Example Team",
    acc: "48.19", ser: "0.00", eer: "30.12", cer: "21.69",
    accepted_at: "2026-09-05T12:00:00Z",
    ...over,
  };
}
function payload(rows, over = {}) {
  return {
    schema_version: TASK3_LEADERBOARD_SCHEMA_VERSION,
    phase: "development", basis: "official", rows,
    ...over,
  };
}

test("the schema version is frozen", () => {
  assert.equal(TASK3_LEADERBOARD_SCHEMA_VERSION, "finreason.task3.development-leaderboard/1.0.0");
});

test("parses a canonical payload", () => {
  const board = parseDevelopmentLeaderboard(payload([row()]));
  assert.equal(board.phase, "development");
  assert.equal(board.basis, "official");
  assert.deepEqual(board.rows[0], {
    rank: 1, teamName: "Example Team",
    acc: "48.19", ser: "0.00", eer: "30.12", cer: "21.69",
    acceptedAt: "2026-09-05T12:00:00Z",
  });
});

test("accepts an empty board", () => {
  assert.deepEqual(parseDevelopmentLeaderboard(payload([])).rows, []);
});

test("accepts the degraded basis", () => {
  assert.equal(parseDevelopmentLeaderboard(payload([row()], { basis: "deterministic" })).basis,
    "deterministic");
});

test("rejects an unknown basis", () => {
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { basis: "provisional" })), /basis/);
});

test("rejects a wrong schema version, phase, or extra top-level key", () => {
  // All three throw the same guard message. Asserting on /schema/ or /phase/
  // would fail: the message is "Leaderboard must use
  // finreason.task3.development-leaderboard/1.0.0.", which contains neither.
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { schema_version: "x/2.0.0" })), /must use/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { phase: "test" })), /must use/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { extra: 1 })), /must use/);
});

test("rejects a row with a missing or extra field", () => {
  const missing = row(); delete missing.cer;
  assert.throws(() => parseDevelopmentLeaderboard(payload([missing])), /fields/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ receipt_id: "R-1" })])), /fields/);
});

test("rejects scores that are not two-decimal percentages", () => {
  for (const bad of ["0.481900", "48.1", "48.190", "-1.00", "101.00", "abc", 48.19, "05.00", "00.00"]) {
    assert.throws(() => parseDevelopmentLeaderboard(payload([row({ acc: bad })])), /invalid/i,
      `accepted ${bad}`);
  }
});

test("accepts the full percentage range", () => {
  for (const good of ["0.00", "4.52", "48.19", "99.99", "100.00"]) {
    assert.equal(parseDevelopmentLeaderboard(payload([row({ acc: good })])).rows[0].acc, good);
  }
});

test("orders by accuracy NUMERICALLY, not as text", () => {
  // 90.00 and 9.00 is the pair where the two orderings genuinely disagree:
  // numerically 90.00 outranks 9.00, but as text "9.00" sorts BEFORE "90.00",
  // because "." (46) is below "0" (48). A pair like 48.19 vs 9.00 proves
  // nothing here -- "4" < "9" makes both comparisons agree.
  const correct = [
    row({ rank: 1, team_name: "Ninety", acc: "90.00" }),
    row({ rank: 2, team_name: "Nine", acc: "9.00" }),
  ];
  assert.equal(parseDevelopmentLeaderboard(payload(correct)).rows.length, 2);

  const inverted = [
    row({ rank: 1, team_name: "Nine", acc: "9.00" }),
    row({ rank: 2, team_name: "Ninety", acc: "90.00" }),
  ];
  assert.throws(() => parseDevelopmentLeaderboard(payload(inverted)), /rank or order/);
});

test("breaks equal accuracy by lower calculation error rate", () => {
  const ok = [row({ rank: 1, team_name: "Better", acc: "50.00", cer: "10.00" }),
              row({ rank: 2, team_name: "Worse", acc: "50.00", cer: "30.00" })];
  assert.equal(parseDevelopmentLeaderboard(payload(ok)).rows[1].teamName, "Worse");

  const bad = [row({ rank: 1, team_name: "Worse", acc: "50.00", cer: "30.00" }),
               row({ rank: 2, team_name: "Better", acc: "50.00", cer: "10.00" })];
  assert.throws(() => parseDevelopmentLeaderboard(payload(bad)), /rank or order/);
});

test("accepts shared ranks for identical score tuples", () => {
  const rows = [row({ rank: 1, team_name: "A" }), row({ rank: 1, team_name: "B" })];
  assert.deepEqual(parseDevelopmentLeaderboard(payload(rows)).rows.map((r) => r.rank), [1, 1]);
});

test("rejects a rank that does not skip after a tie", () => {
  const rows = [row({ rank: 1, team_name: "A" }), row({ rank: 1, team_name: "B" }),
                row({ rank: 2, team_name: "C", acc: "10.00" })];
  assert.throws(() => parseDevelopmentLeaderboard(payload(rows)), /rank or order/);
});

test("rejects a malformed team name or timestamp", () => {
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ team_name: "  padded  " })])), /team_name/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ team_name: "" })])), /team_name/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ accepted_at: "2026-09-05T12:00:00.5Z" })])), /accepted_at/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ accepted_at: "2026-09-05 12:00:00" })])), /accepted_at/);
});

test("fetch validates, bounds, and times out", async () => {
  const ok = await fetchDevelopmentLeaderboard("https://x.hf.space/api/leaderboard", {
    fetchImpl: async () => new Response(JSON.stringify(payload([row()])), {
      status: 200, headers: { "content-type": "application/json" },
    }),
  });
  assert.equal(ok.rows.length, 1);

  await assert.rejects(
    fetchDevelopmentLeaderboard("https://x.hf.space/api/leaderboard", {
      fetchImpl: async () => new Response("nope", { status: 500 }),
    }),
    /returned 500/,
  );

  await assert.rejects(
    fetchDevelopmentLeaderboard("https://x.hf.space/api/leaderboard", {
      fetchImpl: async () => new Response(JSON.stringify(payload([row()])), {
        status: 200, headers: { "content-length": String(2 * 1024 * 1024) },
      }),
    }),
    /too large/,
  );

  await assert.rejects(
    fetchDevelopmentLeaderboard("https://x.hf.space/api/leaderboard", {
      fetchImpl: async () => new Response("{", { status: 200 }),
    }),
    /not valid JSON/,
  );
});
