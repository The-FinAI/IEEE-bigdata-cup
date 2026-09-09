import type { Metadata } from "next";
import Link from "next/link";
import { getTask1PublicConfig } from "../../public-config";
import { Task1Nav } from "../../task1-nav";
import { PhaseNav } from "../phase-nav";

export const metadata: Metadata = {
  title: "Task 1 Test Submission Status | FinReason Cup",
  description: "Submit Task 1 test predictions, check their format, and receive an acceptance receipt. Test scores and ranks remain hidden.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/test/",
  },
};

export default function Task1TestStatusPage() {
  const config = getTask1PublicConfig();
  const testSpaceIsReady = config.siteMode === "final" && config.testSpace.state === "ready" && config.testSpace.url;

  return (
    <main className="task-hub-page task1-page task1-leaderboard-page">
      <div className="task1-leaderboard-shell">
        <Task1Nav current="leaderboard" />
        <header className="leaderboard-page-heading">
          <p className="section-index">TASK 1</p>
          <h1>Test submission status</h1>
          <p>Upload your test predictions and check the format and acceptance status in the submission portal. Test scores and ranks remain hidden until final results are released.</p>
        </header>
        <PhaseNav current="test" />
        <section className="leaderboard-guide" aria-labelledby="test-upload-title">
          <div>
            <p className="section-index">TEST / 928 QUESTIONS</p>
            <h2 id="test-upload-title">Submit and check your file</h2>
            <p>Enter your Team Name and Contact Email, then upload a ZIP containing one root-level <code>predictions.jsonl</code>. The portal checks the public prediction format and shows whether your submission was accepted.</p>
          </div>
          {testSpaceIsReady ? (
            <a className="button button-primary" href={config.testSpace.url ?? undefined} target="_blank" rel="noreferrer">
              Open test submission
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="button button-disabled" aria-disabled="true">Test upload link pending verification</span>
          )}
        </section>
        <section className="test-status-guide" aria-label="Test submission feedback">
          <article>
            <span>01 / FORMAT CHECK</span>
            <h2>Check the prediction format</h2>
            <p>Format feedback covers the ZIP, JSON structure, required fields, and public case IDs. It does not assess whether your answers are correct.</p>
          </article>
          <article>
            <span>02 / ACCEPTANCE</span>
            <h2>Keep your receipt</h2>
            <p>An accepted submission returns a receipt ID and acceptance time. A format pass alone is not an acceptance receipt. Save the result shown in the portal.</p>
          </article>
          <article>
            <span>03 / FINAL RESULTS</span>
            <h2>Scores remain hidden</h2>
            <p>No test score, rank, or answer-correctness feedback is shown during submission. Official evaluation follows the competition deadline.</p>
          </article>
        </section>
        <p className="leaderboard-test-note">
          Competition submissions close on 15 October 2026, 23:59 Anywhere on Earth.{" "}
          <Link href="/task1/submit/#how-to-submit">Submission format and instructions</Link>{" · "}
          <Link href="/task1/#task1-downloads-title">Download test questions</Link>
        </p>
      </div>
    </main>
  );
}
