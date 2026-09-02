import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "./public-config";
import { Task1Nav } from "./task1-nav";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Task 1 Participant Hub | FinReason Cup",
  description: "Official Task 1 data, development submission, and test release hub.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/" },
};

const developmentDownloads = [
  "train_questions.jsonl",
  "train_gold.jsonl",
  "train_manifest.jsonl",
  "train_targets.jsonl",
  "dev_questions.jsonl",
  "dev_gold.jsonl",
  "dev_manifest.jsonl",
  "dev_targets.jsonl",
  "leaderboard_questions.jsonl",
  "leaderboard_expected_ids.json",
  "sample_b0_predictions.jsonl",
  "sample_b0_submission.zip",
  "release_manifest.json",
];

const testDownloads = [
  "test_questions.jsonl",
  "test_expected_ids.json",
  "test_release_manifest.json",
];

function DownloadList({ files, phase }: { files: string[]; phase: "development" | "test" }) {
  return (
    <ul className="policy-list">
      {files.map((file) => (
        <li key={file}>
          <a href={`${basePath}/task1/data/${phase}/${file}`} download>{file}</a>
        </li>
      ))}
    </ul>
  );
}

export default function Task1HubPage() {
  const config = getTask1PublicConfig();
  const spaceLinksAreReady =
    config.siteMode === "final" &&
    config.developmentSpace.state === "ready" &&
    config.developmentSpace.url &&
    config.testSpace.state === "ready" &&
    config.testSpace.url;

  return (
    <main className="task-hub-page task1-page">
      <Task1Nav current="data" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 1 / PARTICIPANT HUB</p>
            <h1>Data and submission routes</h1>
            <p>
              Training, development, and test files for Task 1 are available below. {" "}
              {spaceLinksAreReady
                ? "Registered teams submit through separate development and test pages."
                : "The two submission pages are being verified before their links are published."}
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Task 1 quick facts">
            <div>
              <dt>Status</dt>
              <dd>{spaceLinksAreReady ? "Development + test open" : "Links under verification"}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>15 Nov 2026 · 23:59 AoE</dd>
            </div>
            <div>
              <dt>Submission</dt>
              <dd>{spaceLinksAreReady ? "Direct web upload" : "Publication pending"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="task-mode-grid" aria-label="Task 1 phases">
        <article>
          <span>01 / DEVELOPMENT</span>
          <h2>Submit 580 predictions.</h2>
          <p>
            Use the published development questions and expected IDs. Accepted submissions show the
            final-answer and checkpoint scores. Select Refresh leaderboard in the development workspace
            to load the current best-per-team result and rank.
          </p>
          <Link className="button button-primary" href="/task1/submit/#how-to-submit">
            {spaceLinksAreReady ? "View development submission steps" : "View upload status"}
          </Link>
        </article>
        <article>
          <span>02 / TEST</span>
          <h2>Download 928 test questions.</h2>
          <p>
            The test questions are available now. Accepted test submissions return only an acceptance
            receipt. Scores and ranks stay hidden until the final results are released.
          </p>
          {spaceLinksAreReady ? (
            <Link className="button button-primary" href="/task1/submit/#how-to-submit">View test submission steps</Link>
          ) : (
            <span className="button button-disabled" aria-disabled="true">Test upload link pending verification</span>
          )}
        </article>
        <article>
          <span>03 / RESULTS</span>
          <h2>Development only.</h2>
          <p>
            The authenticated table inside the development workspace shows each team&apos;s best accepted
            development result and current rank. The public leaderboard page currently shows practice-set
            baselines only; test results are excluded.
          </p>
          <Link className="button button-primary" href="/task1/leaderboard/">View development leaderboard</Link>
        </article>
      </section>

      <section className="task-platform-card" aria-labelledby="task1-downloads-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">DOWNLOADS</p>
            <h2 id="task1-downloads-title">Task 1 files</h2>
          </div>
          <p>
            Use each release manifest to verify your download. The development package contains 13
            files and the test package contains three files.
          </p>
        </div>
        <div className="task-mode-grid">
          <article>
            <span>DEVELOPMENT / 13 FILES</span>
            <DownloadList files={developmentDownloads} phase="development" />
          </article>
          <article>
            <span>TEST / 3 FILES</span>
            <DownloadList files={testDownloads} phase="test" />
          </article>
        </div>
        <p className="task-platform-footnote">
          Data license and provenance: <a href={`${basePath}/task1/RIGHTS_AND_PROVENANCE.md`}>scope notice</a>{" "}
          and <a href={`${basePath}/task1/licenses/CC-BY-4.0.txt`}>CC BY 4.0 text</a>.
        </p>
      </section>

      <aside className="task-hub-note">
        <strong>Final paper and solution deadline</strong>
        <p>15 November 2026, 23:59 Anywhere on Earth.</p>
      </aside>
    </main>
  );
}
