export type Task1SiteMode = "development" | "final";
export type PublicEndpointState = "ready" | "missing" | "invalid";

export type Task1PublicConfig = {
  siteMode: Task1SiteMode;
  developmentSpace: { state: PublicEndpointState; url: string | null };
  testSpace: { state: PublicEndpointState; url: string | null };
  leaderboardApi: { state: PublicEndpointState; url: string | null };
};

export function resolveTask1PublicConfig(input: {
  siteMode?: string;
  developmentSpaceUrl?: string;
  testSpaceUrl?: string;
  leaderboardApiUrl?: string;
  allowLocalHttp?: boolean;
}): Task1PublicConfig;
