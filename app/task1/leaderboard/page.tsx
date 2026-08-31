import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";
import { AggregateLeaderboard } from "./aggregate-leaderboard";

export const metadata: Metadata = {
  title: "Task 1 Leaderboard | FinReason Cup",
  description:
    "Participant scores, leaderboard access, and optional aggregate development results for FinReason Cup Task 1.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/",
  },
};

export default function Task1LeaderboardPage() {
  const config = getTask1PublicConfig();
  const spaceIsReady =
    config.siteMode === "final" &&
    config.hfSpace.state === "ready" &&
    config.hfSpace.url;
  const publicLeaderboardUrl =
    config.siteMode === "final" ? config.leaderboardApi.url : null;

  return (
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/submit/">Submit Task 1</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / RESULTS</p>
        <h1>Scores and leaderboard.</h1>
        <p>
          The authenticated Task 1 Space is the authoritative place to view submission status, scores,
          and the leaderboard. This Pages route can also show a public aggregate development table when
          organizers enable its optional feed.
        </p>
      </header>

      <section className="space-access-card" aria-labelledby="space-results-title">
        <div>
          <p className="section-index">AUTHENTICATED RESULTS</p>
          <h2 id="space-results-title">Task 1 Hugging Face Space</h2>
          <p>
            Submission and leaderboard access use the same verified Space. Sign in there to view the
            results available to your team.
          </p>
        </div>
        {spaceIsReady ? (
          <a
            className="button button-bright"
            href={config.hfSpace.url ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            Open Task 1 leaderboard
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="button button-disabled" aria-disabled="true">
            Space link pending verification
          </span>
        )}
      </section>

      <div className="optional-leaderboard-heading">
        <p className="section-index">OPTIONAL PUBLIC VIEW</p>
        <p>Aggregate development results only</p>
      </div>
      <section className="leaderboard-panel" aria-label="Task 1 development leaderboard">
        <AggregateLeaderboard dataUrl={publicLeaderboardUrl} />
      </section>

      <aside className="task-hub-note">
        <strong>Development is not final</strong>
        <p>
          Development scores support iteration. Final evaluation follows the separately published final
          protocol and is not inferred from this table.
        </p>
      </aside>
    </main>
  );
}
