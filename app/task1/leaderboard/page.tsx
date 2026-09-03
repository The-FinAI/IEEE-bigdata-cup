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
            {developmentSpaceIsReady
              ? "Submit development predictions without pre-registration, receive scores immediately, and view each team’s best eligible result and current rank here."
              : "The public development leaderboard will appear here after the direct-upload service and its public result feed pass verification."}
          </p>
        </header>

        <div className="leaderboard-phase-status" aria-label="Current competition phase">
          <strong>Development results</strong>
          <span>Final results follow the submission deadline</span>
        </div>

        <section className="leaderboard-guide" aria-labelledby="leaderboard-guide-title">
          <div>
            <p className="section-index">HOW SCORING WORKS</p>
            <h2 id="leaderboard-guide-title">Two scores, shown on a 0–1 scale</h2>
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
              Submit development predictions
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
