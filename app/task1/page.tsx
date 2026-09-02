import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "./public-config";

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
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/leaderboard/">Development leaderboard</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / PARTICIPANT HUB</p>
        <h1>Data and submission routes.</h1>
        <p>
          All frozen public Task 1 development and rotated V2 test files are available below. {" "}
          {spaceLinksAreReady
            ? "Registered teams submit through separate verified development and test web workspaces."
            : "The direct-upload workspaces are being verified before their links are published."}{" "}
          GitHub Issues are not a submission channel.
        </p>
      </header>

      <section className="task-mode-grid" aria-label="Task 1 phases">
        <article>
          <span>01 / DEVELOPMENT</span>
          <h2>Submit 580 predictions.</h2>
          <p>
            Use the canonical V4 leaderboard questions and expected IDs. Accepted development
            submissions return SeenFAC and SeenCheckpoint immediately and can update the development
            leaderboard.
          </p>
          <Link className="button button-primary" href="/task1/submit/">
            {spaceLinksAreReady ? "Open development submission" : "View upload status"}
          </Link>
        </article>
        <article>
          <span>02 / TEST</span>
          <h2>Download 928 test questions.</h2>
          <p>
            The rotated V2 public test release is available. Accepted test submissions return only an
            acceptance receipt. No score, rank, diagnostic, or test leaderboard is shown online.
          </p>
          {spaceLinksAreReady ? (
            <Link className="button button-primary" href="/task1/submit/">Open test submission</Link>
          ) : (
            <span className="button button-disabled" aria-disabled="true">Test upload link pending verification</span>
          )}
        </article>
        <article>
          <span>03 / RESULTS</span>
          <h2>Development only.</h2>
          <p>
            The public table shows each team&apos;s best eligible accepted development score. Test results
            are excluded.
          </p>
          <Link className="button button-primary" href="/task1/leaderboard/">View development leaderboard</Link>
        </article>
      </section>

      <section className="task-platform-card" aria-labelledby="task1-downloads-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">CANONICAL DOWNLOADS</p>
            <h2 id="task1-downloads-title">Frozen public files</h2>
          </div>
          <p>
            Verify the SHA-256 values in each release manifest before use. These lists contain exactly
            the 13-file V4 development allowlist and three-file rotated V2 test allowlist.
          </p>
        </div>
        <div className="task-mode-grid">
          <article>
            <span>V4 DEVELOPMENT / 13 FILES</span>
            <DownloadList files={developmentDownloads} phase="development" />
          </article>
          <article>
            <span>ROTATED V2 TEST / 3 FILES</span>
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
