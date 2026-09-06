# Task 3 Participant Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the public `/task3/` participant hub, submission guide, and development leaderboard to the FinReason Cup site, wired to the two Task 3 Hugging Face Spaces that are already live.

**Architecture:** Mirrors the existing `/task1/` route exactly — a thin `app/task3/` page layer over two framework-free `lib/task3-*.mjs` modules, one validating the Space URLs the site is allowed to link to, the other parsing the frozen leaderboard contract. The pages are statically exported; the leaderboard is the only client component and fetches its data at runtime.

**Tech Stack:** Next.js 16.2.12 static export, React 19, TypeScript, `node --test`. No new dependencies.

**Spec:** `/home/yw937/project_pi_hx235/yw937/finreason-task3-submission/docs/superpowers/specs/2026-09-05-task3-submission-site-design.md` (sections 4.3 "site", 8 "Public leaderboard contract", 9 "Privacy boundary")

## Global Constraints

- **Node is not on PATH.** Every command in this plan must be preceded by:
  `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH`
  Node 24.12.0, npm 11.6.2. `node_modules` is already installed. Never use a bare `node`/`npm` without that export.
- Repository: `/home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup`, branch `feat/task3-site` (already created off `task3/starter-kit`). **Never push** — this repo has a real GitHub remote (`The-FinAI/IEEE-bigdata-cup`).
- Baseline before any change: `npm test` passes with 12 tests. Never let that number go down.
- Leaderboard schema version, exactly: `finreason.task3.development-leaderboard/1.0.0`
- Payload keys, exactly four: `schema_version`, `phase`, `basis`, `rows`.
- Row keys, exactly seven: `rank`, `team_name`, `acc`, `ser`, `eer`, `cer`, `accepted_at`.
- `phase` is always `"development"`. `basis` is `"official"` or `"deterministic"`.
- **Scores are two-decimal percentage strings** (`"48.19"`, `"0.00"`, `"100.00"`) — NOT Task 1's `0`–`1` six-decimal form. Never rescale them.
- Ordering: ACC descending, then CER, EER, SER ascending, then team name ascending. Equal score tuples share a rank.
- Timestamps: RFC3339 UTC, trailing `Z`, no fractional seconds.
- Response cap: 1 MiB.
- The site publishes no participant data files, no gold answers, no contact emails, and no test-phase results.
- Live endpoints (already deployed and verified):
  - scoring Space: `https://yanadjenole-finreason-task3-development.hf.space`
  - test Space: `https://yanadjenole-finreason-task3-test.hf.space`
  - leaderboard API: `https://yanadjenole-finreason-task3-development.hf.space/api/leaderboard`
- Only organizer numbers actually measured may appear on the site. The one measured baseline is the dummy baseline (all values `"0"`), run against the live scoring Space on 2026-09-06:
  `ACC 0.00% · SER 0.00% · EER 95.48% · CER 4.52% · parsing 100.00% · n=332`
  per rule: `DQC_US_0015` n=110, `DQC_US_0117` n=120, `DQC_US_0126` n=102, all ACC 0.00%.

---

### Task 1: Public endpoint configuration

**Files:**
- Create: `lib/task3-public-config.mjs`
- Create: `lib/task3-public-config.d.mts`
- Test: `tests/task3-public-config.test.mjs`

**Interfaces:**
- Produces: `resolveTask3PublicConfig({ siteMode, scoringSpaceUrl, testSpaceUrl, leaderboardApiUrl, allowLocalHttp })` returning `{ siteMode, scoringSpace, testSpace, leaderboardApi }` where each endpoint is `{ state: "ready" | "missing" | "invalid", url: string | null }`. Throws on an invalid `siteMode`, and in `"final"` mode throws when any endpoint is not ready or the two Spaces are identical.

Note the naming difference from Task 1: Task 3's scoring Space serves BOTH the practice and development phases, so it is `scoringSpace`, not `developmentSpace`. Copying Task 1's name here would be actively misleading.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/task3-public-config.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { resolveTask3PublicConfig } from "../lib/task3-public-config.mjs";

const SCORING = "https://yanadjenole-finreason-task3-development.hf.space/";
const TEST_SPACE = "https://yanadjenole-finreason-task3-test.hf.space/";
const API = "https://yanadjenole-finreason-task3-development.hf.space/api/leaderboard";

test("development mode is safe when no endpoints are configured", () => {
  const config = resolveTask3PublicConfig({});
  assert.equal(config.siteMode, "development");
  assert.equal(config.scoringSpace.state, "missing");
  assert.equal(config.testSpace.state, "missing");
  assert.equal(config.leaderboardApi.state, "missing");
});

test("final mode accepts the two live Spaces and their leaderboard feed", () => {
  const config = resolveTask3PublicConfig({
    siteMode: "final",
    scoringSpaceUrl: SCORING,
    testSpaceUrl: TEST_SPACE,
    leaderboardApiUrl: API,
  });
  assert.equal(config.scoringSpace.state, "ready");
  assert.equal(config.testSpace.state, "ready");
  assert.equal(config.leaderboardApi.state, "ready");
});

test("final mode requires two distinct Spaces", () => {
  assert.throws(
    () => resolveTask3PublicConfig({
      siteMode: "final", scoringSpaceUrl: SCORING, testSpaceUrl: SCORING, leaderboardApiUrl: API,
    }),
    /two different isolated deployments/,
  );
});

test("final mode refuses to build with a missing endpoint", () => {
  assert.throws(
    () => resolveTask3PublicConfig({ siteMode: "final", scoringSpaceUrl: SCORING }),
    /missing/,
  );
});

test("rejects non-root and non-hf.space endpoints", () => {
  for (const bad of [
    "https://yanadjenole-finreason-task3-development.hf.space/submit",
    "http://yanadjenole-finreason-task3-development.hf.space/",
    "https://example.com/",
    "https://user:pw@yanadjenole-finreason-task3-development.hf.space/",
  ]) {
    const config = resolveTask3PublicConfig({ scoringSpaceUrl: bad });
    assert.equal(config.scoringSpace.state, "invalid", bad);
  }
});

test("the leaderboard feed must sit on the scoring Space origin at the canonical path", () => {
  const other = resolveTask3PublicConfig({
    siteMode: "development",
    scoringSpaceUrl: SCORING,
    leaderboardApiUrl: "https://yanadjenole-finreason-task3-test.hf.space/api/leaderboard",
  });
  assert.equal(other.leaderboardApi.state, "invalid");

  const wrongPath = resolveTask3PublicConfig({
    scoringSpaceUrl: SCORING,
    leaderboardApiUrl: "https://yanadjenole-finreason-task3-development.hf.space/api/board",
  });
  assert.equal(wrongPath.leaderboardApi.state, "invalid");

  const withQuery = resolveTask3PublicConfig({
    scoringSpaceUrl: SCORING,
    leaderboardApiUrl: `${API}?team=x`,
  });
  assert.equal(withQuery.leaderboardApi.state, "invalid");
});

test("localhost HTTP is accepted only in explicit local development", () => {
  const dev = resolveTask3PublicConfig({
    scoringSpaceUrl: "http://localhost:7860/", allowLocalHttp: true,
  });
  assert.equal(dev.scoringSpace.state, "ready");

  const prod = resolveTask3PublicConfig({
    scoringSpaceUrl: "http://localhost:7860/", allowLocalHttp: false,
  });
  assert.equal(prod.scoringSpace.state, "invalid");
});

test("an unknown site mode is rejected", () => {
  assert.throws(() => resolveTask3PublicConfig({ siteMode: "staging" }), /FINREASON_TASK3_SITE_MODE/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && node --test tests/task3-public-config.test.mjs`
Expected: FAIL — cannot find module `../lib/task3-public-config.mjs`

- [ ] **Step 3: Write the implementation**

```javascript
// lib/task3-public-config.mjs
const VALID_SITE_MODES = new Set(["development", "final"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const HF_SPACE_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.hf\.space$/;

function resolvePublicEndpoint(rawValue, allowLocalHttp) {
  const value = rawValue?.trim();
  if (!value) return { state: "missing", url: null };

  try {
    const url = new URL(value);
    const isLocalDevelopmentUrl =
      allowLocalHttp && url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname);

    if (
      (url.protocol !== "https:" && !isLocalDevelopmentUrl) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      return { state: "invalid", url: null };
    }
    return { state: "ready", url: url.toString() };
  } catch {
    return { state: "invalid", url: null };
  }
}

function resolveHfSpaceEndpoint(rawValue, allowLocalHttp) {
  const endpoint = resolvePublicEndpoint(rawValue, allowLocalHttp);
  if (endpoint.state !== "ready") return endpoint;

  const url = new URL(endpoint.url);
  const isLocalDevelopmentUrl =
    allowLocalHttp && url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname);
  const isHfSpaceRoot =
    url.protocol === "https:" &&
    HF_SPACE_HOSTNAME.test(url.hostname) &&
    !url.port &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;

  return isLocalDevelopmentUrl || isHfSpaceRoot
    ? endpoint
    : { state: "invalid", url: null };
}

function resolveLeaderboardEndpoint(rawValue, scoringSpace, allowLocalHttp) {
  const endpoint = resolvePublicEndpoint(rawValue, allowLocalHttp);
  if (endpoint.state !== "ready") return endpoint;
  if (scoringSpace.state !== "ready" || !scoringSpace.url) {
    return { state: "invalid", url: null };
  }

  const url = new URL(endpoint.url);
  // The feed must come from the same deployment that produced the scores it
  // publishes. A feed on another origin could be anything.
  const isSameOrigin = url.origin === new URL(scoringSpace.url).origin;
  const isCanonicalPath = url.pathname === "/api/leaderboard";
  const hasPubliclySerializedParameters = Boolean(url.search || url.hash);

  return isSameOrigin && isCanonicalPath && !hasPubliclySerializedParameters
    ? endpoint
    : { state: "invalid", url: null };
}

export function resolveTask3PublicConfig({
  siteMode,
  scoringSpaceUrl,
  testSpaceUrl,
  leaderboardApiUrl,
  allowLocalHttp = false,
} = {}) {
  const normalizedMode = siteMode?.trim() || "development";
  if (!VALID_SITE_MODES.has(normalizedMode)) {
    throw new Error("FINREASON_TASK3_SITE_MODE must be either development or final.");
  }

  const endpointAllowLocalHttp = normalizedMode === "development" && allowLocalHttp;
  // The scoring Space serves BOTH practice and development, so it is not named
  // after either phase.
  const scoringSpace = resolveHfSpaceEndpoint(scoringSpaceUrl, endpointAllowLocalHttp);
  const testSpace = resolveHfSpaceEndpoint(testSpaceUrl, endpointAllowLocalHttp);

  const config = {
    siteMode: normalizedMode,
    scoringSpace,
    testSpace,
    leaderboardApi: resolveLeaderboardEndpoint(
      leaderboardApiUrl, scoringSpace, endpointAllowLocalHttp,
    ),
  };

  if (config.siteMode === "final") {
    const missing = [];
    if (config.scoringSpace.state !== "ready") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL");
    }
    if (config.testSpace.state !== "ready") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL");
    }
    if (config.leaderboardApi.state === "missing") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL");
    }
    if (missing.length) {
      throw new Error(
        `A live Task 3 Pages build requires both verified root Space URLs and the public leaderboard endpoint; missing: ${missing.join(", ")}.`,
      );
    }
    if (config.scoringSpace.url === config.testSpace.url) {
      throw new Error(
        "Task 3 scoring and test Space URLs must identify two different isolated deployments.",
      );
    }
    if (config.leaderboardApi.state === "invalid") {
      throw new Error(
        "NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL must be the parameter-free /api/leaderboard URL on the verified scoring Space origin.",
      );
    }
  }

  return config;
}
```

```typescript
// lib/task3-public-config.d.mts
export type PublicEndpointState = "ready" | "missing" | "invalid";
export type Task3SiteMode = "development" | "final";

export type PublicEndpoint = {
  state: PublicEndpointState;
  url: string | null;
};

export type Task3PublicConfig = {
  siteMode: Task3SiteMode;
  scoringSpace: PublicEndpoint;
  testSpace: PublicEndpoint;
  leaderboardApi: PublicEndpoint;
};

export function resolveTask3PublicConfig(input: {
  siteMode?: string;
  scoringSpaceUrl?: string;
  testSpaceUrl?: string;
  leaderboardApiUrl?: string;
  allowLocalHttp?: boolean;
}): Task3PublicConfig;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && node --test tests/task3-public-config.test.mjs`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add lib/task3-public-config.mjs lib/task3-public-config.d.mts tests/task3-public-config.test.mjs
git commit -m "feat(task3): validate the public Space endpoints the site may link to"
```

---

### Task 2: Leaderboard contract parser

**Files:**
- Create: `lib/task3-leaderboard.mjs`
- Create: `lib/task3-leaderboard.d.mts`
- Test: `tests/task3-leaderboard.test.mjs`

**Interfaces:**
- Produces: `TASK3_LEADERBOARD_SCHEMA_VERSION`; `parseDevelopmentLeaderboard(payload)` returning `{ schemaVersion, phase, basis, rows }` where each row is `{ rank, teamName, acc, ser, eer, cer, acceptedAt }`, throwing on any contract violation; `fetchDevelopmentLeaderboard(dataUrl, { fetchImpl, signal, timeoutMs })`.

**The one thing that must not be copied from Task 1:** Task 1 compares its score strings LEXICOGRAPHICALLY, which is safe only because its scores are fixed-width `0.xxxxxx`. Task 3's scores are percentages of varying width, where `"9.00" > "48.19"` lexicographically but is smaller numerically. Ordering must be compared as NUMBERS.

- [ ] **Step 1: Write the failing test**

```javascript
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
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { schema_version: "x/2.0.0" })), /schema/i);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { phase: "test" })), /schema|phase/i);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row()], { extra: 1 })), /schema|key/i);
});

test("rejects a row with a missing or extra field", () => {
  const missing = row(); delete missing.cer;
  assert.throws(() => parseDevelopmentLeaderboard(payload([missing])), /fields/);
  assert.throws(() => parseDevelopmentLeaderboard(payload([row({ receipt_id: "R-1" })])), /fields/);
});

test("rejects scores that are not two-decimal percentages", () => {
  for (const bad of ["0.481900", "48.1", "48.190", "-1.00", "101.00", "abc", 48.19]) {
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
  // "9.00" sorts after "48.19" as text but before it as a number. A parser that
  // compared strings would accept this wrong order.
  const wrong = [row({ rank: 1, team_name: "Low", acc: "9.00" }),
                 row({ rank: 2, team_name: "High", acc: "48.19" })];
  assert.throws(() => parseDevelopmentLeaderboard(payload(wrong)), /rank or order/);

  const right = [row({ rank: 1, team_name: "High", acc: "48.19" }),
                 row({ rank: 2, team_name: "Low", acc: "9.00" })];
  assert.equal(parseDevelopmentLeaderboard(payload(right)).rows.length, 2);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && node --test tests/task3-leaderboard.test.mjs`
Expected: FAIL — cannot find module `../lib/task3-leaderboard.mjs`

- [ ] **Step 3: Write the implementation**

```javascript
// lib/task3-leaderboard.mjs
const SCHEMA_VERSION = "finreason.task3.development-leaderboard/1.0.0";
// Two-decimal percentages, 0.00 through 100.00. Task 1's 0-1 six-decimal form
// is a different contract and must not be accepted here.
const SCORE_PATTERN = /^(?:100\.00|\d{1,2}\.\d{2})$/;
const RFC3339_UTC_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const VALID_BASES = new Set(["official", "deterministic"]);
const MAX_RESPONSE_BYTES = 1_048_576;
const ROW_KEYS = ["acc", "accepted_at", "cer", "eer", "rank", "ser", "team_name"];
const PAYLOAD_KEYS = ["basis", "phase", "rows", "schema_version"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((k, i) => k === expected[i]);
}

function parseTeamDisplayName(value, index) {
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").replace(/\p{White_Space}+/gu, " ").trim()
    : "";
  if (
    typeof value !== "string" ||
    value !== normalized ||
    [...value].length < 1 ||
    [...value].length > 120 ||
    /\p{C}/u.test(value)
  ) {
    throw new Error(`Leaderboard row ${index} has an invalid team_name.`);
  }
  return value;
}

function parseAcceptedAt(value, index) {
  const parsed = typeof value === "string" ? new Date(value) : null;
  if (
    typeof value !== "string" ||
    !RFC3339_UTC_PATTERN.test(value) ||
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().replace(".000Z", "Z") !== value
  ) {
    throw new Error(`Leaderboard row ${index} has an invalid accepted_at.`);
  }
  return value;
}

// Compared as NUMBERS. These are percentages of varying width, so "9.00" is
// lexicographically greater than "48.19" while being numerically smaller --
// a text comparison would silently accept a wrongly ordered board.
function scoreTuple(row) {
  return [-Number(row.acc), Number(row.cer), Number(row.eer), Number(row.ser)];
}

function compareRows(left, right) {
  const a = scoreTuple(left);
  const b = scoreTuple(right);
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function parseDevelopmentLeaderboard(payload) {
  if (
    !isObject(payload) ||
    !hasExactKeys(payload, PAYLOAD_KEYS) ||
    payload.schema_version !== SCHEMA_VERSION ||
    payload.phase !== "development" ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error(`Leaderboard must use ${SCHEMA_VERSION}.`);
  }
  if (typeof payload.basis !== "string" || !VALID_BASES.has(payload.basis)) {
    throw new Error("Leaderboard basis must be official or deterministic.");
  }

  let previousRow = null;
  let previousRank = 0;

  const rows = payload.rows.map((raw, index) => {
    if (!isObject(raw) || !hasExactKeys(raw, ROW_KEYS)) {
      throw new Error(`Leaderboard row ${index} has the wrong fields.`);
    }

    const teamName = parseTeamDisplayName(raw.team_name, index);
    for (const key of ["acc", "ser", "eer", "cer"]) {
      if (typeof raw[key] !== "string" || !SCORE_PATTERN.test(raw[key])) {
        throw new Error(`Leaderboard row ${index} has an invalid ${key}.`);
      }
    }
    if (!Number.isInteger(raw.rank) || raw.rank < 1) {
      throw new Error(`Leaderboard row ${index} has an invalid rank.`);
    }

    const expectedRank =
      previousRow && compareRows(previousRow, raw) === 0 ? previousRank : index + 1;
    if (raw.rank !== expectedRank || (previousRow && compareRows(previousRow, raw) > 0)) {
      throw new Error(`Leaderboard row ${index} has invalid rank or order.`);
    }

    previousRow = raw;
    previousRank = raw.rank;

    return {
      rank: raw.rank,
      teamName,
      acc: raw.acc,
      ser: raw.ser,
      eer: raw.eer,
      cer: raw.cer,
      acceptedAt: parseAcceptedAt(raw.accepted_at, index),
    };
  });

  return { schemaVersion: SCHEMA_VERSION, phase: "development", basis: payload.basis, rows };
}

async function readBoundedResponseBody(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel("Leaderboard response is too large.");
        throw new Error("Leaderboard response is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function fetchDevelopmentLeaderboard(
  dataUrl,
  { fetchImpl = globalThis.fetch, signal, timeoutMs = 15_000 } = {},
) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = setTimeout(
    () => controller.abort(new Error("Leaderboard request timed out.")),
    timeoutMs,
  );
  try {
    const response = await fetchImpl(dataUrl, {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Leaderboard request returned ${response.status}.`);
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error("Leaderboard response is too large.");
    }
    const body = await readBoundedResponseBody(response);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("Leaderboard response is not valid JSON.");
    }
    return parseDevelopmentLeaderboard(payload);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export { SCHEMA_VERSION as TASK3_LEADERBOARD_SCHEMA_VERSION };
```

```typescript
// lib/task3-leaderboard.d.mts
export const TASK3_LEADERBOARD_SCHEMA_VERSION: string;

export type DevelopmentLeaderboardRow = {
  rank: number;
  teamName: string;
  acc: string;
  ser: string;
  eer: string;
  cer: string;
  acceptedAt: string;
};

export type DevelopmentLeaderboard = {
  schemaVersion: string;
  phase: "development";
  basis: "official" | "deterministic";
  rows: DevelopmentLeaderboardRow[];
};

export function parseDevelopmentLeaderboard(payload: unknown): DevelopmentLeaderboard;

export function fetchDevelopmentLeaderboard(
  dataUrl: string,
  options?: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<DevelopmentLeaderboard>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && node --test tests/task3-leaderboard.test.mjs`
Expected: PASS, 15 tests

- [ ] **Step 5: Commit**

```bash
git add lib/task3-leaderboard.mjs lib/task3-leaderboard.d.mts tests/task3-leaderboard.test.mjs
git commit -m "feat(task3): parse the frozen development leaderboard contract"
```

---

### Task 3: Participant hub page

**Files:**
- Create: `app/task3/public-config.ts`
- Create: `app/task3/task3-nav.tsx`
- Create: `app/task3/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `resolveTask3PublicConfig` (Task 1).
- Produces: `getTask3PublicConfig()`; `<Task3Nav current="overview" | "submit" | "leaderboard" />`. Route `/task3/`.

Task 1's nav says "Data" because its hub hosts sixteen downloadable files. Task 3's data comes from the Hugging Face `TheFinAI/FinMR` dataset and the starter kit, so this hub hosts no files and its first tab is "Overview".

- [ ] **Step 1: Write the failing test**

Append to `tests/rendered-html.test.mjs` a new top-level test:

```javascript
test("publishes the Task 3 participant hub with honest phase status", async () => {
  const hub = await text("out/task3/index.html");

  assert.match(hub, /TASK 3 \/ PARTICIPANT HUB/);
  assert.match(hub, /Financial Audit Verification/);

  // All three phases are listed, with their real status.
  assert.match(hub, /Practice/);
  assert.match(hub, /Development/);
  assert.match(hub, /Test/);
  assert.match(hub, /Live/);
  assert.match(hub, /Coming soon/);

  // The practice phase must say why it is not ranked.
  assert.match(hub, /public/i);
  assert.match(hub, /not ranked|never ranked/i);

  // The site hosts no Task 3 data files; it points at the released sources.
  assert.match(hub, /TheFinAI\/FinMR/);
  assert.match(hub, /332/);

  // Nothing private may appear.
  assert.doesNotMatch(hub, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(hub, /hf_[A-Za-z0-9]{10,}/);
  assert.doesNotMatch(hub, /extracted_value"\s*:/);
});
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run build:pages && node --test tests/rendered-html.test.mjs`
Expected: FAIL — `out/task3/index.html` does not exist

- [ ] **Step 3: Write `app/task3/public-config.ts`**

```typescript
import {
  resolveTask3PublicConfig,
  type Task3PublicConfig,
} from "@/lib/task3-public-config.mjs";

export type {
  PublicEndpointState,
  Task3PublicConfig,
  Task3SiteMode,
} from "@/lib/task3-public-config.mjs";

export function getTask3PublicConfig(): Task3PublicConfig {
  return resolveTask3PublicConfig({
    siteMode: process.env.FINREASON_TASK3_SITE_MODE,
    scoringSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL,
    testSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL,
    leaderboardApiUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL,
    allowLocalHttp: process.env.NODE_ENV === "development",
  });
}
```

- [ ] **Step 4: Write `app/task3/task3-nav.tsx`**

```tsx
import Link from "next/link";

type Task3Route = "overview" | "submit" | "leaderboard";

const items: Array<{ href: string; label: string; route: Task3Route }> = [
  { href: "/task3/", label: "Overview", route: "overview" },
  { href: "/task3/submit/", label: "Submit", route: "submit" },
  { href: "/task3/leaderboard/", label: "Leaderboard", route: "leaderboard" },
];

export function Task3Nav({ current }: { current: Task3Route }) {
  return (
    <nav className="task-hub-nav" aria-label="Task 3 navigation">
      <Link className="task-hub-brand" href="/">
        <span className="task-hub-brand-mark" aria-hidden="true">
          FR
        </span>
        <span>
          <strong>FinReason Cup</strong>
          <small>IEEE Big Data 2026</small>
        </span>
      </Link>
      <div className="task-hub-nav-links">
        {items.map((item) => (
          <Link
            href={item.href}
            key={item.route}
            aria-current={item.route === current ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Write `app/task3/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getTask3PublicConfig } from "./public-config";
import { Task3Nav } from "./task3-nav";

export const metadata: Metadata = {
  title: "Task 3 Participant Hub | FinReason Cup",
  description:
    "Task 3 Financial Audit Verification: data, phases, and submission routes.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/" },
};

const finmrDataset = "https://huggingface.co/datasets/TheFinAI/FinMR";
const starterKit = "https://github.com/The-FinAI/IEEE-bigdata-cup/tree/main/finreason_task3";

type PhaseCard = {
  name: string;
  status: "live" | "pending";
  gold: string;
  feedback: string;
  ranked: string;
};

const phases: PhaseCard[] = [
  {
    name: "Practice",
    status: "live",
    gold: "Public — the 332 FinMR cases, answers included",
    feedback: "Scored the moment you upload",
    ranked: "Never ranked",
  },
  {
    name: "Development",
    status: "pending",
    gold: "Held by the organizers",
    feedback: "Score, rank, and a public leaderboard",
    ranked: "Ranked",
  },
  {
    name: "Test",
    status: "pending",
    gold: "Held by the organizers",
    feedback: "An acceptance receipt only",
    ranked: "Decides the final result",
  },
];

export default function Task3HubPage() {
  const config = getTask3PublicConfig();
  const scoringIsLive =
    config.siteMode === "final" && config.scoringSpace.state === "ready";

  return (
    <main className="task-hub-page task1-page">
      <Task3Nav current="overview" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 3 / PARTICIPANT HUB</p>
            <h1>Financial Audit Verification</h1>
            <p>
              Read an SEC XBRL filing and report two numbers: the value the filing states
              for a target concept, and the value its own calculation relationships imply.
              This is targeted numeric-fact verification, not a full financial-statement audit.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Task 3 quick facts">
            <div>
              <dt>Practice</dt>
              <dd>{scoringIsLive ? "Open now" : "Link under verification"}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>15 Nov 2026 · 23:59 AoE</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="task-platform-card" aria-labelledby="task3-phases-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">THE THREE PHASES</p>
            <h2 id="task3-phases-title">What is open, and what is not</h2>
          </div>
          <p>
            Only the practice phase accepts submissions today. The development and test
            datasets are still being built, and their pages will open when they are ready.
          </p>
        </div>

        <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-phases-title" tabIndex={0}>
          <table className="baseline-reference-table">
            <thead>
              <tr>
                <th scope="col">Phase</th>
                <th scope="col">Status</th>
                <th scope="col">Answers</th>
                <th scope="col">What you get back</th>
                <th scope="col">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => (
                <tr key={phase.name}>
                  <th scope="row">
                    <span className="leaderboard-team-name">{phase.name}</span>
                  </th>
                  <td>
                    <span className="status-chip" data-state={phase.status === "live" ? "ready" : "pending"}>
                      {phase.status === "live" ? "Live" : "Coming soon"}
                    </span>
                  </td>
                  <td>{phase.gold}</td>
                  <td>{phase.feedback}</td>
                  <td>{phase.ranked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="task-platform-footnote">
          Practice is never ranked, and the reason is worth stating plainly: its answers are
          public, so any team could score 100% by reading them. It exists so you can rehearse
          the submission format against the real endpoint before it counts.
        </p>
      </section>

      <section className="task-platform-card" aria-labelledby="task3-data-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">DATA</p>
            <h2 id="task3-data-title">Where the practice data comes from</h2>
          </div>
          <p>
            This site hosts no Task 3 files. The 332 public practice cases are the Financial
            Mathematical Reasoning task of the FinAuditing benchmark, released as{" "}
            <a href={finmrDataset}>TheFinAI/FinMR</a>. The{" "}
            <a href={starterKit}>Task 3 starter kit</a> downloads them for you, and ships the
            validator, the scorer, and one baseline per way of running a model.
          </p>
        </div>
        <p className="task-platform-footnote">
          Every one of the 332 practice cases is built around one flagged Data Quality
          Committee rule — 110 for DQC_US_0015, 120 for DQC_US_0117, 102 for DQC_US_0126 — and
          in all of them the reported and calculated values disagree. A system that always
          predicted agreement would score zero.
        </p>
      </section>

      <section className="task-platform-card" aria-labelledby="task3-next-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">NEXT</p>
            <h2 id="task3-next-title">Run the practice set</h2>
          </div>
          <p>
            The <Link href="/task3/submit/">submission guide</Link> walks through producing
            <code> predictions.jsonl</code> and uploading it. The{" "}
            <Link href="/task3/leaderboard/">leaderboard page</Link> explains how the four
            rates are computed and shows the organizer baseline.
          </p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run the build and test**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run lint && npm run build:pages && node --test tests/*.test.mjs`
Expected: lint clean, build emits `/task3`, all tests pass

- [ ] **Step 7: Commit**

```bash
git add app/task3/public-config.ts app/task3/task3-nav.tsx app/task3/page.tsx tests/rendered-html.test.mjs
git commit -m "feat(task3): publish the participant hub with honest phase status"
```

---

### Task 4: Submission guide page

**Files:**
- Create: `app/task3/submission-guide.tsx`
- Create: `app/task3/submit/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `getTask3PublicConfig()`, `<Task3Nav />`.
- Produces: route `/task3/submit/`; `<SubmissionGuide scoringSpaceUrl testSpaceUrl linksReady />`.

- [ ] **Step 1: Write the failing test**

Append to `tests/rendered-html.test.mjs`:

```javascript
test("publishes a Task 3 submission guide with the real file contract", async () => {
  const submit = await text("out/task3/submit/index.html");

  assert.match(submit, /TASK 3 \/ SUBMISSION/);
  assert.match(submit, /predictions\.jsonl/);
  assert.match(submit, /extracted_value/);
  assert.match(submit, /calculated_value/);
  assert.match(submit, /prepare_public_dev\.py/);
  assert.match(submit, /validate_submission\.py/);
  // Matching is by id, and a missing line invalidates the whole submission.
  assert.match(submit, /matched .{0,20}by <code>id<\/code>|never by row order/i);
  assert.match(submit, /332/);
  // The three things a participant most often gets wrong.
  assert.match(submit, /&quot;0&quot;/);
  assert.match(submit, /UTF-8/);
  assert.match(submit, /exactly one root-level file named <code>predictions\.jsonl<\/code>/);
  // Test phase returns nothing but a receipt.
  assert.match(submit, /acceptance receipt/i);
  assert.doesNotMatch(submit, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run build:pages && node --test tests/rendered-html.test.mjs`
Expected: FAIL — `out/task3/submit/index.html` does not exist

- [ ] **Step 3: Write `app/task3/submission-guide.tsx`**

```tsx
const starterKit = "https://github.com/The-FinAI/IEEE-bigdata-cup/tree/main/finreason_task3";

type SubmissionGuideProps = {
  scoringSpaceUrl: string | null;
  testSpaceUrl: string | null;
  linksReady: boolean;
};

const prepareCommand = `cd finreason_task3
pip install -r requirements.txt
python scripts/prepare_public_dev.py`;

const validateCommand = `python scripts/validate_submission.py \\
    --predictions predictions.jsonl \\
    --reference data/public_dev_inputs.jsonl`;

const scoreCommand = `python scripts/score_submission.py \\
    --predictions predictions.jsonl \\
    --gold data/public_dev.jsonl \\
    --judge deterministic`;

const predictionLine =
  '{"id": "DEV_000000", "extracted_value": "-1284", "calculated_value": "1284"}';

export function SubmissionGuide({
  scoringSpaceUrl,
  testSpaceUrl,
  linksReady,
}: SubmissionGuideProps) {
  return (
    <section className="submission-guide-card" id="how-to-submit" aria-labelledby="task3-guide-title">
      <header className="submission-guide-heading">
        <div>
          <p className="section-index">HOW TO SUBMIT</p>
          <h2 id="task3-guide-title">Five steps from data to receipt</h2>
        </div>
        <p>
          Task 3 is method-agnostic. You are scored on your predictions, not on how you
          produced them.
        </p>
      </header>

      <ol className="submission-guide-list" role="list" aria-label="Five Task 3 submission steps">
        <li>
          <span className="submission-step-number" aria-hidden="true">01</span>
          <div>
            <h3><span className="sr-only">Step 1 of 5: </span>Get the practice data.</h3>
            <p>
              Clone the <a href={starterKit}>Task 3 starter kit</a> and run its prepare script.
              It downloads the 332 public cases and writes both the answered and unanswered
              copies.
            </p>
            <pre tabIndex={0} aria-label="Prepare the practice data"><code>{prepareCommand}</code></pre>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">02</span>
          <div>
            <h3><span className="sr-only">Step 2 of 5: </span>Produce predictions.jsonl.</h3>
            <p>
              One JSON object per line, one line per case. Only three fields are required, and
              only <code>id</code> is used to match your prediction to a case — predictions are
              matched by <code>id</code>, never by row order, so you may write the lines in any
              order.
            </p>
            <pre tabIndex={0} aria-label="One prediction line"><code>{predictionLine}</code></pre>
            <p>
              Number formatting is free: <code>-1,284</code>, <code>-1284</code> and{" "}
              <code>(1,284)</code> are read as the same number. Emit <code>&quot;0&quot;</code>{" "}
              when your system cannot determine a value — never omit a line, because a missing
              id invalidates the whole submission rather than costing you one case.
            </p>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">03</span>
          <div>
            <h3><span className="sr-only">Step 3 of 5: </span>Validate before you upload.</h3>
            <p>
              The validator catches missing, duplicate and unknown ids, missing fields, empty
              values and malformed JSON. Exit code <code>0</code> means valid.
            </p>
            <pre tabIndex={0} aria-label="Validate the submission"><code>{validateCommand}</code></pre>
            <p>
              You can also score yourself locally against the practice answers, which are
              public. The rule-based judge is free, instant and offline:
            </p>
            <pre tabIndex={0} aria-label="Score locally"><code>{scoreCommand}</code></pre>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">04</span>
          <div>
            <h3><span className="sr-only">Step 4 of 5: </span>Upload.</h3>
            <p>
              Upload <code>predictions.jsonl</code> directly, or a ZIP containing exactly one
              root-level file named <code>predictions.jsonl</code>. The file must be UTF-8.
              Practice asks only for a Team Name; the development and test phases also ask for
              a Contact Email, which is never published and is stored only as a salted hash.
            </p>
            <div className="submission-guide-actions" aria-label="Task 3 upload links">
              {linksReady && scoringSpaceUrl ? (
                <a href={scoringSpaceUrl} target="_blank" rel="noreferrer">
                  Practice and development upload
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Upload link under verification</span>
              )}
              {linksReady && testSpaceUrl ? (
                <a href={testSpaceUrl} target="_blank" rel="noreferrer">
                  Test upload
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Test link under verification</span>
              )}
            </div>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">05</span>
          <div>
            <h3><span className="sr-only">Step 5 of 5: </span>Read what comes back.</h3>
            <p>
              <strong>Practice</strong> returns the four rates immediately, broken down by DQC
              rule, plus a receipt. <strong>Development</strong> returns a provisional score at
              once and the official score when the judge finishes.{" "}
              <strong>Test</strong> returns an acceptance receipt and nothing else — no score,
              rank, or diagnostic is shown before the final results are released.
            </p>
            <p>
              A validation failure never costs you a submission quota. Only a file that reaches
              scoring is counted.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Write `app/task3/submit/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getTask3PublicConfig } from "../public-config";
import { SubmissionGuide } from "../submission-guide";
import { Task3Nav } from "../task3-nav";

export const metadata: Metadata = {
  title: "Task 3 Submission | FinReason Cup",
  description: "How to produce and upload Task 3 predictions.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/",
  },
};

export default function Task3SubmitPage() {
  const config = getTask3PublicConfig();
  const linksReady =
    config.siteMode === "final" &&
    config.scoringSpace.state === "ready" &&
    config.testSpace.state === "ready";

  return (
    <main className="task-hub-page task1-page">
      <Task3Nav current="submit" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 3 / SUBMISSION</p>
            <h1>Submit Task 3 predictions on the web.</h1>
            <p>
              No pre-registration, approval, access code, or account is required. Practice is
              open now; the development and test phases open when their datasets are published.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Submission quick facts">
            <div>
              <dt>Practice</dt>
              <dd>Scores + receipt</dd>
            </div>
            <div>
              <dt>Test</dt>
              <dd>Receipt only</dd>
            </div>
          </dl>
        </div>
      </header>

      <SubmissionGuide
        scoringSpaceUrl={config.scoringSpace.url}
        testSpaceUrl={config.testSpace.url}
        linksReady={linksReady}
      />
    </main>
  );
}
```

- [ ] **Step 5: Run the build and test**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run lint && npm run build:pages && node --test tests/*.test.mjs`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add app/task3/submission-guide.tsx app/task3/submit/page.tsx tests/rendered-html.test.mjs
git commit -m "feat(task3): publish the submission guide"
```

---

### Task 5: Leaderboard page

**Files:**
- Create: `app/task3/leaderboard/task3-leaderboard-view.tsx`
- Create: `app/task3/leaderboard/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `fetchDevelopmentLeaderboard` (Task 2), `getTask3PublicConfig()`, `<Task3Nav />`.
- Produces: route `/task3/leaderboard/`; `<Task3LeaderboardView dataUrl={string | null} />` (a client component).

The only measured organizer number is the dummy baseline. Do not invent others.

- [ ] **Step 1: Write the failing test**

Append to `tests/rendered-html.test.mjs`:

```javascript
test("publishes the Task 3 leaderboard page with only measured baselines", async () => {
  const board = await text("out/task3/leaderboard/index.html");

  assert.match(board, /Development leaderboard/);
  // The four rates, named.
  assert.match(board, /ACC/);
  assert.match(board, /Structural error rate/i);
  assert.match(board, /Extraction error rate/i);
  assert.match(board, /Calculation error rate/i);
  // The A/S/E/C hierarchy short-circuits, and that must be explained.
  assert.match(board, /first check that fails|short-circuit/i);
  // The one measured baseline, with its real numbers.
  assert.match(board, /Dummy baseline/);
  assert.match(board, /95\.48/);
  assert.match(board, /4\.52/);
  assert.match(board, /332/);
  // Practice results must never appear on the board.
  assert.match(board, /practice/i);
  assert.match(board, /not ranked|never ranked|excluded/i);
  // No fabricated model baselines.
  assert.doesNotMatch(board, /gpt-|claude-|deepseek/i);
  assert.doesNotMatch(board, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run build:pages && node --test tests/rendered-html.test.mjs`
Expected: FAIL — `out/task3/leaderboard/index.html` does not exist

- [ ] **Step 3: Write `app/task3/leaderboard/task3-leaderboard-view.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  fetchDevelopmentLeaderboard,
  type DevelopmentLeaderboard,
} from "@/lib/task3-leaderboard.mjs";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; leaderboard: DevelopmentLeaderboard }
  | { status: "error" };

function formatAcceptedAt(value: string) {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function Task3LeaderboardView({ dataUrl }: { dataUrl: string | null }) {
  const [state, setState] = useState<LoadState>(dataUrl ? { status: "loading" } : { status: "idle" });

  useEffect(() => {
    if (!dataUrl) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchDevelopmentLeaderboard(dataUrl, { signal: controller.signal })
      .then((leaderboard) => setState({ status: "ready", leaderboard }))
      .catch(() => setState({ status: "error" }));
    return () => controller.abort();
  }, [dataUrl]);

  if (state.status === "idle") {
    return (
      <p className="leaderboard-test-note">
        The public leaderboard opens when the development dataset is published.
      </p>
    );
  }
  if (state.status === "loading") {
    return <p className="leaderboard-test-note">Loading the leaderboard…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="leaderboard-test-note">
        The leaderboard feed could not be read. It is published by the scoring workspace and
        may be briefly unavailable while that workspace restarts.
      </p>
    );
  }

  const { basis, rows } = state.leaderboard;

  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="task3-board-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <p>Development phase</p>
          <h2 id="task3-board-title">Best result per team</h2>
        </div>
        <p>{rows.length === 1 ? "1 team" : `${rows.length} teams`}</p>
      </header>

      {basis === "deterministic" ? (
        <p className="leaderboard-test-note">
          These rows are ordered by the rule-based judge because the official judge was
          unavailable when they were scored. The official judge decides the final ranking.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="leaderboard-test-note">No eligible results yet.</p>
      ) : (
        <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-board-title" tabIndex={0}>
          <table className="baseline-reference-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">ACC</th>
                <th scope="col">SER</th>
                <th scope="col">EER</th>
                <th scope="col">CER</th>
                <th scope="col">Accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rank}-${row.teamName}`}>
                  <td className="leaderboard-score">{row.rank}</td>
                  <th scope="row">
                    <span className="leaderboard-team-name">{row.teamName}</span>
                  </th>
                  <td className="leaderboard-score">{row.acc}%</td>
                  <td className="leaderboard-score">{row.ser}%</td>
                  <td className="leaderboard-score">{row.eer}%</td>
                  <td className="leaderboard-score">{row.cer}%</td>
                  <td>{formatAcceptedAt(row.acceptedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Write `app/task3/leaderboard/page.tsx`**

```tsx
import type { Metadata } from "next";
import { getTask3PublicConfig } from "../public-config";
import { Task3Nav } from "../task3-nav";
import { Task3LeaderboardView } from "./task3-leaderboard-view";

export const metadata: Metadata = {
  title: "Task 3 Development Leaderboard | FinReason Cup",
  description: "How Task 3 is scored, and the current development standings.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/leaderboard/",
  },
};

export default function Task3LeaderboardPage() {
  const config = getTask3PublicConfig();
  const dataUrl = config.siteMode === "final" ? config.leaderboardApi.url : null;

  return (
    <main className="task-hub-page task1-page task1-leaderboard-page">
      <div className="task1-leaderboard-shell">
        <Task3Nav current="leaderboard" />

        <header className="leaderboard-page-heading">
          <p className="section-index">TASK 3</p>
          <h1>Development leaderboard</h1>
          <p>
            Every case receives exactly one label, and the first check that fails decides it.
            The four rates below are shares of the cases that received a valid label.
          </p>
        </header>

        <section className="leaderboard-guide" aria-labelledby="task3-scoring-title">
          <div>
            <p className="section-index">HOW SCORING WORKS</p>
            <h2 id="task3-scoring-title">One label per case, decided in order</h2>
            <p>
              <strong>S — Structural error:</strong> the answer is not a valid two-key object.{" "}
              <strong>E — Extraction error:</strong> <code>extracted_value</code> does not match
              the filing. <strong>C — Calculation error:</strong> the extracted value is right
              but <code>calculated_value</code> is not. <strong>A — Accurate:</strong> both
              match.
            </p>
            <p>
              The hierarchy short-circuits: a wrong <code>extracted_value</code> makes the case
              an extraction error even when the calculated value happens to be right. Getting
              the reported value right is the gate to everything else. Values are compared by
              numeric meaning, so <code>-1,284</code> and <code>-1284</code> are equal, and{" "}
              <code>calculated_value</code> is held to zero tolerance.
            </p>
            <p>
              <strong>ACC</strong> is the headline. <strong>SER</strong>,{" "}
              <strong>EER</strong> and <strong>CER</strong> are the structural, extraction and
              calculation error rates.
            </p>
          </div>
        </section>

        <section className="finmmeval-leaderboard-card" aria-labelledby="task3-baseline-title">
          <header className="finmmeval-leaderboard-head">
            <div>
              <p>Public practice set · 332 cases</p>
              <h2 id="task3-baseline-title">Organizer baseline</h2>
            </div>
            <p>1 baseline</p>
          </header>

          <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-baseline-title" tabIndex={0}>
            <table className="baseline-reference-table">
              <thead>
                <tr>
                  <th scope="col">Baseline</th>
                  <th scope="col">ACC</th>
                  <th scope="col">Structural error rate</th>
                  <th scope="col">Extraction error rate</th>
                  <th scope="col">Calculation error rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="leaderboard-baseline-row">
                  <th scope="row">
                    <span className="leaderboard-team-name">Dummy baseline</span>
                    <span className="leaderboard-entry-pill baseline">Baseline</span>
                    <small>Answers &quot;0&quot; for every field</small>
                  </th>
                  <td className="leaderboard-score">0.00%</td>
                  <td className="leaderboard-score">0.00%</td>
                  <td className="leaderboard-score">95.48%</td>
                  <td className="leaderboard-score">4.52%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="leaderboard-test-note">
            Measured on the practice set. The 4.52% calculation-error share is the 15 cases
            whose reported value genuinely is zero: answering &quot;0&quot; clears the
            extraction gate for those and fails at the calculation step. Every other case fails
            earlier. This is the score for doing nothing.
          </p>
        </section>

        <Task3LeaderboardView dataUrl={dataUrl} />

        <p className="leaderboard-test-note">
          Practice results are never ranked and are excluded from this board: the practice
          answers are public, so a practice ranking would measure who read them. Test uploads
          return an acceptance receipt only, and test scores and ranks stay hidden until the
          final results are released.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run the build and test**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run lint && npm run build:pages && node --test tests/*.test.mjs`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add app/task3/leaderboard/ tests/rendered-html.test.mjs
git commit -m "feat(task3): publish the leaderboard page and the measured baseline"
```

---

### Task 6: Site integration

**Files:**
- Modify: `app/sitemap.ts`
- Create: `docs/task3-site.env.example`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: everything above. Produces no new module interface.

- [ ] **Step 1: Write the failing test**

Append to `tests/rendered-html.test.mjs`:

```javascript
test("lists the Task 3 routes in the sitemap and keeps Task 1 intact", async () => {
  const sitemap = await text("out/sitemap.xml");
  for (const route of ["task3/", "task3/submit/", "task3/leaderboard/"]) {
    assert.match(sitemap, new RegExp(`IEEE-bigdata-cup/${route.replace(/\//g, "\\/")}<`));
  }
  for (const route of ["task1/", "task1/submit/", "task1/leaderboard/"]) {
    assert.match(sitemap, new RegExp(`IEEE-bigdata-cup/${route.replace(/\//g, "\\/")}<`));
  }
});

test("every Task 3 page cross-links the other two", async () => {
  const [hub, submit, board] = await Promise.all([
    text("out/task3/index.html"),
    text("out/task3/submit/index.html"),
    text("out/task3/leaderboard/index.html"),
  ]);
  for (const page of [hub, submit, board]) {
    assert.match(page, /task3\/"/);
    assert.match(page, /task3\/submit\/"/);
    assert.match(page, /task3\/leaderboard\/"/);
  }
});
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm run build:pages && node --test tests/rendered-html.test.mjs`
Expected: FAIL — the sitemap has no `task3/` entries

- [ ] **Step 3: Add the Task 3 routes to `app/sitemap.ts`**

Insert these three entries into the returned array, after the existing `task1/leaderboard/` entry and before `terms/`:

```typescript
    {
      url: `${siteUrl}task3/`,
      lastModified: new Date("2026-09-06"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}task3/submit/`,
      lastModified: new Date("2026-09-06"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}task3/leaderboard/`,
      lastModified: new Date("2026-09-06"),
      changeFrequency: "daily",
      priority: 0.7,
    },
```

- [ ] **Step 4: Write `docs/task3-site.env.example`**

```bash
# Task 3 site configuration.
#
# Leave FINREASON_TASK3_SITE_MODE unset (or "development") and the site builds
# with the upload links marked as under verification. Setting it to "final"
# makes the build REFUSE to succeed unless every endpoint below is a verified
# root Space URL -- the site cannot publish a link it has not validated.
FINREASON_TASK3_SITE_MODE=final

# The scoring workspace serves BOTH the practice and development phases.
NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL=https://yanadjenole-finreason-task3-development.hf.space/

# The test workspace returns an acceptance receipt only.
NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL=https://yanadjenole-finreason-task3-test.hf.space/

# Must be the parameter-free /api/leaderboard path on the scoring Space origin.
NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL=https://yanadjenole-finreason-task3-development.hf.space/api/leaderboard
```

- [ ] **Step 5: Run the full suite in both site modes**

Run the default (development) mode:
`export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH && cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup && npm test`
Expected: everything passes, including the pre-existing 12 Task 1 tests.

Then prove the live configuration builds too:
```bash
export PATH=/apps/software/2024a/software/nodejs/24.12.0-GCCcore-13.3.0/bin:$PATH
cd /home/yw937/project_pi_hx235/yw937/IEEE-bigdata-cup
FINREASON_TASK3_SITE_MODE=final \
NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL=https://yanadjenole-finreason-task3-development.hf.space/ \
NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL=https://yanadjenole-finreason-task3-test.hf.space/ \
NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL=https://yanadjenole-finreason-task3-development.hf.space/api/leaderboard \
npm run build:pages
grep -c "yanadjenole-finreason-task3-development.hf.space" out/task3/submit/index.html
```
Expected: the build succeeds and the upload link appears in the rendered page. Report the count.

- [ ] **Step 6: Commit**

```bash
git add app/sitemap.ts docs/task3-site.env.example tests/rendered-html.test.mjs
git commit -m "feat(task3): route the site and document its configuration"
```

---

## Definition of done

- `npm test` passes, with the 12 pre-existing Task 1 tests still passing and the new Task 3 tests alongside them.
- A `final`-mode build succeeds with the live Space URLs and renders them into the pages.
- No page contains an email address, a Hugging Face token, a gold answer, or a test-phase score.
- The leaderboard parser rejects a numerically mis-ordered board — the defect a copy of Task 1's lexicographic comparison would have introduced.

## Deviation from the spec

The spec (section 4.1) places the site under `finreason-task3-submission/site/`,
to be copied into `IEEE-bigdata-cup` later. This plan builds it directly in
`IEEE-bigdata-cup` on a branch instead. Authoring it outside that repository
would mean writing Next.js pages that cannot be linted, built, or tested until
they are moved — writing blind against a build system that is right there. The
destination is identical either way; only the moment of integration moves
earlier. The cost is that the work now lives in a repository with a real GitHub
remote, so nothing here pushes.

## Deliberately out of scope

- Publishing Task 3 data files from the Pages site. Task 1 does this; Task 3's data lives in `TheFinAI/FinMR` and the starter kit, so there is nothing to host and no separate public-boundary script is needed.
- Any organizer baseline other than the measured dummy baseline.
- Merging into `task3/starter-kit` or pushing to GitHub.
