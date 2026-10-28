import type { Metadata } from "next";
import Link from "next/link";
import results from "../../../../public/task1/results/2026-test-results.json";
import { getTask1PublicConfig } from "../../public-config";
import { Task1Nav } from "../../task1-nav";
import { PhaseNav } from "../phase-nav";

export const metadata: Metadata = {
  title: "Task 1 Test Results | FinReason Cup",
  description: "Task 1 Test results for 27 teams, scored under the frozen evaluation configuration, with evaluation notes and downloadable rankings.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/test/" },
};

export default function Task1TestResultsPage() {
  const config = getTask1PublicConfig();
  const portalReady = config.siteMode === "final" && config.testSpace.state === "ready" && config.testSpace.url;
  return (
    <main className="task-hub-page task1-page task1-leaderboard-page">
      <div className="task1-leaderboard-shell">
        <Task1Nav current="leaderboard" />
        <header className="leaderboard-page-heading">
          <p className="section-index">TASK 1 / TEST RESULTS</p>
          <h1>Test results</h1>
          <p>27 teams · 59 accepted submissions · 928 questions. Published 28 October 2026 using the frozen evaluation configuration.</p>
        </header>
        <PhaseNav current="test" />
        <section className="leaderboard-guide" aria-labelledby="task1-evaluation-note">
          <div>
            <p className="section-index">EVALUATION NOTE</p>
            <h2 id="task1-evaluation-note">Known question inconsistency</h2>
            <p>{results.known_issue}</p>
          </div>
        </section>
        <section className="finmmeval-leaderboard-card" aria-labelledby="task1-test-title">
          <header className="finmmeval-leaderboard-head">
            <div><p>Test · frozen scorer 2.0.0</p><h2 id="task1-test-title">Rankings</h2></div>
            <p>{results.teams} teams</p>
          </header>
          <div className="finmmeval-table-shell" role="region" aria-labelledby="task1-test-title" tabIndex={0}>
            <table className="baseline-reference-table">
              <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Combined FAC ↓</th><th scope="col">Hidden FAC</th><th scope="col">Combined checkpoint</th><th scope="col">Final answers correct / 928</th></tr></thead>
              <tbody>{results.rows.map((row) => <tr key={row.team}>
                <td>{row.rank}</td><th scope="row"><span className="leaderboard-team-name">{row.team}</span></th>
                <td className="leaderboard-score">{row.combined_fac}</td><td className="leaderboard-score">{row.hidden_fac}</td><td className="leaderboard-score">{row.combined_checkpoint}</td><td className="leaderboard-score">{row.correct_final}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="leaderboard-test-note">
            <p>Ranked by Combined FAC, Hidden FAC, then Combined checkpoint, descending after six-decimal round-half-even quantization. Identical three-key scores share a competition rank; submission time is not a tie-breaker.</p>
            <p>Each team is scored on its last accepted, valid submission before 25 October 2026, 23:59 AoE (26 October, 11:59:59 UTC), not its best upload. One organizer test is excluded. ABBO and ji share one backend identity and are ranked once under the final name ABBO.</p>
            <p>Combined FAC and Combined checkpoint each give 50% weight to the seen and hidden Test strata, using the published macro-averaging rules. They are not Dev/Test averages or simple case-count accuracies. Test answers remain private. Organizer baseline Test scores are not included.</p>
            <p><Link href="/task1/results/2026-test-results.csv">Download results CSV</Link>{" · "}<Link href="/task1/results/2026-test-results.json">Download results JSON</Link></p>
          </div>
        </section>
        <section className="leaderboard-guide" aria-labelledby="test-receipts-title">
          <div><h2 id="test-receipts-title">Submission receipts</h2><p>Competition submissions are closed. The original portal remains available for submission-status information. During the competition, a format pass alone was not an acceptance receipt; no test score, rank, or answer-correctness feedback was returned.</p></div>
          {portalReady ? <a className="button button-primary" href={config.testSpace.url ?? undefined} target="_blank" rel="noreferrer">Open submission portal<span className="sr-only"> (opens in a new tab)</span></a> : <span className="button button-disabled" aria-disabled="true">Test upload link pending verification</span>}
        </section>
        <p className="leaderboard-test-note">Working Notes are due 2 November 2026, 23:59 AoE. <Link href="/#interest">Paper instructions</Link>{" · "}<Link href="/task1/leaderboard/">Development leaderboard</Link></p>
      </div>
    </main>
  );
}
