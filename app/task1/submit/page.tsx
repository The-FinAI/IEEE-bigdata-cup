import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionPacker } from "./submission-packer";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Task 1 Development Submission | FinReason Cup",
  description: "Encrypt and submit an official Task 1 V4 development predictions ZIP.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/" },
};

export default function Task1SubmitPage() {
  return (
    <main className="task-hub-page">
      <nav className="task-hub-nav" aria-label="Task 1 navigation">
        <Link href="/task1/">Task 1 hub</Link>
        <Link href="/task1/leaderboard/">Development leaderboard</Link>
      </nav>

      <header className="task-hub-heading">
        <p className="section-index">TASK 1 / DEVELOPMENT</p>
        <h1>Encrypt the canonical predictions ZIP.</h1>
        <p>
          Prepare a ZIP containing exactly one file named <code>predictions.jsonl</code> with all 580
          canonical V4 leaderboard IDs. Encryption happens locally in this browser. GitHub receives
          only the encrypted JSON attachment. The deadline is 15 November 2026, 23:59 Anywhere on Earth.
        </p>
      </header>

      <section className="pilot-grid" aria-label="Development submission steps">
        <article>
          <span>01</span>
          <h2>Prepare</h2>
          <p>
            Start from the <a href={`${basePath}/task1/data/development/sample_b0_submission.zip`} download>canonical B0 ZIP</a>{" "}
            and replace its predictions without changing the row contract. Use the exact{" "}
            <a href={`${basePath}/task1/data/development/leaderboard_questions.jsonl`} download>leaderboard questions</a>{" "}
            and <a href={`${basePath}/task1/data/development/leaderboard_expected_ids.json`} download>expected IDs</a>.
            Validate and package locally with the{" "}
            <a href="https://github.com/The-FinAI/IEEE-bigdata-cup/blob/main/scripts/task1_cli.py">participant CLI</a>{" "}
            and <a href="https://github.com/The-FinAI/IEEE-bigdata-cup/blob/main/finreason_task1/contracts.py">prediction contract</a>.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Encrypt locally</h2>
          <p>
            Use the exact GitHub login that will open the issue. The workflow derives team identity
            from the immutable numeric issue actor ID and verifies the encrypted login binding.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Attach ciphertext</h2>
          <p>
            Download the generated JSON, open the official Issue Form, and attach only that encrypted
            file. Never attach the plaintext ZIP.
          </p>
        </article>
      </section>

      <SubmissionPacker />

      <aside className="task-hub-note">
        <strong>Development limits</strong>
        <p>
          One designated GitHub account per team. At most 2 accepted attempts per UTC day and 40 in
          total. Replayed ciphertext or client submission IDs are rejected. Development returns only
          aggregate SeenFAC and SeenCheckpoint scores when GitHub Actions processing completes.
        </p>
      </aside>
    </main>
  );
}
