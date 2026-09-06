import type { Metadata } from "next";
import { getTask3PublicConfig } from "../public-config";
import { Task3Nav } from "../task3-nav";
import { Task3LeaderboardView } from "./task3-leaderboard-view";

export const metadata: Metadata = {
  title: "Task 3 Development Leaderboard | FinReason Cup",
  description: "How Task 3 is scored, and the organizer baseline for the practice set.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/leaderboard/",
  },
};

export default function Task3LeaderboardPage() {
  const config = getTask3PublicConfig();
  const dataUrl = config.siteMode === "final" ? config.leaderboardApi.url : null;

  return (
    <main className="task-hub-page task1-page task1-leaderboard-page">
      <div className="task1-leaderboard-shell">
        <Task3Nav current="leaderboard" />

        <header className="leaderboard-page-heading">
          <p className="section-index">TASK 3</p>
          <h1>Development leaderboard</h1>
          <p>
            Every case receives exactly one label, and the first check that fails decides it.
            The four rates below are shares of the cases that received a valid label.
          </p>
        </header>

        <section className="leaderboard-guide" aria-labelledby="task3-scoring-title">
          <div>
            <p className="section-index">HOW SCORING WORKS</p>
            <h2 id="task3-scoring-title">One label per case, decided in order</h2>
            <p>
              <strong>S — Structural error:</strong> the answer is not a valid two-key object.{" "}
              <strong>E — Extraction error:</strong> <code>extracted_value</code> does not match
              the filing. <strong>C — Calculation error:</strong> the extracted value is right
              but <code>calculated_value</code> is not. <strong>A — Accurate:</strong> both
              match.
            </p>
            <p>
              The hierarchy short-circuits: a wrong <code>extracted_value</code> makes the case
              an extraction error even when the calculated value happens to be right. Getting
              the reported value right is the gate to everything else. Values are compared by
              numeric meaning, so <code>-1,284</code> and <code>-1284</code> are equal, and{" "}
              <code>calculated_value</code> is held to zero tolerance.
            </p>
            <p>
              <strong>ACC</strong> is the headline. <strong>SER</strong>,{" "}
              <strong>EER</strong> and <strong>CER</strong> are the structural, extraction and
              calculation error rates.
            </p>
          </div>
        </section>

        <section className="finmmeval-leaderboard-card" aria-labelledby="task3-baseline-title">
          <header className="finmmeval-leaderboard-head">
            <div>
              <p>Public practice set · 332 cases</p>
              <h2 id="task3-baseline-title">Organizer baseline</h2>
            </div>
            <p>1 baseline</p>
          </header>

          <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-baseline-title" tabIndex={0}>
            <table className="baseline-reference-table">
              <thead>
                <tr>
                  <th scope="col">Baseline</th>
                  <th scope="col">ACC</th>
                  <th scope="col">Structural error rate</th>
                  <th scope="col">Extraction error rate</th>
                  <th scope="col">Calculation error rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="leaderboard-baseline-row">
                  <th scope="row">
                    <span className="leaderboard-team-name">Dummy baseline</span>
                    <span className="leaderboard-entry-pill baseline">Baseline</span>
                    <small>Answers &quot;0&quot; for every field</small>
                  </th>
                  <td className="leaderboard-score">0.00%</td>
                  <td className="leaderboard-score">0.00%</td>
                  <td className="leaderboard-score">95.48%</td>
                  <td className="leaderboard-score">4.52%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="leaderboard-test-note">
            Measured on the practice set. The 4.52% calculation-error share is the 15 cases
            whose reported value genuinely is zero: answering &quot;0&quot; clears the
            extraction gate for those and fails at the calculation step. Every other case fails
            earlier. This is the score for doing nothing.
          </p>
        </section>

        <Task3LeaderboardView dataUrl={dataUrl} />

        <p className="leaderboard-test-note">
          Practice results are never ranked and are excluded from this board: the practice
          answers are public, so a practice ranking would measure who read them. Test uploads
          return an acceptance receipt only, and test scores and ranks stay hidden until the
          final results are released.
        </p>
      </div>
    </main>
  );
}
