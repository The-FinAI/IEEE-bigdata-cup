import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";

export const metadata: Metadata = {
  title: "Task 1 Submission | FinReason Cup",
  description:
    "Participant submission hub for FinReason Cup Task 1 development and final evaluation.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/",
  },
};

export default function Task1SubmitPage() {
  const config = getTask1PublicConfig();
  const spaceIsReady =
    config.siteMode === "final" &&
    config.hfSpace.state === "ready" &&
    config.hfSpace.url;

  return (
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/leaderboard/">Development leaderboard</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / PARTICIPANT HUB</p>
        <h1>Submit Task 1 results.</h1>
        <p>
          Development and final submissions will use one organizer-verified Hugging Face Space. This
          page is the stable entry point and will activate the Space link only after its public URL has
          been verified.
        </p>
      </header>

      <section className="task-platform-card" aria-labelledby="task1-platform-title">
        <div className="task-platform-status">
          <span
            className="status-chip"
            data-state={spaceIsReady ? "ready" : "pending"}
          >
            {spaceIsReady ? "Submission Space available" : "Space link not live yet"}
          </span>
          <span>
            {config.siteMode === "final"
              ? "Final Pages configuration"
              : "Development preview configuration"}
          </span>
        </div>
        <div className="task-platform-copy">
          <div>
            <p className="section-index">HUGGING FACE SPACE</p>
            <h2 id="task1-platform-title">Task 1 submission workspace</h2>
          </div>
          <p>
            Use the mode shown inside the Space and follow the current Task 1 package. Development
            feedback and final evaluation remain separate even though they share one interface.
          </p>
        </div>

        {spaceIsReady ? (
          <a
            className="button button-bright task-platform-action"
            href={config.hfSpace.url ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            Open Task 1 submission Space
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="button task-platform-action button-disabled" aria-disabled="true">
            Submission link pending verification
          </span>
        )}

        <p className="task-platform-footnote">
          GitHub Issues are not a participant submission channel. Do not post predictions, source
          files, or private evaluation material in a public issue.
        </p>
      </section>

      <section className="task-mode-grid" aria-label="Development and final submission behavior">
        <article>
          <span>01 / DEVELOPMENT</span>
          <h2>Iterate with aggregate feedback.</h2>
          <p>
            Use development mode for format checks and development-set evaluation. When the aggregate
            feed is available, eligible development results appear on the public development
            leaderboard.
          </p>
        </article>
        <article>
          <span>02 / FINAL</span>
          <h2>Keep final evaluation separate.</h2>
          <p>
            Use final mode only when the Space identifies it as open. Development leaderboard rows are
            not final results; the published final protocol determines the official ranking.
          </p>
        </article>
        <article>
          <span>03 / RECEIPT</span>
          <h2>Retain the submission record.</h2>
          <p>
            Keep the confirmation or submission identifier returned by the Space. A browser upload is
            complete only when the interface confirms that it was accepted.
          </p>
        </article>
      </section>

      <aside className="task-hub-note">
        <strong>Current release state</strong>
        <p>
          {spaceIsReady
            ? "The submission link was supplied to this build through the verified public site configuration."
            : "This build is in development preview. The page remains informational until organizers provide and verify the final Space URL."}
        </p>
      </aside>
    </main>
  );
}
