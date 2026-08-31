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
  const isHfSpaceRoot =
    url.protocol === "https:" &&
    url.hostname.endsWith(".hf.space") &&
    url.hostname.length > ".hf.space".length &&
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
  hfSpaceUrl,
  leaderboardApiUrl,
  allowLocalHttp = false,
}) {
  const normalizedMode = siteMode?.trim() || "development";
  if (!VALID_SITE_MODES.has(normalizedMode)) {
    throw new Error(
      "FINREASON_TASK1_SITE_MODE must be either development or final.",
    );
  }

  const endpointAllowLocalHttp =
    normalizedMode === "development" && allowLocalHttp;

  const config = {
    siteMode: normalizedMode,
    hfSpace: resolveHfSpaceEndpoint(hfSpaceUrl, endpointAllowLocalHttp),
    leaderboardApi: resolvePublicEndpoint(
      leaderboardApiUrl,
      endpointAllowLocalHttp,
    ),
  };

  if (config.siteMode === "final") {
    const missing = [];
    if (config.hfSpace.state !== "ready") {
      missing.push("NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL");
    }
    if (missing.length) {
      throw new Error(
        `Final Task 1 site build requires valid HTTPS values for: ${missing.join(", ")}.`,
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
