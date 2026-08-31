import assert from "node:assert/strict";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const spaceUrl = "https://task1-space.example.invalid/";
const leaderboardApiUrl = "https://task1-api.example.invalid/leaderboard.json";

test("development mode is safe when public Task 1 endpoints are absent", () => {
  const config = resolveTask1PublicConfig({ siteMode: "development" });
  assert.equal(config.siteMode, "development");
  assert.deepEqual(config.hfSpace, { state: "missing", url: null });
  assert.deepEqual(config.leaderboardApi, { state: "missing", url: null });

  const invalidStaged = resolveTask1PublicConfig({
    siteMode: "development",
    hfSpaceUrl: "not a URL",
  });
  assert.deepEqual(invalidStaged.hfSpace, { state: "invalid", url: null });
});

test("final mode requires one verified Space and keeps the public API optional", () => {
  assert.throws(
    () => resolveTask1PublicConfig({ siteMode: "final" }),
    /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/,
  );

  const config = resolveTask1PublicConfig({
    siteMode: "final",
    hfSpaceUrl: spaceUrl,
  });
  assert.equal(config.siteMode, "final");
  assert.equal(config.hfSpace.url, spaceUrl);
  assert.deepEqual(config.leaderboardApi, { state: "missing", url: null });

  const extended = resolveTask1PublicConfig({
    siteMode: "final",
    hfSpaceUrl: spaceUrl,
    leaderboardApiUrl,
  });
  assert.equal(extended.leaderboardApi.url, leaderboardApiUrl);

  const fragmentRemoved = resolveTask1PublicConfig({
    siteMode: "final",
    hfSpaceUrl: `${spaceUrl}#temporary-fragment`,
  });
  assert.equal(fragmentRemoved.hfSpace.url, spaceUrl);
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
        hfSpaceUrl: "javascript:alert(1)",
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        hfSpaceUrl: "https://user:password@example.invalid/",
        leaderboardApiUrl,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/,
  );
  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        hfSpaceUrl: spaceUrl,
        leaderboardApiUrl: "http://example.invalid/leaderboard.json",
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/,
  );
});

test("localhost HTTP is accepted only for an explicit local-development resolver", () => {
  const rejected = resolveTask1PublicConfig({
    siteMode: "development",
    hfSpaceUrl: "http://localhost:7860/",
  });
  assert.equal(rejected.hfSpace.state, "invalid");

  const accepted = resolveTask1PublicConfig({
    siteMode: "development",
    hfSpaceUrl: "http://localhost:7860/",
    allowLocalHttp: true,
  });
  assert.equal(accepted.hfSpace.state, "ready");

  assert.throws(
    () =>
      resolveTask1PublicConfig({
        siteMode: "final",
        hfSpaceUrl: "http://localhost:7860/",
        allowLocalHttp: true,
      }),
    /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/,
  );
});
