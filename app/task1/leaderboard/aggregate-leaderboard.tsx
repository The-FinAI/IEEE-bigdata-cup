"use client";

import { useEffect, useState } from "react";
import {
  fetchDevelopmentLeaderboard,
  type DevelopmentLeaderboard,
} from "@/lib/task1-leaderboard.mjs";

type LoadState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "ready"; leaderboard: DevelopmentLeaderboard }
  | { status: "error" };

type AggregateLeaderboardProps = {
  dataUrl: string | null;
};

const organizerBaselines = [
  {
    id: "b0",
    name: "No-answer baseline",
    description: "Returns no answer",
    finalAnswer: "0.000000",
    reasoningSteps: "0.000000",
  },
  {
    id: "b1",
    name: "Rule-based baseline",
    description: "Five financial formula rules",
    finalAnswer: "0.020833",
    reasoningSteps: "0.011574",
  },
  {
    id: "b2",
    name: "Fin-o1-8B",
    description: "Reference language model",
    finalAnswer: "0.285873",
    reasoningSteps: "0.592606",
  },
];

function formatAcceptedAt(value: string) {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function formatScore(value: string) {
  const score = Number(value);
  if (!Number.isFinite(score)) return value;
  return `${(score * 100).toFixed(1)}%`;
}

export function AggregateLeaderboard({ dataUrl }: AggregateLeaderboardProps) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<LoadState>(() =>
    dataUrl ? { status: "loading" } : { status: "unconfigured" },
  );

  useEffect(() => {
    if (!dataUrl) {
      setState({ status: "unconfigured" });
      return;
    }

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
  const statusMessage =
    state.status === "loading"
      ? "Updating team results."
      : state.status === "error"
        ? "Team results are temporarily unavailable."
        : state.status === "ready"
          ? `Loaded ${participantRows.length} team results.`
          : "Team rankings are available on the development submission page.";

  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="development-table-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <p>Development results</p>
          <h2 id="development-table-title">Task 1 leaderboard</h2>
        </div>
        <p>
          {participantRows.length
            ? `${participantRows.length} ranked team${participantRows.length === 1 ? "" : "s"}`
            : "3 organizer baselines"}
        </p>
      </header>

      {state.status === "loading" ? (
        <p className="leaderboard-inline-status" role="status">
          Updating team results…
        </p>
      ) : null}
      {state.status === "error" ? (
        <div className="leaderboard-inline-status leaderboard-inline-error" role="alert">
          <span>Team results are temporarily unavailable.</span>
          <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      <div
        className="finmmeval-table-shell"
        role="region"
        aria-labelledby="development-table-title"
        tabIndex={0}
      >
        <table aria-labelledby="development-table-title">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Team or baseline</th>
              <th scope="col">Final answer</th>
              <th scope="col">Reasoning steps</th>
              <th className="leaderboard-updated-column" scope="col">Updated</th>
            </tr>
          </thead>
          {participantRows.length ? (
            <tbody>
              {participantRows.map((row) => (
                <tr key={row.teamId}>
                  <td><span className="leaderboard-rank-badge">{row.rank}</span></td>
                  <th scope="row">
                    <span className="leaderboard-team-name">{row.teamDisplayName}</span>
                    <span className="leaderboard-entry-pill participant">Participant</span>
                  </th>
                  <td className="leaderboard-score">{formatScore(row.seenFac)}</td>
                  <td className="leaderboard-score">{formatScore(row.seenCheckpoint)}</td>
                  <td className="leaderboard-updated-column">{formatAcceptedAt(row.acceptedAt)}</td>
                </tr>
              ))}
            </tbody>
          ) : null}
          <tbody>
            {organizerBaselines.map((baseline) => (
              <tr className="leaderboard-baseline-row" key={baseline.id}>
                <td><span className="leaderboard-rank-badge muted">—</span></td>
                <th scope="row">
                  <span className="leaderboard-team-name">{baseline.name}</span>
                  <span className="leaderboard-entry-pill baseline">Baseline</span>
                  <small>{baseline.description}</small>
                </th>
                <td className="leaderboard-score">{formatScore(baseline.finalAnswer)}</td>
                <td className="leaderboard-score">{formatScore(baseline.reasoningSteps)}</td>
                <td className="leaderboard-updated-column">Reference</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="finmmeval-leaderboard-foot">
        <p>
          Baselines use the 290-example public development set. Team rankings use the separate
          580-example challenge set.
        </p>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>
      </footer>
    </section>
  );
}
