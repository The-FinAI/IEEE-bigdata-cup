import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";
import { SubmissionGuide } from "../submission-guide";
import { Task1Nav } from "../task1-nav";

export const metadata: Metadata = {
  title: "Task 1 Submission | FinReason Cup",
  description: "Direct web submission for FinReason Cup Task 1 development and test phases.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/",
  },
};

export default function Task1SubmitPage() {
  const config = getTask1PublicConfig();
  const spaceLinksAreReady =
    config.siteMode === "final" &&
    config.developmentSpace.state === "ready" &&
    config.developmentSpace.url &&
    config.testSpace.state === "ready" &&
    config.testSpace.url;

  return (
    <main className="task-hub-page task1-page">
      <Task1Nav current="submit" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 1 / SUBMISSION</p>
            <h1>Submit Task 1 results on the web.</h1>
            <p>
              All train, development, and test files are available from the participant hub. {" "}
              {spaceLinksAreReady
                ? "Registered teams submit directly through separate development and test pages."
                : "The organizer team is verifying the two submission pages before publishing their links."}
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Submission quick facts">
            <div>
              <dt>Access</dt>
              <dd>Organizer-issued team code</dd>
            </div>
            <div>
              <dt>Development</dt>
              <dd>Scores; refresh for rank</dd>
            </div>
            <div>
              <dt>Test</dt>
              <dd>Receipt only</dd>
            </div>
          </dl>
        </div>
      </header>

      <SubmissionGuide
        developmentSpaceUrl={config.developmentSpace.url}
        testSpaceUrl={config.testSpace.url}
        linksReady={Boolean(spaceLinksAreReady)}
      />

      <section className="task-platform-card" aria-labelledby="task1-platform-title">
        <div className="task-platform-status">
          <span className="status-chip" data-state={spaceLinksAreReady ? "ready" : "pending"}>
            {spaceLinksAreReady ? "Direct web upload available" : "Direct web upload under verification"}
          </span>
          <span>{spaceLinksAreReady ? "Verified live links" : "Links withheld until verification passes"}</span>
        </div>
        <div className="task-platform-copy">
          <div>
            <p className="section-index">SUBMISSION PAGES</p>
            <h2 id="task1-platform-title">Development and test submission</h2>
          </div>
          <p>
            Development and test use separate submission pages. An accepted development upload shows
            the Final answer and Reasoning steps scores in its receipt; select Refresh leaderboard in the
            development workspace to load the current best-per-team table and rank. Test returns only an
            acceptance receipt, with no score or rank before the final results are released.
          </p>
        </div>

        {spaceLinksAreReady ? (
          <div className="task-platform-actions" role="group" aria-label="Task 1 submission workspaces">
            <a
              className="button button-bright task-platform-action"
              href={config.developmentSpace.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open development submission
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              className="button button-ghost task-platform-action"
              href={config.testSpace.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open test submission
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        ) : (
          <div className="task-platform-actions" role="group" aria-label="Task 1 submission workspaces">
            <span className="button task-platform-action button-disabled" aria-disabled="true">
              Development upload link pending verification
            </span>
            <span className="button task-platform-action button-disabled" aria-disabled="true">
              Test upload link pending verification
            </span>
          </div>
        )}

        <p className="task-platform-footnote">
          This public website does not receive or store team codes or uploaded files. After your team is
          registered, enter the private team code issued by the organizers only on the submission page.
          Review the{" "}
          <Link href="/terms/">Terms of Participation</Link>{" "}
          and <Link href="/privacy/">Privacy Notice</Link>. Participant support:{" "}
          <a href="mailto:zhuohan.xie@mbzuai.ac.ae">zhuohan.xie@mbzuai.ac.ae</a>.
        </p>
      </section>

      <section className="task-mode-grid" aria-label="Train, development, and test behavior">
        <article>
          <span>01 / TRAIN</span>
          <h2>Build with public answers.</h2>
          <p>
            Train questions, gold answers, and canonical target examples are already available from
            the <Link href="/task1/">participant hub</Link>. Train results are not submitted to a leaderboard.
          </p>
        </article>
        <article>
          <span>02 / DEVELOPMENT</span>
          <h2>Receive scores immediately.</h2>
          <p>
            Upload the 580-row predictions ZIP. Each accepted submission immediately returns the
            Final answer and Reasoning steps scores. Select Refresh leaderboard to load the current
            best-per-team result and rank.
          </p>
        </article>
        <article>
          <span>03 / TEST</span>
          <h2>Submit without feedback.</h2>
          <p>
            Upload predictions for the public 928-question test release and retain the receipt identifier.
            Test submissions receive no online score and never appear on a leaderboard. Official test
            evaluation is performed by the organizers after submissions close.
          </p>
        </article>
      </section>

      <aside className="task-hub-note">
        <strong>Final paper and solution deadline</strong>
        <p>15 November 2026, 23:59 Anywhere on Earth.</p>
      </aside>
    </main>
  );
}
