const VALID_SITE_MODES = new Set(["development", "final"]);

function resolvePublicEndpoint(rawValue, allowLocalHttp) {
  const value = rawValue?.trim();
  if (!value) return { state: "missing", url: null };

  try {
    const url = new URL(value);
    const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const isLocalDevelopmentUrl =
      allowLocalHttp && url.protocol === "http:" && localHostnames.has(url.hostname);

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
  const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLocalDevelopmentUrl =
    allowLocalHttp && url.protocol === "http:" && localHostnames.has(url.hostname);
  const hfSpaceHostname = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.hf\.space$/;
  const isHfSpaceRoot =
    url.protocol === "https:" &&
    hfSpaceHostname.test(url.hostname) &&
    !url.port &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;

  return isLocalDevelopmentUrl || isHfSpaceRoot
    ? endpoint
    : { state: "invalid", url: null };
}

export function resolveTask1PublicConfig({
  siteMode,
  developmentSpaceUrl,
  testSpaceUrl,
  leaderboardApiUrl,
  allowLocalHttp = false,
}) {
  const normalizedMode = siteMode?.trim() || "development";
  if (!VALID_SITE_MODES.has(normalizedMode)) {
    throw new Error(
      "FINREASON_TASK1_SITE_MODE must be either development or final.",
    );
  }

  const endpointAllowLocalHttp = normalizedMode === "development" && allowLocalHttp;
  const config = {
    siteMode: normalizedMode,
    developmentSpace: resolveHfSpaceEndpoint(
      developmentSpaceUrl,
      endpointAllowLocalHttp,
    ),
    testSpace: resolveHfSpaceEndpoint(testSpaceUrl, endpointAllowLocalHttp),
    leaderboardApi: resolvePublicEndpoint(
      leaderboardApiUrl,
      endpointAllowLocalHttp,
    ),
  };

  if (config.siteMode === "final") {
    const missing = [];
    if (config.developmentSpace.state !== "ready") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL");
    }
    if (config.testSpace.state !== "ready") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL");
    }
    if (missing.length) {
      throw new Error(
        `Live Task 1 Pages build requires verified root *.hf.space HTTPS values for: ${missing.join(", ")}.`,
      );
    }
    if (config.developmentSpace.url === config.testSpace.url) {
      throw new Error(
        "Task 1 development and test Space URLs must identify two different isolated deployments.",
      );
    }
    if (config.leaderboardApi.state === "invalid") {
      throw new Error(
        "NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL must be a valid HTTPS URL when provided.",
      );
    }
  }

  return config;
}
