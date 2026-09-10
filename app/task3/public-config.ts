import {
  resolveTask3PublicConfig,
  type Task3PublicConfig,
} from "@/lib/task3-public-config.mjs";

export type {
  PublicEndpointState,
  Task3PublicConfig,
  Task3SiteMode,
} from "@/lib/task3-public-config.mjs";

export function getTask3PublicConfig(): Task3PublicConfig {
  return resolveTask3PublicConfig({
    siteMode: process.env.FINREASON_TASK3_SITE_MODE,
    scoringSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL,
    testSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL,
    leaderboardApiUrl: process.env.NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL,
    allowLocalHttp: process.env.NODE_ENV === "development",
  });
}
