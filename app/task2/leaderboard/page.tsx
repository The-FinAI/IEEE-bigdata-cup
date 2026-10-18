import type { Metadata } from "next";
import Link from "next/link";
import { Task2LeaderboardView } from "./task2-leaderboard-view";

const liveSite = "https://carolyn-jiang.github.io/Market-Neutral-Hedging-live-trading/";

export const metadata: Metadata = {
  title: "Task 2 Leaderboard | FinReason Cup",
  description: "Live-trading leaderboard for FinReason Cup Task 2: cumulative return, Sharpe ratio, and maximum drawdown.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task2/leaderboard/",
  },
};

export default function Task2LeaderboardPage() {
  return (
    <main className="task-hub-page task1-page task1-leaderboard-page task1-dev-leaderboard">
      <div className="task1-leaderboard-shell">
        <nav className="task-hub-nav" aria-label="Task 2 navigation">
          <Link className="task-hub-brand" href="/">
            <span className="task-hub-brand-mark" aria-hidden="true">FR</span>
            <span><strong>FinReason Cup</strong><small>IEEE Big Data 2026</small></span>
          </Link>
          <div className="task-hub-nav-links">
            <Link href="/task2/">Data</Link>
            <a href={liveSite}>Submit</a>
            <Link href="/task2/leaderboard/" aria-current="page">Leaderboard</Link>
          </div>
        </nav>

        <header className="leaderboard-page-heading leaderboard-compact-heading">
          <div>
            <p className="section-index">FINREASON CUP / TASK 2</p>
            <h1>Live-trading leaderboard</h1>
            <p className="leaderboard-heading-caption">Market-Neutral Hedging <span aria-hidden="true">·</span> Updated after each verified settlement</p>
          </div>
          <div className="leaderboard-heading-actions">
            <a className="button button-primary" href={liveSite} target="_blank" rel="noreferrer">
              Submit an action <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <Link href="/task2/">Task 2 hub</Link>
          </div>
        </header>

        <Task2LeaderboardView />

        <p className="leaderboard-test-note">
          Results are read from the <a href={liveSite}>Task 2 live-trading service</a>, which
          remains the authoritative source for the round schedule, submissions, and verified settlements.
        </p>
      </div>
    </main>
  );
}
