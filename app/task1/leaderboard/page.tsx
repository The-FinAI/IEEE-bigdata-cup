import type { Metadata } from "next";
import Link from "next/link";
import leaderboard from "../../../public/task1/pilot-leaderboard.json";

export const metadata: Metadata = {
  title: "Task 1 GitHub Pilot Leaderboard | FinReason Cup",
  description: "Synthetic organizer pilot results for the FinReason Task 1 GitHub workflow.",
  robots: { index: false, follow: false },
};

type PilotRow = {
  rank: number;
  github_login: string;
  seen_fac: string;
  seen_checkpoint: string;
  attempts: number;
  last_submission_issue: number;
};

export default function Task1LeaderboardPage() {
  const rows = leaderboard.rows as PilotRow[];
  return (
    <main className="pilot-page">
      <nav className="pilot-nav" aria-label="Pilot navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/task1/submit/">Submission pilot</Link>
      </nav>

      <header className="pilot-heading">
        <p className="section-index">TASK 1 / SYNTHETIC RESULTS</p>
        <h1>GitHub-only pilot leaderboard.</h1>
        <p>
          These rows exercise automatic scoring and publication only. They are not official FinReason
          Cup results and do not use competition data.
        </p>
      </header>

      <section className="leaderboard-panel" aria-labelledby="pilot-table-title">
        <div className="leaderboard-heading">
          <div>
            <span>Evaluation</span>
            <strong id="pilot-table-title">{leaderboard.evaluation_version}</strong>
          </div>
          <p>{leaderboard.generated_at ? `Updated ${leaderboard.generated_at}` : "Awaiting first pilot score"}</p>
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>GitHub account</th>
                  <th>Seen FAC</th>
                  <th>Seen checkpoint</th>
                  <th>Attempts</th>
                  <th>Submission</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.github_login}>
                    <td>{row.rank}</td>
                    <td>{row.github_login}</td>
                    <td>{row.seen_fac}</td>
                    <td>{row.seen_checkpoint}</td>
                    <td>{row.attempts}</td>
                    <td>
                      <a
                        href={`https://github.com/The-FinAI/IEEE-bigdata-cup/issues/${row.last_submission_issue}`}
                      >
                        #{row.last_submission_issue}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="leaderboard-empty">No synthetic pilot submissions have been scored yet.</p>
        )}
      </section>
    </main>
  );
}
