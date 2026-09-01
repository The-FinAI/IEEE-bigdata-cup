import {
  resolveTask1PublicConfig,
  type Task1PublicConfig,
} from "@/lib/task1-public-config.mjs";

export type { PublicEndpointState, Task1PublicConfig, Task1SiteMode } from "@/lib/task1-public-config.mjs";

export function getTask1PublicConfig(): Task1PublicConfig {
  return resolveTask1PublicConfig({
    siteMode: process.env.FINREASON_TASK1_SITE_MODE,
    developmentSpaceUrl:
      process.env.NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL,
    testSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL,
    leaderboardApiUrl:
      process.env.NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL,
    allowLocalHttp: process.env.NODE_ENV === "development",
  });
}
