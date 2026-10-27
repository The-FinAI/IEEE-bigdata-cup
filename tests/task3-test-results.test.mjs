// tests/task3-test-results.test.mjs
//
// The Test results are final and public: a defect here is a published wrong
// ranking. These tests check the committed data against the ordering rule the
// Development leaderboard has used all along, and check that the page states
// the things the data says are true.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const data = JSON.parse(
  await readFile(new URL("app/task3/leaderboard/test-results.json", root), "utf8"),
);

const RULES = ["DQC_US_0015", "DQC_US_0117", "DQC_US_0126"];
const PCT = /^\d{1,3}\.\d{2}$/;

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the schema version is frozen", () => {
  assert.equal(data.schema_version, "finreason.task3.test-results/1.0.0");
  assert.equal(data.phase, "test");
  assert.equal(data.basis, "official");
});

test("the basis names the judge that produced every score", () => {
  assert.equal(data.judge.provider, "openai");
  assert.equal(data.judge.model, "gpt-5-mini");
  assert.equal(data.judge.evaluation_version, "1.1");
  assert.match(data.gold_sha256, /^[0-9a-f]{64}$/);
  assert.equal(data.cases, 680);
});

test("ranks are 1..n with no gaps and no duplicates", () => {
  const ranks = data.rows.map((r) => r.rank);
  assert.deepEqual(ranks, data.rows.map((_, i) => i + 1));
  assert.equal(new Set(data.rows.map((r) => r.team_name)).size, data.rows.length);
});

test("the row count matches the team count the roster reports", () => {
  assert.equal(data.rows.length, data.counts.teams);
});

test("rows are ordered by ACC, then CER, EER, SER, then team name", () => {
  assert.deepEqual(data.tiebreak, ["acc", "cer", "eer", "ser", "team_name"]);
  const key = (r) => [-Number(r.acc), Number(r.cer), Number(r.eer), Number(r.ser)];
  for (let i = 1; i < data.rows.length; i += 1) {
    const a = key(data.rows[i - 1]);
    const b = key(data.rows[i]);
    let decided = false;
    for (let k = 0; k < a.length && !decided; k += 1) {
      assert.ok(a[k] <= b[k],
        `row ${i} ranks above row ${i + 1} but loses on ${data.tiebreak[k]}: ` +
        `${data.rows[i - 1].team_name} vs ${data.rows[i].team_name}`);
      if (a[k] < b[k]) decided = true;
    }
    if (!decided) {
      assert.ok(data.rows[i - 1].team_name.localeCompare(data.rows[i].team_name) <= 0,
        "a full tie must fall back to the team name");
    }
  }
});

test("every percentage is a two-decimal string, as the live board serves them", () => {
  for (const row of data.rows) {
    for (const field of ["acc", "ser", "eer", "cer", "parsing_success_rate"]) {
      assert.match(row[field], PCT, `${row.team_name}.${field} = ${row[field]}`);
    }
    for (const rule of RULES) {
      assert.match(row.per_rule[rule], PCT, `${row.team_name}.${rule}`);
    }
  }
});

test("the four rates account for every case", () => {
  for (const row of data.rows) {
    const total = ["acc", "ser", "eer", "cer"].reduce((s, f) => s + Number(row[f]), 0);
    assert.ok(Math.abs(total - 100) < 0.02,
      `${row.team_name}: ACC+SER+EER+CER = ${total.toFixed(2)}, not 100`);
  }
});

test("the per-rule case counts add up to the whole set", () => {
  assert.deepEqual(data.rules.map((r) => r.id), RULES);
  assert.equal(data.rules.reduce((s, r) => s + r.cases, 0), data.cases);
});

test("ties are symmetric and only ever between equal accuracies", () => {
  const byName = new Map(data.rows.map((r) => [r.team_name, r]));
  for (const row of data.rows) {
    for (const other of row.tied_with) {
      const peer = byName.get(other);
      assert.ok(peer, `${row.team_name} is tied with unknown team ${other}`);
      assert.equal(peer.acc, row.acc, `${row.team_name} and ${other} are not equal on ACC`);
      assert.ok(peer.tied_with.includes(row.team_name),
        `${other} does not report being tied with ${row.team_name}`);
    }
    const sameAcc = data.rows.filter(
      (r) => r.acc === row.acc && r.team_name !== row.team_name).map((r) => r.team_name);
    assert.deepEqual([...row.tied_with].sort(), sameAcc.sort(),
      `${row.team_name} must list every team on its accuracy`);
  }
});

test("a merged row names every alias it submitted under", () => {
  for (const row of data.rows) {
    if (!row.merged) continue;
    assert.ok(row.names_used.includes(row.team_name),
      `${row.team_name} must appear among its own names`);
    assert.ok(row.names_used.length >= 1);
  }
});

test("no row is a failed judge run published as a score", () => {
  // An all-zero result with zero parsing is a judge failure, not a submission
  // that scored nothing: a genuinely unreadable file comes back at SER 100.
  for (const row of data.rows) {
    const allZero = ["acc", "ser", "eer", "cer"].every((f) => Number(row[f]) === 0);
    assert.ok(!(allZero && Number(row.parsing_success_rate) === 0),
      `${row.team_name} looks like a failed judge run, not a score`);
  }
});

test("the published page shows the ranking and states how ties were broken", async () => {
  const page = await text("out/task3/leaderboard/index.html");
  // Team names reach the HTML escaped: "Tick & Tie" is written "Tick &amp; Tie".
  const escape = (value) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const row of data.rows) {
    assert.ok(page.includes(escape(row.team_name)), `the page omits ${row.team_name}`);
    assert.ok(page.includes(`${row.acc}%`), `the page omits ${row.team_name}'s ACC`);
  }
  for (const rule of RULES) {
    assert.ok(page.includes(rule), `the page omits ${rule}`);
  }
  assert.match(page, /gpt-5-mini/);
  assert.match(page, /calculation error rate/i);
});

test("the page no longer says Test scores are hidden", async () => {
  const page = await text("out/task3/leaderboard/index.html");
  assert.doesNotMatch(page, /stay hidden until the final results are released/i,
    "the final results are released; that sentence is now false");
});
