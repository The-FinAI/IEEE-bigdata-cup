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
