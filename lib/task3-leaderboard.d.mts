export const TASK3_LEADERBOARD_SCHEMA_VERSION: string;

export type DevelopmentLeaderboardRow = {
  rank: number;
  teamName: string;
  acc: string;
  ser: string;
  eer: string;
  cer: string;
  acceptedAt: string;
};

export type DevelopmentLeaderboard = {
  schemaVersion: string;
  phase: "development";
  basis: "official" | "deterministic";
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
