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
