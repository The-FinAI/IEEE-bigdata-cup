"use client";

import { useEffect, useState } from "react";
import {
  fetchDevelopmentLeaderboard,
  combineDevelopmentRankings,
  DEVELOPMENT_BASELINES,
  type DevelopmentLeaderboard,
} from "@/lib/task1-leaderboard.mjs";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; leaderboard: DevelopmentLeaderboard }
  | { status: "error" };

type AggregateLeaderboardProps = {
  dataUrl: string | null;
};

function formatAcceptedAt(value: string) {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function formatScore(value: string) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(6) : value;
}

export function AggregateLeaderboard({ dataUrl }: AggregateLeaderboardProps) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!dataUrl) return;

    const controller = new AbortController();
    setState({ status: "loading" });

    async function load() {
      try {
        const leaderboard = await fetchDevelopmentLeaderboard(dataUrl as string, {
          signal: controller.signal,
        });
        setState({ status: "ready", leaderboard });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, [dataUrl, requestVersion]);

  const participantRows = state.status === "ready" ? state.leaderboard.rows : [];
  const rows = combineDevelopmentRankings(participantRows);
  const ranksAreReady = state.status === "ready";
  const bestFinalAnswer = Math.max(...rows.map((row) => Number(row.seenFac)));
  const bestReasoningSteps = Math.max(...rows.map((row) => Number(row.seenCheckpoint)));

  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="team-table-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <h2 id="team-table-title">Rankings</h2>
        </div>
        <p>
          {ranksAreReady ? `${participantRows.length} team${participantRows.length === 1 ? "" : "s"} · ` : ""}
          {DEVELOPMENT_BASELINES.length} baselines
        </p>
      </header>

      {dataUrl && state.status === "loading" ? (
        <p className="leaderboard-inline-status" role="status">Updating team results…</p>
      ) : null}
      {dataUrl && state.status === "error" ? (
        <div className="leaderboard-inline-status leaderboard-inline-error" role="alert">
          <span>Team results are temporarily unavailable. Baseline scores are shown without ranks.</span>
          <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Try again</button>
        </div>
      ) : null}
      <div className="finmmeval-table-shell" role="region" aria-labelledby="team-table-title" tabIndex={0}>
        <table aria-labelledby="team-table-title">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Team / model</th>
              <th scope="col" aria-sort="descending">Final answer <span className="leaderboard-sort-arrow" aria-hidden="true">↓</span></th>
              <th scope="col">Reasoning steps</th>
              <th className="leaderboard-updated-column" scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.kind === "baseline" ? "leaderboard-baseline-row" : undefined}>
                <td><span className="leaderboard-rank-badge">{ranksAreReady ? row.displayRank : "—"}</span></td>
                <th scope="row">
                  <div className="leaderboard-entry-name">
                    <span className="leaderboard-team-name">{row.teamDisplayName}</span>
                    <span className={`leaderboard-entry-pill ${row.kind}`}>
                      {row.kind === "baseline" ? "Baseline" : "Team"}
                    </span>
                  </div>
                </th>
                <td className={`leaderboard-score${ranksAreReady && Number(row.seenFac) === bestFinalAnswer ? " score-best" : ""}`}>
                  {formatScore(row.seenFac)}
                  {ranksAreReady && Number(row.seenFac) === bestFinalAnswer ? <span className="sr-only"> (column best)</span> : null}
                </td>
                <td className={`leaderboard-score${ranksAreReady && Number(row.seenCheckpoint) === bestReasoningSteps ? " score-best" : ""}`}>
                  {formatScore(row.seenCheckpoint)}
                  {ranksAreReady && Number(row.seenCheckpoint) === bestReasoningSteps ? <span className="sr-only"> (column best)</span> : null}
                </td>
                <td className="leaderboard-updated-column">{formatAcceptedAt(row.acceptedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="finmmeval-leaderboard-foot">
        <p>
          Ranked by Final answer, then Reasoning steps. Bold scores lead each column.
        </p>
        <details className="leaderboard-ranking-note">
          <summary>Ranking details</summary>
          <p>All entries use the same 580 development questions. Identical score pairs share a rank.
            Baselines are reference entries; ranks in submission receipts count participant teams only.</p>
        </details>
      </footer>
    </section>
  );
}
