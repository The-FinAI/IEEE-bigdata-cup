import results from "./test-results.json";

type Row = (typeof results.rows)[number];

const RULE_LABEL: Record<string, string> = {
  DQC_US_0015: "DQC_US_0015",
  DQC_US_0117: "DQC_US_0117",
  DQC_US_0126: "DQC_US_0126",
};

function tieNote(row: Row) {
  if (row.tied_with.length === 0) return null;
  return (
    <small>
      Tied on ACC with {row.tied_with.join(", ")}; placed by calculation error rate
    </small>
  );
}

export function Task3TestResults() {
  const { rows, rules, counts, judge } = results;
  const merged = rows.filter((row) => row.merged);

  return (
    <section className="finmmeval-leaderboard-card" aria-labelledby="task3-test-results-title">
      <header className="finmmeval-leaderboard-head">
        <div>
          <p>Test · {results.cases} held-out cases &nbsp;·&nbsp; final</p>
          <h2 id="task3-test-results-title">Test results</h2>
        </div>
        <p>{rows.length} teams</p>
      </header>

      <div
        className="finmmeval-table-shell"
        role="region"
        aria-labelledby="task3-test-results-title"
        tabIndex={0}
      >
        <table className="baseline-reference-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              <th scope="col">ACC</th>
              <th scope="col">Structural error rate</th>
              <th scope="col">Extraction error rate</th>
              <th scope="col">Calculation error rate</th>
              <th scope="col">Test uploads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team_name}>
                <td>{row.rank}</td>
                <th scope="row">
                  <span className="leaderboard-team-name">{row.team_name}</span>
                  {row.merged ? (
                    <span className="leaderboard-entry-pill baseline">Merged</span>
                  ) : null}
                  {tieNote(row)}
                </th>
                <td className="leaderboard-score">{`${row.acc}%`}</td>
                <td className="leaderboard-score">{`${row.ser}%`}</td>
                <td className="leaderboard-score">{`${row.eer}%`}</td>
                <td className="leaderboard-score">{`${row.cer}%`}</td>
                <td className="leaderboard-score">{row.submissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="leaderboard-test-note">
        Ranked by <strong>ACC</strong>, then by calculation, extraction and structural error
        rate in that order, then by team name &mdash; the ordering this board has applied to
        the development phase throughout the Cup. Five pairs share an accuracy to the second
        decimal and are separated by their calculation error rate, including first place.
      </p>
      <p className="leaderboard-test-note">
        Every team is scored on its <strong>last valid upload before the deadline</strong>, not
        its best: the test phase returned an acceptance receipt and no score, so the held-out
        cases could not be used to choose among a team&rsquo;s own candidates.{" "}
        {counts.accepted_submissions} uploads were accepted from {counts.teams} teams, and{" "}
        {counts.excluded_late === 0 ? "none arrived late" : `${counts.excluded_late} arrived late and were not scored`}.
        Every submission parsed; no team lost a case to format.
      </p>

      <div
        className="finmmeval-table-shell"
        role="region"
        aria-label="Test accuracy by data-quality rule"
        tabIndex={0}
      >
        <table className="baseline-reference-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              {rules.map((rule) => (
                <th scope="col" key={rule.id}>
                  {RULE_LABEL[rule.id] ?? rule.id} &middot; {rule.cases} cases
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team_name}>
                <td>{row.rank}</td>
                <th scope="row">
                  <span className="leaderboard-team-name">{row.team_name}</span>
                </th>
                {rules.map((rule) => (
                  <td className="leaderboard-score" key={rule.id}>
                    {`${row.per_rule[rule.id as keyof typeof row.per_rule]}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="leaderboard-test-note">
        ACC within each rule. The three rules are not equally represented, so these columns do
        not average to the headline.{" "}
        <strong>DQC_US_0117</strong> is where the field separates: 54 cases spanning{" "}
        {rows[0].per_rule.DQC_US_0117}% down to{" "}
        {rows[rows.length - 1].per_rule.DQC_US_0117}%. <strong>DQC_US_0126</strong> is 464 of
        the 680 cases and near-perfect for almost everyone, so it moves the headline very
        little. <strong>DQC_US_0015</strong> is the rule whose answer is always the negation of
        the extracted value; no team exceeds{" "}
        {Math.max(...rows.map((row) => Number(row.per_rule.DQC_US_0015))).toFixed(2)}% on it,
        and every team scores lower on it than on DQC_US_0126 &mdash; the reported value and
        its scale, not the rule, were the hard part of this task.
      </p>

      {merged.length > 0 ? (
        <p className="leaderboard-test-note">
          Rows marked <strong>Merged</strong> are one system that submitted from more than one
          account, ranked once.{" "}
          {merged
            .map((row) =>
              row.names_used.length > 1
                ? `${row.team_name} uploaded as ${row.names_used.join(", ")}`
                : `${row.team_name} uploaded from two accounts under the same name`,
            )
            .join("; ")}
          . Every upload involved carried the same answers, so merging changed no score. A team
          affected by a merge that believes it is wrong should contact the organizers.
        </p>
      ) : null}

      <p className="leaderboard-test-note">
        Scored by <code>{`${judge.provider}/${judge.model}`}</code>, prompt{" "}
        <code>{judge.prompt_version}</code>, evaluation version{" "}
        <code>{judge.evaluation_version}</code>, over all {results.cases} held-out cases, under
        the same frozen configuration the development board uses. Gold file SHA-256{" "}
        <code>{results.gold_sha256}</code>. Submissions closed {results.deadline_aoe}.
      </p>
    </section>
  );
}
