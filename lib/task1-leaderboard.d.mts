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

export type DevelopmentBaseline = Omit<DevelopmentLeaderboardRow, "rank"> & {
  id: string;
  kind: "baseline";
};

export type DevelopmentRankingRow =
  | (DevelopmentBaseline & {
      displayRank: number;
      participantRank: null;
    })
  | (DevelopmentLeaderboardRow & {
      id: string;
      kind: "participant";
      displayRank: number;
      participantRank: number;
    });

export const DEVELOPMENT_BASELINES: readonly Readonly<DevelopmentBaseline>[];
export function combineDevelopmentRankings(
  participantRows: readonly DevelopmentLeaderboardRow[],
): DevelopmentRankingRow[];

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
