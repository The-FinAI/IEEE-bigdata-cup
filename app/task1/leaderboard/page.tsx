import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";
import { AggregateLeaderboard } from "./aggregate-leaderboard";
import { Task1Nav } from "../task1-nav";

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
    <main className="task-hub-page task1-page">
      <Task1Nav current="leaderboard" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 1 / RESULTS</p>
            <h1>Development scores and leaderboard.</h1>
            <p>
              Accepted development submissions receive SeenFAC and SeenCheckpoint immediately. The
              eligible best result per team appears on the authenticated leaderboard inside the verified
              development workspace. Test submissions are receipt-only and never appear here.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Leaderboard quick facts">
            <div>
              <dt>Scope</dt>
              <dd>Development only</dd>
            </div>
            <div>
              <dt>Metrics</dt>
              <dd>SeenFAC + SeenCheckpoint</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>Registered teams</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="space-access-card" aria-labelledby="space-results-title">
        <div>
          <p className="section-index">PRIVATE TEAM ACCESS</p>
          <h2 id="space-results-title">Development submission and results</h2>
          <p>
            Enter the private access code issued to your registered team only inside the verified
            development workspace.
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
        <p className="section-index">ORGANIZER REFERENCE</p>
        <p>Labeled local-development split</p>
      </div>
      <section className="leaderboard-panel" aria-labelledby="organizer-baseline-title">
        <div className="leaderboard-heading">
          <div>
            <span>Evaluation</span>
            <strong id="organizer-baseline-title">Task 1 organizer baselines</strong>
          </div>
          <p>Fixed 290-case reference results</p>
        </div>
        <div
          className="table-scroll"
          role="region"
          aria-labelledby="organizer-baseline-title"
          tabIndex={0}
        >
          <table aria-labelledby="organizer-baseline-title">
            <thead>
              <tr>
                <th scope="col">Baseline</th>
                <th scope="col">Method</th>
                <th scope="col">SeenFAC</th>
                <th scope="col">SeenCheckpoint</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">B0 · Valid abstention</th>
                <td>Legal null-prediction control</td>
                <td>0.000000</td>
                <td>0.000000</td>
              </tr>
              <tr>
                <th scope="row">B1 · Visible rule</th>
                <td>Deterministic five-family rules</td>
                <td>0.020833</td>
                <td>0.011574</td>
              </tr>
              <tr>
                <th scope="row">B2 · Fin-o1-8B</th>
                <td>Pinned zero-shot JSON-schema generation</td>
                <td>0.285873</td>
                <td>0.592606</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="leaderboard-benchmark-note">
          These organizer results use the released 290-case labeled local-development split. The
          participant ranking uses the separate 580-case leaderboard-development split, so these
          values are reference points, not participant submissions or ranks, and are not directly
          comparable with the ranking below.
        </p>
      </section>

      <div className="optional-leaderboard-heading">
        <p className="section-index">OPTIONAL PUBLIC VIEW</p>
        <p>Participant results only</p>
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
