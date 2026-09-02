"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  fetchDevelopmentLeaderboard,
  type DevelopmentLeaderboard,
} from "@/lib/task1-leaderboard.mjs";

type LoadState =
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
  return Number.isFinite(score) ? score.toFixed(6) : value;
}

function OrganizerBaselines() {
  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="baseline-table-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <p>Public practice set</p>
          <h2 id="baseline-table-title">Baseline scores</h2>
        </div>
        <p>3 baselines · 290 examples</p>
      </header>

      <div
        className="finmmeval-table-shell"
        role="region"
        aria-labelledby="baseline-table-title"
        tabIndex={0}
      >
        <table className="baseline-reference-table" aria-labelledby="baseline-table-title">
          <thead>
            <tr>
              <th scope="col">Baseline</th>
              <th scope="col">Final answer</th>
              <th scope="col">Reasoning steps</th>
            </tr>
          </thead>
          <tbody>
            {organizerBaselines.map((baseline) => (
              <tr className="leaderboard-baseline-row" key={baseline.id}>
                <th scope="row">
                  <span className="leaderboard-team-name">{baseline.name}</span>
                  <span className="leaderboard-entry-pill baseline">Baseline</span>
                  <small>{baseline.description}</small>
                </th>
                <td className="leaderboard-score">{formatScore(baseline.finalAnswer)}</td>
                <td className="leaderboard-score">{formatScore(baseline.reasoningSteps)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="finmmeval-leaderboard-foot">
        <p>
          These are reference scores on the public practice set. Team rankings use a different
          challenge set, so the two should not be compared directly.
        </p>
      </footer>
    </section>
  );
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

  let teamResults: ReactNode = null;

  if (dataUrl) {
    const rows = state.status === "ready" ? state.leaderboard.rows : [];

    teamResults = (
      <section className="finmmeval-leaderboard-card" aria-labelledby="team-table-title">
        <header className="finmmeval-leaderboard-head">
          <div>
            <p>Development results</p>
            <h2 id="team-table-title">Team rankings</h2>
          </div>
          {state.status === "ready" ? (
            <p>{rows.length} ranked team{rows.length === 1 ? "" : "s"}</p>
          ) : null}
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
        {state.status === "ready" && rows.length ? (
          <div
            className="finmmeval-table-shell"
            role="region"
            aria-labelledby="team-table-title"
            tabIndex={0}
          >
            <table aria-labelledby="team-table-title">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th scope="col">Final answer</th>
                  <th scope="col">Reasoning steps</th>
                  <th className="leaderboard-updated-column" scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
            </table>
          </div>
        ) : null}
        {state.status === "ready" && !rows.length ? (
          <p className="finmmeval-leaderboard-empty">No ranked team results yet.</p>
        ) : null}
      </section>
    );
  }

  return (
    <>
      {teamResults}
      <OrganizerBaselines />
    </>
  );
}
