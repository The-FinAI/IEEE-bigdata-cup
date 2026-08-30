import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionPacker } from "./submission-packer";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Task 1 GitHub Submission Pilot | FinReason Cup",
  description: "Organizer-only GitHub submission and automatic scoring pilot for FinReason Task 1.",
  robots: { index: false, follow: false },
};

export default function Task1SubmitPage() {
  return (
    <main className="pilot-page">
      <nav className="pilot-nav" aria-label="Pilot navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/leaderboard/">Pilot leaderboard</Link>
      </nav>

      <header className="pilot-heading">
        <p className="section-index">TASK 1 / GITHUB-ONLY PILOT</p>
        <h1>Submit answers through GitHub.</h1>
        <p>
          This isolated pilot verifies the intended participant experience: prepare a canonical ZIP,
          encrypt it locally, upload the encrypted file in a GitHub form, and receive an automatic score
          on the resulting issue.
        </p>
      </header>

      <section className="pilot-grid" aria-label="Submission pilot steps">
        <article>
          <span>01</span>
          <h2>Prepare the ZIP</h2>
          <p>
            For this synthetic pilot, create a ZIP containing exactly one file named
            <code>predictions.jsonl</code>. You can start from the
            <a href={`${basePath}/task1/pilot-example-predictions.jsonl`} download>
              pilot example
            </a>.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Encrypt locally</h2>
          <p>
            The preparation tool runs in your browser. Only the encrypted JSON envelope is uploaded to
            the public GitHub issue.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Receive the score</h2>
          <p>
            GitHub automatically validates the archive, posts the two synthetic development metrics,
            and refreshes the pilot leaderboard.
          </p>
        </article>
      </section>

      <SubmissionPacker />

      <aside className="pilot-note">
        <strong>Scope of this test</strong>
        <p>
          The pilot contains no competition questions or gold answers and currently accepts only the
          organizer account. Passing it proves the GitHub upload, encryption, automatic reply, and Pages
          publication path. It does not open the official competition phase.
        </p>
      </aside>
    </main>
  );
}
