import type { Metadata } from "next";
import Link from "next/link";
import { getTask3PublicConfig } from "./public-config";
import { Task3Nav } from "./task3-nav";

export const metadata: Metadata = {
  title: "Task 3 Participant Hub | FinReason Cup",
  description:
    "Task 3 Financial Audit Verification: data, phases, and submission routes.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/" },
};

const finmrDataset = "https://huggingface.co/datasets/TheFinAI/FinMR";
const starterKit = "https://github.com/The-FinAI/IEEE-bigdata-cup/tree/main/finreason_task3";

type PhaseCard = {
  name: string;
  slug: string;
  live: boolean;
  gold: string;
  feedback: string;
  ranked: string;
};

export default function Task3HubPage() {
  // Not merely a getter: resolveTask3PublicConfig validates every endpoint and,
  // in a "final" build, throws on any that is missing or unverified -- including
  // testSpace and leaderboardApi, which this page never renders. Removing the
  // call because those fields look unused would delete a build-time check.
  const config = getTask3PublicConfig();
  const scoringIsLive =
    config.siteMode === "final" && config.scoringSpace.state === "ready";

  const phases: PhaseCard[] = [
    {
      name: "Practice",
      slug: "practice",
      // Single source of truth. Hard-coding this as live let the table claim the
      // phase was open while the panel above said its link was still being
      // verified -- which is exactly what a build with no Task 3 configuration
      // produces.
      live: scoringIsLive,
      gold: "Public — the 332 FinMR cases, answers included",
      feedback: "Scored the moment you upload",
      ranked: "Never ranked",
    },
    {
      name: "Development",
      slug: "development",
      live: false,
      gold: "Held by the organizers",
      feedback: "Score, rank, and a public leaderboard",
      ranked: "Ranked",
    },
    {
      name: "Test",
      slug: "test",
      live: false,
      gold: "Held by the organizers",
      feedback: "An acceptance receipt only",
      ranked: "Decides the final result",
    },
  ];

  return (
    <main className="task-hub-page task1-page">
      <Task3Nav current="overview" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 3 / PARTICIPANT HUB</p>
            <h1>Financial Audit Verification</h1>
            <p>
              Read an SEC XBRL filing and report two numbers: the value the filing states
              for a target concept, and the value its own calculation relationships imply.
              This is targeted numeric-fact verification, not a full financial-statement audit.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Task 3 quick facts">
            <div>
              <dt>Practice</dt>
              <dd>{scoringIsLive ? "Open now" : "Link under verification"}</dd>
            </div>
            <div>
              <dt>Competition closes</dt>
              <dd>15 Oct 2026 · 23:59 AoE</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="task-platform-card" aria-labelledby="task3-phases-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">THE THREE PHASES</p>
            <h2 id="task3-phases-title">What is open, and what is not</h2>
          </div>
          <p>
            Only the practice phase accepts submissions today. The development and test
            datasets are still being built, and their pages will open when they are ready.
          </p>
        </div>

        <div className="finmmeval-table-shell" role="region" aria-labelledby="task3-phases-title" tabIndex={0}>
          <table className="baseline-reference-table">
            <thead>
              <tr>
                <th scope="col">Phase</th>
                <th scope="col">Status</th>
                <th scope="col">Answers</th>
                <th scope="col">What you get back</th>
                <th scope="col">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => (
                <tr key={phase.slug} data-phase={phase.slug}>
                  <th scope="row">
                    <span className="leaderboard-team-name">{phase.name}</span>
                  </th>
                  <td>
                    <span className="status-chip" data-state={phase.live ? "ready" : "pending"}>
                      {phase.live ? "Live" : "Coming soon"}
                    </span>
                  </td>
                  <td>{phase.gold}</td>
                  <td>{phase.feedback}</td>
                  <td>{phase.ranked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="task-platform-footnote">
          Practice is never ranked, and the reason is worth stating plainly: its answers are
          public, so any team could score 100% by reading them. It exists so you can rehearse
          the submission format against the real endpoint before it counts.
        </p>
      </section>

      <section className="task-platform-card" aria-labelledby="task3-data-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">DATA</p>
            <h2 id="task3-data-title">Where the practice data comes from</h2>
          </div>
          <p>
            This site hosts no Task 3 files. The 332 public practice cases are the Financial
            Mathematical Reasoning task of the FinAuditing benchmark, released as{" "}
            <a href={finmrDataset}>TheFinAI/FinMR</a>. The{" "}
            <a href={starterKit}>Task 3 starter kit</a> downloads them for you, and ships the
            validator, the scorer, and one baseline per way of running a model.
          </p>
        </div>
        <p className="task-platform-footnote">
          Every one of the 332 practice cases is built around one flagged Data Quality
          Committee rule — 110 for DQC_US_0015, 120 for DQC_US_0117, 102 for DQC_US_0126 — and
          in all of them the reported and calculated values disagree. A system that always
          predicted agreement would score zero.
        </p>
      </section>

      <section className="task-platform-card" aria-labelledby="task3-next-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">NEXT</p>
            <h2 id="task3-next-title">Run the practice set</h2>
          </div>
          <p>
            The <Link href="/task3/submit/">submission guide</Link> walks through producing
            <code> predictions.jsonl</code> and uploading it. The{" "}
            <Link href="/task3/leaderboard/">leaderboard page</Link> explains how the four
            rates are computed and shows the organizer baseline.
          </p>
        </div>
      </section>
      <aside className="task-hub-note">
        <strong>Competition and Working Notes deadlines</strong>
        <p>
          Schedule updated 7 September 2026, replacing the combined 15 November cutoff.
          Final competition submissions close on 15 October 2026, 23:59 Anywhere on Earth.
          Results are scheduled for 16 October after 12:00 UTC (16:00 Abu Dhabi time).
          Working Notes are due separately on 23 October 2026, 23:59 Anywhere on Earth.{" "}
          <Link href="/#timeline">Full competition and paper schedule</Link>.
        </p>
      </aside>
    </main>
  );
}
