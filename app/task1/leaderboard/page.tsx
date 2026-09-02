import type { Metadata } from "next";
import Link from "next/link";
import { AggregateLeaderboard } from "./aggregate-leaderboard";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Task 1 Development Leaderboard | FinReason Cup",
  description: "Signed aggregate development scores for FinReason Cup Task 1.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/" },
};

export default function Task1LeaderboardPage() {
  return (
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/task1/">Task 1 hub</Link>
        <Link href="/task1/submit/">Development submission</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / DEVELOPMENT RESULTS</p>
        <h1>Public development leaderboard.</h1>
        <p>
          Best accepted V4 development result per immutable numeric GitHub actor ID. Ranking uses SeenFAC,
          followed by SeenCheckpoint, then the earliest acceptance time. This is not the official
          final Task 1 ranking.
        </p>
      </header>

      <section className="leaderboard-panel" aria-label="Task 1 development leaderboard">
        <AggregateLeaderboard dataUrl={`${basePath}/task1/development-leaderboard.json`} />
      </section>

      <aside className="task-hub-note">
        <strong>No test feedback</strong>
        <p>
          Test intake is disabled. There is currently no test submission, receipt, score, rank,
          private diagnostic, or test leaderboard.
        </p>
      </aside>
    </main>
  );
}
