import { TaskCitationNote } from "../task-citation-note";
import type { Metadata } from "next";
import Link from "next/link";
import { LivePanel } from "./live-panel";

const datasetUrl = "https://huggingface.co/datasets/TheFinAI/Herculean";
const trainingFiles = ["prices.parquet", "news.parquet", "filings.parquet"];
const eligibleTickers = ["NVDA", "GOOG", "META", "MSFT", "JPM", "AMZN", "AAPL", "AMD", "WMT", "TSLA"];
const testRounds = [
  { release: "09:30", news: "Previous calendar day 15:30 to today 09:30", deadline: "10:25" },
  { release: "10:30", news: "09:30–10:30", deadline: "11:25" },
  { release: "11:30", news: "10:30–11:30", deadline: "12:25" },
  { release: "12:30", news: "11:30–12:30", deadline: "14:25" },
  { release: "14:30", news: "12:30–14:30", deadline: "15:25" },
  { release: "15:30", news: "14:30–15:30", deadline: "14 October round: 15 October 09:25. Final round: 16 October 08:00." },
];
const testEvents = ["14 October", "15 October"].flatMap((date, day) =>
  testRounds.map((round, index) => ({
    round: day * 6 + index + 1,
    date,
    time: round.release,
    tasks: day === 0 && index === 0 ? "Task 1 only: collect and publish data" : "Task 1 + Task 2: publish data and settle the preceding decision round",
  }))
);

export const metadata: Metadata = {
  title: "Task 2 Test Workflow and Training Data | FinReason Cup",
  description: "Task 2 pair-trading test workflow: New York data-release times, action deadlines, eligible stocks, and team submission fields, plus HERCULEAN training data.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task2/" },
};

export default function Task2HubPage() {
  return (
    <main className="task-hub-page task1-page">
      <nav className="task-hub-nav" aria-label="Task 2 navigation">
        <Link className="task-hub-brand" href="/">
          <span className="task-hub-brand-mark" aria-hidden="true">FR</span>
          <span><strong>FinReason Cup</strong><small>IEEE Big Data 2026</small></span>
        </Link>
        <div className="task-hub-nav-links">
          <Link href="/task1/">Task 1</Link>
          <Link href="/task2/" aria-current="page">Task 2</Link>
        </div>
      </nav>

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 2 / PARTICIPANT HUB</p>
            <h1>Market-Neutral Hedging</h1>
            <p>
              Prepare your system with HERCULEAN training data and follow the
              pair-trading test workflow below. Each round asks your team to select
              two stocks and submit one trading action after reviewing the released data.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Task 2 quick facts">
            <div><dt>Status</dt><dd>Training data available</dd></div>
            <div><dt>Format</dt><dd>3 Parquet files</dd></div>
            <div><dt>Submission</dt><dd>Publication pending</dd></div>
          </dl>
        </div>
      </header>

      <LivePanel />

      <section className="task-platform-card" aria-labelledby="task2-test-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">TEST / PAIR TRADING</p>
            <h2 id="task2-test-title">Test workflow</h2>
          </div>
          <p>
            The test has <strong>12 data releases</strong>: six on
            <strong> 14 October 2026</strong> and six on
            <strong> 15 October 2026</strong>, at <strong>09:30, 10:30, 11:30,
            12:30, 14:30, and 15:30</strong> each day. All times use
            <strong> New York time (America/New_York)</strong>, including its
            daylight-saving changes. The first leaderboard update is at
            <strong> 10:30</strong>; it is separate from the 10:25 submission cutoff.
          </p>
        </div>

        <h3>1. Download the current round&apos;s data</h3>
        <p>
          Each release contains two Parquet files: a price file with one row per
          stock and a news file with one English summary per stock for the stated
          news window. Each summary contains 30–50 tokens. A filename includes
          the release date, New York release time, and either <code>price</code>
          {" "}or <code>news</code>, for example
          {" "}<code>2026-10-14_09-30_NY_price.parquet</code> and
          {" "}<code>2026-10-14_09-30_NY_news.parquet</code>.
          News windows include their start and exclude their end. Use any coverage
          or missing-data flags in the files; a missing article is not proof that
          no news was published.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>Data-release rounds and action deadlines — New York time</caption>
            <thead><tr><th scope="col">Release / round</th><th scope="col">News window</th><th scope="col">Action submission deadline</th></tr></thead>
            <tbody>
              {testRounds.map((round) => (
                <tr key={round.release}><th scope="row">{round.release}</th><td>{round.news}</td><td>{round.deadline}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Submit your first action after the <strong>09:30</strong> release and
          no later than <strong>10:25</strong>, five minutes before the next data
          collection at 10:30. For subsequent intraday rounds, submit five minutes
          before the next scheduled release. The 14 October 15:30 round closes
          at 09:25 on 15 October. The final 15 October 15:30 round closes
          at <strong>08:00 on 16 October</strong>. The round you submit for is the data
          release you have just reviewed, not the news window that has already elapsed.
        </p>

        <h3>2. Use one unique Team Name throughout the test</h3>
        <p>
          Choose a unique Team Name that no other participating team uses. Enter
          that same name on every submission, with identical spelling and
          capitalization. Do not switch names between rounds or submit under
          another team&apos;s name: the Team Name links your actions and leaderboard
          entries across the test.
        </p>
        <p>Choose two distinct stocks from the following universe:</p>
        <p><code>{eligibleTickers.join(", ")}</code></p>

        <h3>3. Fill in all four fields for every action</h3>
        <p>
          Each team may make <strong>at most one accepted submission per decision
          round</strong>. A successful submission is final for that round: no
          replacement, revision, or second action is allowed. Invalid or rejected
          attempts do not use this allowance. A new round permits one new submission.
          Team Name is a free-text field. Stock 1, Stock 2, and Action are
          single-selection dropdowns; the two selected stocks must be distinct.
        </p>
        <ul className="policy-list">
          <li><strong>Team Name:</strong> your unique, consistent team identifier.</li>
          <li><strong>Stock 1:</strong> one ticker from the eligible universe.</li>
          <li><strong>Stock 2:</strong> a different ticker from the eligible universe.</li>
          <li><strong>Action:</strong> exactly one of <code>LS</code>, <code>SL</code>, or <code>F</code>.</li>
        </ul>
        <ul className="policy-list">
          <li><code>LS</code>: long Stock 1 and short Stock 2.</li>
          <li><code>SL</code>: short Stock 1 and long Stock 2.</li>
          <li><code>F</code>: flat — close the pair position and hold no pair exposure. Both stock fields must still be filled in; they do not create positions for this action.</li>
        </ul>
        <p>
          Stock order matters. For example, <code>NVDA / GOOG / LS</code> means
          long NVDA and short GOOG. Each action describes the desired pair
          position for that round, rather than an additional independent position.
          If your team has no valid action submission when a round closes, that
          round is scored as <code>F</code>. The previous action is not carried
          forward. An invalid or late submission does not create a valid action.
        </p>

        <h3>4. Submit against the correct release</h3>
        <p>
          The submission interface must identify the release date and time for
          the active round. Check that round before submitting; keep the four
          participant fields above unchanged. An action based on the 10:30 data
          belongs to the 10:30 round and must be submitted by 11:25. Settlement
          at the next event uses the action submitted for the preceding release;
          a new submission never changes a round that has already been settled.
        </p>
        <p>
          Review the leaderboard from <strong>10:30 New York time</strong> using
          the same Team Name. Leaderboard availability does not reopen a closed
          submission round. During live trading, the public performance board
          shows <strong>only each team&apos;s cumulative return and the Codex
          baseline&apos;s cumulative return</strong>, identified by display name.
          Stock selections, actions, submitted files, and decision reasoning
          remain private. CR ranks are refreshed at events 2–14; final return
          curves are released only at event 14.
        </p>

        <h3>5. Respect the final action cutoff</h3>
        <p>
          The final action submission deadline is
          <strong> 16 October 2026 at 08:00 New York time (EDT, UTC−4)</strong>,
          equivalent to <strong>16 October 2026 at 12:00 UTC</strong>.
          This replaces the earlier Task 2 final-action cutoff. Earlier round
          deadlines still apply. The final action is evaluated at 09:30 on
          16 October; no submissions are accepted after the 08:00 cutoff.
        </p>

        <h3>6. Follow the two-task event schedule</h3>
        <p>
          <strong>Task 1 — collect and publish:</strong> collect the current
          snapshot prices and the stated news window, then publish the price
          and news Parquet files for the new decision round.
          <strong> Task 2 — settle and update:</strong> use current valuation
          prices to calculate the preceding round&apos;s return from each
          team&apos;s accepted action, or <code>F</code> if none was submitted,
          and update cumulative returns for teams and the Codex baseline.
        </p>
        <p>
          At releases 2–12, launch both tasks at the same scheduled time. Scoring
          must use the immutable current valuation snapshot and the sealed
          previous-round submissions. Publishing the new files must not alter
          the already-closed submission window. If prices are unavailable, mark
          settlement as pending rather than inventing a price or a zero return.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>The 12 data releases and terminal evaluation — all dates in 2026, New York time</caption>
            <thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Tasks</th></tr></thead>
            <tbody>
              {testEvents.map((event) => (
                <tr key={event.round}><th scope="row">Release {event.round}</th><td>{event.date}</td><td>{event.time}</td><td>{event.tasks}</td></tr>
              ))}
              <tr><th scope="row">Terminal evaluation</th><td>16 October</td><td>09:30</td><td>Task 2 only: settle the final decision round; no new participant data release</td></tr>
              <tr><th scope="row">Final results</th><td>16 October</td><td>10:30</td><td>Publish final rankings and cumulative-return curves after terminal settlement is complete</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The first release starts every account at zero cumulative return and
          runs Task 1 only. On 16 October at 09:30, Task 2 internally obtains
          the terminal valuation prices required for scoring, but publishes no
          thirteenth news or price data batch for a new decision round.
        </p>

        <h3>7. Compare against the Codex baseline</h3>
        <p>
          For each decision round, Codex selects two eligible stocks and one
          action from <code>LS</code>, <code>SL</code>, and <code>F</code>, using
          only data available at that release and earlier releases. Generate
          and privately seal the baseline decision before the next data release.
          At the following event, evaluate that recorded decision using the
          same valuation, position-sizing, compounding, and transaction-cost
          rules as participating teams. Do not generate or revise the baseline
          after seeing the next release&apos;s prices or news.
        </p>
        <p>
          This competition uses equal-dollar pair exposure: each leg has 50%
          of account equity, for 100% gross and zero net exposure. All teams and
          the baseline use the same entry prices recorded at the action deadline
          and exit prices recorded at the following scheduled valuation event.
          The final exit is 16 October at 09:30. With zero transaction costs in
          this test, an LS round returns half the Stock 1 percentage return minus
          half the Stock 2 percentage return; SL reverses the signs.
          Cumulative return is compounded across completed rounds rather than
          calculated by adding percentage returns. For a round scored as
          <code> F</code>, pair exposure is zero for that round; prior cumulative
          gains or losses are preserved. Snapshot valuation is a simulation;
          it does not represent guaranteed brokerage fills. Price snapshots and
          their observation times are preserved for audit. Baseline generation
          and news summarization run locally; API keys are not uploaded to
          GitHub or Hugging Face.
        </p>

        <h3>8. Read the final leaderboard and return chart</h3>
        <p>
          At <strong>10:30 New York time on 16 October 2026</strong>, after final
          settlement, publish team rankings by final cumulative return and a
          reference row for the Codex baseline. The baseline is not a competing
          team. The return chart shows one line per team plus the baseline,
          starting from zero cumulative return. Use the 12 completed decision
          intervals on the horizontal axis, cumulative return (%) on the
          vertical axis, a light grid, distinct colors and line styles, and a
          dashed Codex baseline. This presentation follows the supplied
          multi-series performance-chart style while labeling returns explicitly.
          Final charts reveal returns, not the stocks or actions behind them.
        </p>
      </section>

      <section className="task-platform-card" aria-labelledby="task2-downloads-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">DOWNLOADS</p>
            <h2 id="task2-downloads-title">Task 2 files</h2>
          </div>
          <p>
            These links download the training files directly from the
            HERCULEAN dataset. You can also browse the full{" "}
            <a href={`${datasetUrl}/tree/main/data`}>data directory on Hugging Face</a>.
          </p>
        </div>
        <div className="task-mode-grid">
          <article>
            <span>TRAINING / 3 FILES</span>
            <ul className="policy-list">
              {trainingFiles.map((file) => (
                <li key={file}>
                  <a href={`${datasetUrl}/resolve/main/data/${file}?download=true`}>{file}</a>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <p className="task-platform-footnote">
          Data source and license: <a href={datasetUrl}>HERCULEAN dataset card</a> (CC BY 4.0).
        </p>
      </section>

      <aside className="task-hub-note">
        <strong>Evaluation and submission status</strong>
        <p>
          The test workflow, release times, eligible stocks, and submission fields
          are described above. This page is the unified test website. The Dataset
          publishes data only; the static Space displays public submission metadata only.
          Actual actions and receipts remain in administrator-private storage.
          Collection, summaries, baseline decisions, and CR calculation run locally.
          The receipt service remains unavailable until its hosting is verified.
          This website does not collect actions.
        </p>
      </aside>
      <TaskCitationNote task={2} />
    </main>
  );
}
