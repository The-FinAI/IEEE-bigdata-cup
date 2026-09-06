"use client";

import { useEffect, useState } from "react";
import {
  fetchDevelopmentLeaderboard,
  type DevelopmentLeaderboard,
} from "@/lib/task3-leaderboard.mjs";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; leaderboard: DevelopmentLeaderboard }
  | { status: "error" };

function formatAcceptedAt(value: string) {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function Task3LeaderboardView({ dataUrl }: { dataUrl: string | null }) {
  const [state, setState] = useState<LoadState>(dataUrl ? { status: "loading" } : { status: "idle" });

  useEffect(() => {
    if (!dataUrl) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchDevelopmentLeaderboard(dataUrl, { signal: controller.signal })
      .then((leaderboard) => {
        // The abort cancels the request, but its rejection still arrives here
        // and in the catch below. Without these guards the component calls
        // setState after unmount.
        if (controller.signal.aborted) return;
        setState({ status: "ready", leaderboard });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [dataUrl]);

  if (state.status === "idle") {
    return (
      <p className="leaderboard-test-note">
        The public leaderboard opens when the development dataset is published.
      </p>
    );
  }
  if (state.status === "loading") {
    return <p className="leaderboard-test-note">Loading the leaderboard…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="leaderboard-test-note">
        The leaderboard feed could not be read. It is published by the scoring workspace and
        may be briefly unavailable while that workspace restarts.
      </p>
    );
  }

  const { basis, rows } = state.leaderboard;

  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="task3-board-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <p>Development phase</p>
          <h2 id="task3-board-title">Best result per team</h2>
        </div>
        <p>{rows.length === 1 ? "1 team" : `${rows.length} teams`}</p>
      </header>

      {basis === "deterministic" ? (
        <p className="leaderboard-test-note">
          These rows are ordered by the rule-based judge because the official judge was
          unavailable when they were scored. The official judge decides the final ranking.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="leaderboard-test-note">No eligible results yet.</p>
      ) : (
        <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-board-title" tabIndex={0}>
          <table className="baseline-reference-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">ACC</th>
                <th scope="col">SER</th>
                <th scope="col">EER</th>
                <th scope="col">CER</th>
                <th scope="col">Accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rank}-${row.teamName}`}>
                  <td className="leaderboard-score">{row.rank}</td>
                  <th scope="row">
                    <span className="leaderboard-team-name">{row.teamName}</span>
                  </th>
                  <td className="leaderboard-score">{row.acc}%</td>
                  <td className="leaderboard-score">{row.ser}%</td>
                  <td className="leaderboard-score">{row.eer}%</td>
                  <td className="leaderboard-score">{row.cer}%</td>
                  <td>{formatAcceptedAt(row.acceptedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
