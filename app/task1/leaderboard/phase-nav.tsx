import Link from "next/link";

export function PhaseNav({ current }: { current: "development" | "test" }) {
  return (
    <nav className="leaderboard-phase-nav" aria-label="Task 1 submission phase">
      <Link href="/task1/leaderboard/" aria-current={current === "development" ? "page" : undefined}>
        <strong>Dev</strong>
        <span>Scores and leaderboard</span>
      </Link>
      <Link href="/task1/leaderboard/test/" aria-current={current === "test" ? "page" : undefined}>
        <strong>Test</strong>
        <span>Format check and submission status</span>
      </Link>
    </nav>
  );
}
