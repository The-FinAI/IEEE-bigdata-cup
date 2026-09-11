import type { Metadata } from "next";
import Link from "next/link";
import { RULE_BASELINE_REFERENCE } from "../../../lib/task1-leaderboard.mjs";
import { getTask1PublicConfig } from "../public-config";
import { Task1Nav } from "../task1-nav";
import { AggregateLeaderboard } from "./aggregate-leaderboard";
import { PhaseNav } from "./phase-nav";

export const metadata: Metadata = {
  title: "Task 1 Development Leaderboard | FinReason Cup",
  description: "Development scores and leaderboard for FinReason Cup Task 1.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/",
  },
};

export default function Task1LeaderboardPage() {
  const config = getTask1PublicConfig();
  const developmentSpaceIsReady =
    config.siteMode === "final" &&
    config.developmentSpace.state === "ready" &&
    config.developmentSpace.url;
  const publicLeaderboardUrl = config.siteMode === "final" ? config.leaderboardApi.url : null;

  return (
    <main className="task-hub-page task1-page task1-leaderboard-page task1-dev-leaderboard">
      <div className="task1-leaderboard-shell">
        <Task1Nav current="leaderboard" />

        <header className="leaderboard-page-heading leaderboard-compact-heading">
          <div>
            <p className="section-index">FINREASON CUP / TASK 1</p>
            <h1>Development leaderboard</h1>
            <p className="leaderboard-heading-caption">580 questions <span aria-hidden="true">·</span> Scores on a 0–1 scale</p>
          </div>
          <div className="leaderboard-heading-actions">
            {developmentSpaceIsReady ? (
              <a className="button button-primary" href={config.developmentSpace.url ?? undefined} target="_blank" rel="noreferrer">
                Submit predictions <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="button button-disabled" aria-disabled="true">Development page coming soon</span>
            )}
            <Link href="/task1/submit/#how-to-submit">Submission guide</Link>
          </div>
        </header>

        <PhaseNav current="development" />

        <AggregateLeaderboard dataUrl={publicLeaderboardUrl} />

        <details className="leaderboard-score-guide">
          <summary>About the scores</summary>
          <p><strong>Final answer</strong> measures answer correctness. <strong>Reasoning steps</strong> measures accuracy on the published intermediate steps. Both scores are on a 0–1 scale.</p>
          <p><strong>Financial Rules</strong> is a simple rule-based reference: {RULE_BASELINE_REFERENCE.seenFac} for Final answer and {RULE_BASELINE_REFERENCE.seenCheckpoint} for Reasoning steps on the same 580 questions. The rankings above include the three model baselines.</p>
        </details>

        <p className="leaderboard-test-note">
          <Link href="/task1/leaderboard/test/">Open Test submission status</Link> for format
          checks and acceptance receipts. Test scores and ranks remain hidden until final results are released.
        </p>
      </div>
    </main>
  );
}
