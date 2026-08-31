export type Task1SiteMode = "development" | "final";
export type PublicEndpointState = "ready" | "missing" | "invalid";

export type Task1PublicConfig = {
  siteMode: Task1SiteMode;
  hfSpace: { state: PublicEndpointState; url: string | null };
  leaderboardApi: { state: PublicEndpointState; url: string | null };
};

export function resolveTask1PublicConfig(input: {
  siteMode?: string;
  hfSpaceUrl?: string;
  leaderboardApiUrl?: string;
  allowLocalHttp?: boolean;
}): Task1PublicConfig;
