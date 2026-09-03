import assert from "node:assert/strict";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const developmentSpaceUrl = "https://task1-development-ci.hf.space/";
const testSpaceUrl = "https://task1-test-ci.hf.space/";
const leaderboardApiUrl =
  "https://task1-development-ci.hf.space/api/leaderboard";

test("development mode is safe when public Task 1 endpoints are absent", () => {
  const config = resolveTask1PublicConfig({ siteMode: "development" });
  assert.equal(config.siteMode, "development");
  assert.deepEqual(config.developmentSpace, { state: "missing", url: null });
  assert.deepEqual(config.testSpace, { state: "missing", url: null });
  assert.deepEqual(config.leaderboardApi, { state: "missing", url: null });
});

test("final mode requires two distinct Space URLs and a public leaderboard API", () => {
  assert.throws(
    () => resolveTask1PublicConfig({ siteMode: "final" }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL.*NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL.*NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
  );

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
  );

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl,
        leaderboardApiUrl: `${testSpaceUrl}api/leaderboard`,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
  );

  const config = resolveTask1PublicConfig({
    siteMode: "final",
    developmentSpaceUrl,
    testSpaceUrl,
    leaderboardApiUrl,
  });
  assert.equal(config.developmentSpace.url, developmentSpaceUrl);
  assert.equal(config.testSpace.url, testSpaceUrl);
  assert.equal(config.leaderboardApi.url, leaderboardApiUrl);

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl: developmentSpaceUrl,
        leaderboardApiUrl,
      }),
    /two different isolated deployments/,
  );
});

test("rejects unsafe or non-root public endpoints", () => {
  for (const developmentSpaceUrl of [
    "https://example.invalid/",
    "https://task1-development-ci.hf.space/private-path",
    "https://task1-development-ci.hf.space/?token=secret",
    "https://user:password@task1-development-ci.hf.space/",
  ]) {
    assert.throws(
      () =>
        resolveTask1PublicConfig({
          siteMode: "final",
          developmentSpaceUrl,
          testSpaceUrl,
        }),
      /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
    );
  }

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl,
        leaderboardApiUrl: "http://example.invalid/leaderboard.json",
      }),
      /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
  );

  for (const unsafeLeaderboardApiUrl of [
    "https://task1-api.example.invalid/leaderboard.json",
    "https://127.0.0.1/leaderboard.json",
    "https://task1-development-ci.hf.space/",
    "https://task1-development-ci.hf.space/upload",
    "https://task1-development-ci.hf.space/api/leaderboard/extra",
    "https://task1-development-ci.hf.space/api/leaderboard?token=secret",
    "https://task1-development-ci.hf.space/api/leaderboard#private",
  ]) {
    assert.throws(
      () =>
        resolveTask1PublicConfig({
          siteMode: "final",
          developmentSpaceUrl,
          testSpaceUrl,
          leaderboardApiUrl: unsafeLeaderboardApiUrl,
        }),
      /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
    );
  }
});

test("localhost HTTP is accepted only in explicit local development", () => {
  const rejected = resolveTask1PublicConfig({
    siteMode: "development",
    developmentSpaceUrl: "http://localhost:7860/",
    testSpaceUrl: "http://localhost:7861/",
  });
  assert.equal(rejected.developmentSpace.state, "invalid");
  assert.equal(rejected.testSpace.state, "invalid");

  const accepted = resolveTask1PublicConfig({
    siteMode: "development",
    developmentSpaceUrl: "http://localhost:7860/",
    testSpaceUrl: "http://localhost:7861/",
    allowLocalHttp: true,
  });
  assert.equal(accepted.developmentSpace.state, "ready");
  assert.equal(accepted.testSpace.state, "ready");

  const withLocalLeaderboard = resolveTask1PublicConfig({
    siteMode: "development",
    developmentSpaceUrl: "http://localhost:7860/",
    testSpaceUrl: "http://localhost:7861/",
    leaderboardApiUrl: "http://localhost:7860/api/leaderboard",
    allowLocalHttp: true,
  });
  assert.equal(withLocalLeaderboard.leaderboardApi.state, "ready");
});
