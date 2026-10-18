"use client";

import { useEffect, useState } from "react";

const liveSite = "https://carolyn-jiang.github.io/Market-Neutral-Hedging-live-trading/";
const stateUrl = new URL("live-state.json", liveSite).href;

const baselineLabels: Record<string, string> = {
  "Codex baseline": "Codex (gpt-5.3-codex)",
  "FinMem baseline": "FinMem (gpt-4.1-mini)",
  "Moira baseline": "Moira (gpt-4.1-mini)",
};

type Row = {
  team_name: string;
  cumulative_return: number;
  is_baseline: boolean;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
};

type LiveState = {
  updated_at: string | null;
  total_rounds: number;
  completed_rounds: number;
  ranking_status: string;
  final: boolean;
  chart: string | null;
  rows: Row[];
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; state: LiveState }
  | { status: "error" };

function formatReturn(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatSharpe(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "N/A";
}

function formatDrawdown(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "—";
}

function formatUpdated(value: string) {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))} New York`;
}

export function Task2LeaderboardView() {
  const [requestVersion, setRequestVersion] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: "loading" });
    fetch(stateUrl, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<LiveState>;
      })
      .then((state) => {
        if (!Array.isArray(state.rows)) throw new Error("Invalid leaderboard");
        setLoad({ status: "ready", state });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ status: "error" });
      });
    return () => controller.abort();
  }, [requestVersion]);

  const state = load.status === "ready" ? load.state : null;
  const rows = (state?.rows ?? [])
    .slice()
    .sort((a, b) => b.cumulative_return - a.cumulative_return || a.team_name.localeCompare(b.team_name));
  // Ties on cumulative return share a rank, as on the live service.
  let rank = 0;
  let lastReturn: number | null = null;
  const ranked = rows.map((row, index) => {
    if (row.cumulative_return !== lastReturn) rank = index + 1;
    lastReturn = row.cumulative_return;
    return { row, rank };
  });
  const teamCount = rows.filter((row) => !row.is_baseline).length;
  const baselineCount = rows.length - teamCount;
  const chartUrl = state?.chart ? new URL(state.chart, liveSite).href : null;

  return (
    <>
      <section className="finmmeval-leaderboard-card" aria-labelledby="task2-table-title">
        <header className="finmmeval-leaderboard-head">
          <div>
            <h2 id="task2-table-title">{state?.final ? "Final rankings" : "Rankings"}</h2>
          </div>
          <p>
            {state
              ? `${teamCount} team${teamCount === 1 ? "" : "s"} · ${baselineCount} baselines · ${state.completed_rounds} of ${state.total_rounds} rounds settled`
              : ""}
          </p>
        </header>

        {load.status === "loading" ? (
          <p className="leaderboard-inline-status" role="status">Loading live results…</p>
        ) : null}
        {load.status === "error" ? (
          <div className="leaderboard-inline-status leaderboard-inline-error" role="alert">
            <span>Live results are temporarily unavailable. <a href={liveSite}>Open the live-trading site ↗</a></span>
            <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>Try again</button>
          </div>
        ) : null}

        <div className="finmmeval-table-shell" role="region" aria-labelledby="task2-table-title" tabIndex={0}>
          <table aria-labelledby="task2-table-title">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col" aria-sort="descending">Cumulative return <span className="leaderboard-sort-arrow" aria-hidden="true">↓</span></th>
                <th scope="col">Sharpe ratio</th>
                <th scope="col">Max drawdown</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ row, rank }) => (
                <tr key={row.team_name} className={row.is_baseline ? "leaderboard-baseline-row" : undefined}>
                  <td><span className="leaderboard-rank-badge">{rank}</span></td>
                  <th scope="row">
                    <div className="leaderboard-entry-name">
                      <span className="leaderboard-team-name">{row.is_baseline ? baselineLabels[row.team_name] ?? row.team_name : row.team_name}</span>
                      <span className={`leaderboard-entry-pill ${row.is_baseline ? "baseline" : "participant"}`}>
                        {row.is_baseline ? "Baseline" : "Team"}
                      </span>
                    </div>
                  </th>
                  <td className="leaderboard-score">{formatReturn(row.cumulative_return)}</td>
                  <td className="leaderboard-score">{formatSharpe(row.sharpe_ratio)}</td>
                  <td className="leaderboard-score">{formatDrawdown(row.max_drawdown)}</td>
                </tr>
              ))}
              {state && !ranked.length ? (
                <tr><td colSpan={5}>No verified cumulative returns have been published.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer className="finmmeval-leaderboard-foot">
          <p>
            Ranked by cumulative return; equal returns share a rank.
            {state?.updated_at ? ` Updated ${formatUpdated(state.updated_at)}.` : ""}
          </p>
          <details className="leaderboard-ranking-note">
            <summary>Ranking details</summary>
            <p>
              {state?.ranking_status ? `${state.ranking_status} ` : ""}
              Missed rounds are scored as Flat. Baselines are reference entries and are excluded
              from participant prizes. Stock selections and actions remain private.
            </p>
          </details>
        </footer>
      </section>

      {chartUrl ? (
        <section className="finmmeval-leaderboard-card" aria-labelledby="task2-chart-title">
          <header className="finmmeval-leaderboard-head">
            <div>
              <h2 id="task2-chart-title">Cumulative-return paths</h2>
            </div>
          </header>
          <img
            src={chartUrl}
            alt="Verified cumulative-return paths for teams and baselines"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </section>
      ) : null}
    </>
  );
}
