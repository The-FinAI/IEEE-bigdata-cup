import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionPacker } from "../../submit/submission-packer";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Task 1 GitHub Submission Pilot | FinReason Cup",
  description: "Organizer-only synthetic submission smoke test for FinReason Task 1.",
  robots: { index: false, follow: false },
};

export default function Task1PilotSubmitPage() {
  return (
    <main className="pilot-page">
      <nav className="pilot-nav" aria-label="Organizer pilot navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/pilot/leaderboard/">Organizer pilot leaderboard</Link>
      </nav>

      <header className="pilot-heading">
        <p className="section-index">TASK 1 / ORGANIZER-ONLY PILOT</p>
        <h1>Test the isolated GitHub path.</h1>
        <p>
          This preserved smoke test prepares a synthetic encrypted envelope for the restricted
          organizer Issue workflow. It is not a participant submission route.
        </p>
      </header>

      <section className="pilot-grid" aria-label="Organizer pilot steps">
        <article>
          <span>01</span>
          <h2>Prepare the ZIP</h2>
          <p>
            Create a ZIP containing exactly one file named <code>predictions.jsonl</code>. Start from
            the
            <a href={`${basePath}/task1/pilot-example-predictions.jsonl`} download>
              synthetic pilot example
            </a>.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Encrypt locally</h2>
          <p>
            The tool runs in the browser. Only the encrypted synthetic envelope is attached to the
            organizer pilot issue.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Check the smoke result</h2>
          <p>
            The restricted workflow validates the archive, posts synthetic metrics, and refreshes the
            isolated pilot leaderboard.
          </p>
        </article>
      </section>

      <SubmissionPacker />

      <aside className="pilot-note">
        <strong>Organizer-only scope</strong>
        <p>
          This pilot accepts only the configured organizer account and contains no competition
          questions or gold answers. Its scores are never official FinReason Cup results.
        </p>
      </aside>
    </main>
  );
}
