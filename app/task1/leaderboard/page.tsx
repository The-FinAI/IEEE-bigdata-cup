import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";
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
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/">Data downloads</Link>
        <Link href="/task1/submit/">Submit Task 1</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / RESULTS</p>
        <h1>Development scores and leaderboard.</h1>
        <p>
          Accepted development submissions receive SeenFAC and SeenCheckpoint immediately. The
          eligible best result per team appears on the authenticated leaderboard inside the verified
          development workspace. Test submissions are receipt-only and never appear here.
        </p>
      </header>

      <section className="space-access-card" aria-labelledby="space-results-title">
        <div>
          <p className="section-index">PRIVATE TEAM ACCESS</p>
          <h2 id="space-results-title">Development submission and results</h2>
          <p>
            Enter the private access code issued to your registered team only inside the verified
            development workspace. GitHub Issues are not a submission channel.
          </p>
        </div>
        {developmentSpaceIsReady ? (
          <a
            className="button button-bright"
            href={config.developmentSpace.url ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            Open development submission
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="button button-disabled" aria-disabled="true">
            Development upload link pending verification
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
        <strong>This leaderboard is development-only</strong>
        <p>
          Train has no leaderboard. Test submissions return receipts only and do not receive online
          scores, ranks, or diagnostics. Official test evaluation is performed after submissions close.
          This public Pages view contains no access codes, raw submissions, gold answers, or private
          evaluation data.
        </p>
        <p>
          See the <Link href="/terms/">Terms of Participation</Link> and{" "}
          <Link href="/privacy/">Privacy Notice</Link>, or email{" "}
          <a href="mailto:zhuohan.xie@mbzuai.ac.ae">zhuohan.xie@mbzuai.ac.ae</a>.
        </p>
      </aside>
    </main>
  );
}
