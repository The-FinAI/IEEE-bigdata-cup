export type DevelopmentLeaderboardRow = {
  rank: number;
  teamDisplayName: string;
  seenFac: string;
  seenCheckpoint: string;
  acceptedAt: string;
};

export type DevelopmentLeaderboard = {
  schemaVersion: string;
  phase: "development";
  rows: DevelopmentLeaderboardRow[];
};

export function parseDevelopmentLeaderboard(payload: unknown): DevelopmentLeaderboard;
export function fetchDevelopmentLeaderboard(
  dataUrl: string,
  options?: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<DevelopmentLeaderboard>;
export const TASK1_LEADERBOARD_SCHEMA_VERSION: string;
