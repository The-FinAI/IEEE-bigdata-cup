import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../public-config";

export const metadata: Metadata = {
  title: "Task 1 Submission | FinReason Cup",
  description:
    "Participant hub for FinReason Cup Task 1 train, development, and test phases.",
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
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/leaderboard/">Development leaderboard</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / PARTICIPANT HUB</p>
        <h1>Submit Task 1 results.</h1>
        <p>
          {spaceLinksAreReady
            ? "Train questions and answers, development questions, and test questions are available through the verified participant resources. Registered teams submit results through two isolated organizer-verified Hugging Face Spaces."
            : "Train questions and answers, development questions, and test questions will be published when the verified participant resources are activated. Registered teams will submit results through two isolated organizer-verified Hugging Face Spaces."}{" "}
          Enter the private access code issued by the organizers only inside the relevant Space.
        </p>
      </header>

      <section className="task-platform-card" aria-labelledby="task1-platform-title">
        <div className="task-platform-status">
          <span
            className="status-chip"
            data-state={spaceLinksAreReady ? "ready" : "pending"}
          >
            {spaceLinksAreReady ? "Submission Spaces available" : "Space links not live yet"}
          </span>
          <span>
            {config.siteMode === "final"
              ? "Live Pages configuration"
              : "Development preview configuration"}
          </span>
        </div>
        <div className="task-platform-copy">
          <div>
            <p className="section-index">HUGGING FACE SPACES</p>
            <h2 id="task1-platform-title">Task 1 submission workspaces</h2>
          </div>
          <p>
            Development and test submissions use separate isolated deployments. Development returns
            SeenFAC and SeenCheckpoint immediately and can update the development leaderboard. Test
            returns a receipt only, with no online score and no leaderboard.
          </p>
        </div>

        {spaceLinksAreReady ? (
          <div
            className="task-platform-actions"
            role="group"
            aria-label="Task 1 submission Spaces"
          >
            <a
              className="button button-bright task-platform-action"
              href={config.developmentSpace.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open development submission Space
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              className="button button-ghost task-platform-action"
              href={config.testSpace.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              Open test submission Space
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        ) : (
          <div
            className="task-platform-actions"
            role="group"
            aria-label="Task 1 submission Spaces"
          >
            <span className="button task-platform-action button-disabled" aria-disabled="true">
              Development Space link pending verification
            </span>
            <span className="button task-platform-action button-disabled" aria-disabled="true">
              Test Space link pending verification
            </span>
          </div>
        )}

        <p className="task-platform-footnote">
          This public Pages site does not collect or store team access codes, secrets, submissions,
          gold answers, or private evaluation data. GitHub Issues are not a participant submission
          channel.
        </p>
      </section>

      <section className="task-mode-grid" aria-label="Train, development, and test behavior">
        <article>
          <span>01 / TRAIN</span>
          <h2>Build with public answers.</h2>
          <p>
            {spaceLinksAreReady
              ? "Train questions, gold answers, and canonical target examples are available in the verified participant release."
              : "Train questions, gold answers, and canonical target examples will be included in the verified participant release."}{" "}
            Use them for training and local checks. Train results are not submitted to a leaderboard.
          </p>
        </article>
        <article>
          <span>02 / DEVELOPMENT</span>
          <h2>Receive scores immediately.</h2>
          <p>
            {spaceLinksAreReady
              ? "Submit predictions for the public development questions."
              : "When the verified participant resources are activated, submit predictions for the public development questions."}{" "}
            Each accepted submission returns SeenFAC and SeenCheckpoint immediately, and the eligible
            best result enters the authenticated development leaderboard.
          </p>
        </article>
        <article>
          <span>03 / TEST</span>
          <h2>Submit without feedback.</h2>
          <p>
            {spaceLinksAreReady
              ? "Submit predictions for the public test questions and retain the receipt identifier."
              : "When the verified participant resources are activated, submit predictions for the public test questions and retain the receipt identifier."}{" "}
            Test submissions receive no online score and never appear on a leaderboard. Official test
            evaluation is performed by the organizers after submissions close.
          </p>
        </article>
      </section>

      <aside className="task-hub-note">
        <strong>Current release state</strong>
        <p>
          {spaceLinksAreReady
            ? "Both isolated Space links were supplied through the verified live Pages configuration. The final site mode means the Pages deployment is live; it does not identify the competition phase or make test scores available."
            : "This build is in development preview. Staged Space URLs are not published as clickable links until organizers verify both isolated deployments and activate the live Pages configuration."}
        </p>
      </aside>
    </main>
  );
}
