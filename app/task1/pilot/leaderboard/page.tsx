import type { Metadata } from "next";
import Link from "next/link";
import leaderboard from "../../../../public/task1/pilot-leaderboard.json";

export const metadata: Metadata = {
  title: "Task 1 GitHub Pilot Leaderboard | FinReason Cup",
  description: "Synthetic results for the isolated organizer-only public-Issue pilot.",
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

export default function Task1PilotLeaderboardPage() {
  const rows = leaderboard.rows as PilotRow[];

  return (
    <main className="pilot-page">
      <nav className="pilot-nav" aria-label="Organizer pilot navigation">
        <Link href="/task1/pilot/submit/">Organizer pilot submit</Link>
        <Link href="/task1/leaderboard/">Participant leaderboard hub</Link>
      </nav>

      <header className="pilot-heading">
        <p className="section-index">TASK 1 / SYNTHETIC ORGANIZER RESULTS</p>
        <h1>GitHub-only pilot leaderboard.</h1>
        <p>
          These rows exercise the legacy organizer smoke test only. They are not participant
          submissions, official FinReason Cup scores, or a fallback for the Task 1 Space.
        </p>
      </header>

      <section className="leaderboard-panel" aria-labelledby="pilot-table-title">
        <div className="leaderboard-heading">
          <div>
            <span>Evaluation</span>
            <strong id="pilot-table-title">{leaderboard.evaluation_version}</strong>
          </div>
          <p>
            {leaderboard.generated_at
              ? `Updated ${leaderboard.generated_at}`
              : "Awaiting organizer pilot score"}
          </p>
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table aria-labelledby="pilot-table-title">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">GitHub account</th>
                  <th scope="col">Seen FAC</th>
                  <th scope="col">Seen checkpoint</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Pilot issue</th>
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
          <p className="leaderboard-empty">No synthetic organizer pilot scores are published.</p>
        )}
      </section>
    </main>
  );
}
