import {
  resolveTask1PublicConfig,
  type Task1PublicConfig,
} from "@/lib/task1-public-config.mjs";

export type { PublicEndpointState, Task1PublicConfig, Task1SiteMode } from "@/lib/task1-public-config.mjs";

export function getTask1PublicConfig(): Task1PublicConfig {
  return resolveTask1PublicConfig({
    siteMode: process.env.FINREASON_TASK1_SITE_MODE,
    hfSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL,
    leaderboardApiUrl:
      process.env.NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL,
    allowLocalHttp: process.env.NODE_ENV === "development",
  });
}
