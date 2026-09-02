import type { Metadata } from "next";
import { getTask1PublicConfig } from "../public-config";
import { Task1Nav } from "../task1-nav";
import { AggregateLeaderboard } from "./aggregate-leaderboard";

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
    <main className="task-hub-page task1-page task1-leaderboard-page">
      <div className="task1-leaderboard-shell">
        <Task1Nav current="leaderboard" />

        <header className="leaderboard-page-heading">
          <p className="section-index">TASK 1</p>
          <h1>Development leaderboard</h1>
          <p>
            Submit development predictions, receive scores immediately, and check your team&apos;s
            current rank.
          </p>
        </header>

        <div className="leaderboard-phase-tabs" aria-label="Competition results phases">
          <span aria-current="page">Development results</span>
          <span>Final results after the deadline</span>
        </div>

        <section className="leaderboard-guide" aria-labelledby="leaderboard-guide-title">
          <div>
            <p className="section-index">HOW SCORING WORKS</p>
            <h2 id="leaderboard-guide-title">Two scores, shown on a 0–100 scale</h2>
            <p>
              <strong>Final answer</strong> measures whether the submitted answer is correct. {" "}
              <strong>Reasoning steps</strong> measures the accuracy of the submitted intermediate
              steps.
            </p>
          </div>
          {developmentSpaceIsReady ? (
            <a
              className="button button-primary"
              href={config.developmentSpace.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              Submit or view my ranking
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="button button-disabled" aria-disabled="true">
              Development page coming soon
            </span>
          )}
        </section>

        <AggregateLeaderboard dataUrl={publicLeaderboardUrl} />

        <p className="leaderboard-test-note">
          Test uploads are accepted separately. Test scores and ranks remain hidden until the final
          results are released.
        </p>
      </div>
    </main>
  );
}
