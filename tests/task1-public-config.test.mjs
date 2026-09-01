import assert from "node:assert/strict";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const developmentSpaceUrl = "https://task1-development-ci.hf.space/";
const testSpaceUrl = "https://task1-test-ci.hf.space/";
const leaderboardApiUrl = "https://task1-api.example.invalid/leaderboard.json";

test("development mode is safe when public Task 1 endpoints are absent", () => {
  const config = resolveTask1PublicConfig({ siteMode: "development" });
  assert.equal(config.siteMode, "development");
  assert.deepEqual(config.developmentSpace, { state: "missing", url: null });
  assert.deepEqual(config.testSpace, { state: "missing", url: null });
  assert.deepEqual(config.leaderboardApi, { state: "missing", url: null });

  const invalidStaged = resolveTask1PublicConfig({
    siteMode: "development",
    developmentSpaceUrl: "not a URL",
    testSpaceUrl: testSpaceUrl,
  });
  assert.deepEqual(invalidStaged.developmentSpace, { state: "invalid", url: null });
  assert.equal(invalidStaged.testSpace.url, testSpaceUrl);
});

test("final mode requires two distinct verified Spaces and keeps the public API optional", () => {
  assert.throws(
    () => resolveTask1PublicConfig({ siteMode: "final" }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL.*NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        testSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );

  const config = resolveTask1PublicConfig({
    siteMode: "final",
    developmentSpaceUrl,
    testSpaceUrl,
  });
  assert.equal(config.siteMode, "final");
  assert.equal(config.developmentSpace.url, developmentSpaceUrl);
  assert.equal(config.testSpace.url, testSpaceUrl);
  assert.deepEqual(config.leaderboardApi, { state: "missing", url: null });

  const extended = resolveTask1PublicConfig({
    siteMode: "final",
    developmentSpaceUrl,
    testSpaceUrl,
    leaderboardApiUrl,
  });
  assert.equal(extended.leaderboardApi.url, leaderboardApiUrl);

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: `${developmentSpaceUrl}#temporary-fragment`,
        testSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl: developmentSpaceUrl,
      }),
    /two different isolated deployments/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        hfSpaceUrl: developmentSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL.*NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );
});

test("rejects unsafe endpoints and invalid release modes", () => {
  assert.throws(
    () => resolveTask1PublicConfig({ siteMode: "production" }),
    /development or final/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: "https://nested.task1-development-ci.hf.space/",
        testSpaceUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: "https://example.invalid/",
        testSpaceUrl,
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl: `${testSpaceUrl}?token=must-not-be-public`,
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: `${developmentSpaceUrl}private-path`,
        testSpaceUrl,
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl,
        testSpaceUrl: "javascript:alert(1)",
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: "https://user:password@example.invalid/",
        testSpaceUrl,
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/,
  );
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
});

test("localhost HTTP is accepted only for an explicit local-development resolver", () => {
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

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        developmentSpaceUrl: "http://localhost:7860/",
        testSpaceUrl: "http://localhost:7861/",
        allowLocalHttp: true,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL.*NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/,
  );
});
