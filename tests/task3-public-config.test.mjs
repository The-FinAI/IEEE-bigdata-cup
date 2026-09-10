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

test("final mode distinguishes an invalid endpoint from a missing one", () => {
  assert.throws(
    () => resolveTask3PublicConfig({
      siteMode: "final",
      scoringSpaceUrl: SCORING,
      testSpaceUrl: "https://yanadjenole-finreason-task3-test.hf.space/submit",
      leaderboardApiUrl: API,
    }),
    /not a verified root Space URL/,
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
