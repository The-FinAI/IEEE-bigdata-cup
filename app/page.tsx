import { LaunchStatus } from "./launch-status";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const loiUrl = "https://forms.gle/D4VJqjgtmcaC77DL8";

const tasks = [
  {
    number: "01",
    code: "CHAIN",
    accent: "mint",
    eyebrow: "Symbolic reasoning",
    title: "Verifiable Financial Chain Reasoning",
    question: "Can the system expose every step behind a financial answer?",
    description:
      "Solve multi-step financial problems and return both the final answer and a structured reasoning trace that can be checked against executable references.",
    flow: ["Financial problem", "Reasoning trace", "Checked answer"],
    data:
      "FinChain-derived problems across valuation, accounting ratios, rates, portfolio analysis, risk, derivatives, and capital budgeting.",
    metrics: ["Accuracy", "ChainEval"],
  },
  {
    number: "02",
    code: "HEDGE",
    accent: "gold",
    eyebrow: "Sequential decisions",
    title: "Market-Neutral Hedging",
    question: "Can an agent reason about relative value without hiding market risk?",
    description:
      "Select an asset pair and manage a dollar-neutral position over time using prices, news, and corporate filings—rewarding relative reasoning rather than directional bets.",
    flow: ["Market context", "Paired actions", "Risk-aware return"],
    data:
      "A HERCULEAN-derived environment with public development windows and hidden evaluation windows or held-out assets.",
    metrics: ["Sharpe", "Return", "Drawdown"],
  },
  {
    number: "03",
    code: "VERIFY",
    accent: "coral",
    eyebrow: "Structured verification",
    title: "Financial Audit Verification",
    question: "Can a reported fact be traced back to its filing evidence?",
    description:
      "Identify a reported value and verify it against the XBRL calculation network and US-GAAP taxonomy of an SEC-style filing bundle.",
    flow: ["Filing bundle", "XBRL evidence", "Verified value"],
    data:
      "Public audit cases with filing bundles and taxonomy metadata, followed by hidden cases from newly collected public filings.",
    metrics: ["ACC", "SER", "EER", "CER"],
  },
];

const evaluationSteps = [
  {
    number: "01",
    title: "Submission contract",
    detail: "Predictions, traces, or actions must satisfy a machine-checkable format.",
  },
  {
    number: "02",
    title: "Task scorer",
    detail: "Each track measures the capability it is designed to expose.",
  },
  {
    number: "03",
    title: "Hidden evaluation",
    detail: "Held-out seeds, windows, assets, and filings reduce memorization.",
  },
  {
    number: "04",
    title: "Reproducibility review",
    detail: "Eligible finalist systems are rerun from code or notebooks.",
  },
];

const launchItems = [
  {
    state: "current",
    label: "Letter of Intent",
    date: "NOW",
    detail:
      "Teams planning to participate can share their task interests and contact details.",
  },
  {
    state: "upcoming",
    label: "Starter kits",
    date: "TBD",
    detail: "Schemas, validators, baselines, and samples are being prepared.",
  },
  {
    state: "upcoming",
    label: "Competition platform",
    date: "TBD",
    detail: "The public submission path will be linked after organizer testing.",
  },
  {
    state: "scheduled",
    label: "Private evaluation",
    date: "TBD",
    detail: "Hidden evaluation and finalist reproducibility checks follow.",
  },
  {
    state: "conference",
    label: "IEEE Big Data 2026",
    date: "14–17 DEC",
    detail: "Phoenix, Arizona.",
  },
];

const faqs = [
  {
    question: "How do teams submit a Letter of Intent?",
    answer:
      "Teams planning to participate should submit one LOI using the verified link on this page. Starter-kit and submission links will be published here after organizer verification.",
  },
  {
    question: "Can a team enter more than one task?",
    answer:
      "Teams may indicate interest in any combination of tasks in the LOI. Final multi-task participation and submission rules will be published with the starter kits.",
  },
  {
    question: "Where will the competition run?",
    answer:
      "The competition platform and reproducible evaluation path are being finalized. Public links will appear here after organizer testing is complete.",
  },
  {
    question: "Are cash prizes confirmed?",
    answer:
      "Award categories are planned for task winners, reproducible open-source systems, and student teams. Cash or registration support depends on confirmed IEEE or sponsor support; no cash amount is currently promised.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <div className="hero-stage" id="overview">
        <header className="masthead">
          <a className="wordmark" href="#overview" aria-label="FinReason Cup home">
            <span className="wordmark-symbol" aria-hidden="true">
              <span>F</span>
              <span>R</span>
            </span>
            <span className="wordmark-copy">
              FinReason Cup
              <small>IEEE Big Data Cup 2026</small>
            </span>
          </a>
          <nav className="primary-nav" aria-label="Primary navigation">
            <a href="#tracks">Tracks</a>
            <a href="#evaluation">Evaluation</a>
            <a href="#timeline">Timeline</a>
            <a href="#faq">FAQ</a>
            <a className="nav-action" href="#interest">
              <span className="nav-full">Participant access</span>
              <span className="nav-short">Access</span>
            </a>
          </nav>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-indicator" aria-hidden="true" />
              Official challenge overview
              <span className="eyebrow-divider" aria-hidden="true" />
              Phoenix · 14–17 Dec 2026
            </p>
            <h1>
              Financial AI
              <span>should show its work.</span>
            </h1>
            <p className="hero-summary">
              FinReason Cup challenges systems to reason, act, and verify across
              three complementary tracks—then prove how they reached the result.
            </p>
            <div className="hero-actions">
              <a
                className="button button-bright"
                href={loiUrl}
                target="_blank"
                rel="noreferrer"
              >
                Submit LOI
                <span aria-hidden="true">↗</span>
              </a>
              <a
                className="button button-ghost"
                href="https://bigdataieee.org/BigData2026/cup/"
                target="_blank"
                rel="noreferrer"
              >
                IEEE Cup overview
              </a>
            </div>
            <p className="hero-note">
              The LOI is open for teams planning to participate. Dataset,
              starter-kit, submission, and leaderboard links will appear here
              after organizer verification.
            </p>
          </div>

          <figure className="hero-art">
            <img
              src={`${basePath}/finreason-hero.png`}
              alt="An abstract verification engine connecting reasoning nodes, balanced market signals, and filing evidence."
            />
            <figcaption>
              <span>Proof system / 03 tracks</span>
              <strong>Reason · Hedge · Verify</strong>
            </figcaption>
            <div className="art-index art-index-one">
              <span>01</span>
              Reason
            </div>
            <div className="art-index art-index-two">
              <span>02</span>
              Hedge
            </div>
            <div className="art-index art-index-three">
              <span>03</span>
              Verify
            </div>
          </figure>
        </section>

        <div className="fact-rail" aria-label="Competition highlights">
          <div>
            <span>Tracks</span>
            <strong>03 technical tasks</strong>
          </div>
          <div>
            <span>Evaluation</span>
            <strong>Public + private</strong>
          </div>
          <div>
            <span>Finalists</span>
            <strong>Reproducible code</strong>
          </div>
          <div>
            <span>Status</span>
            <strong className="status-open">LOI open</strong>
          </div>
        </div>
      </div>

      <section className="proof-section" aria-labelledby="proof-title">
        <div className="proof-heading">
          <p className="section-index">00 / THE PREMISE</p>
          <h2 id="proof-title">
            A plausible answer is not yet a trustworthy answer.
          </h2>
        </div>
        <div className="proof-model" aria-label="FinReason verification model">
          <div>
            <span>Claim</span>
            <strong>What did the system conclude?</strong>
          </div>
          <span className="proof-arrow" aria-hidden="true">
            →
          </span>
          <div>
            <span>Evidence</span>
            <strong>What trace, action, or filing supports it?</strong>
          </div>
          <span className="proof-arrow" aria-hidden="true">
            →
          </span>
          <div className="proof-verified">
            <span>Verification</span>
            <strong>Can the result be checked and reproduced?</strong>
          </div>
        </div>
      </section>

      <section className="content-section tracks-section" id="tracks">
        <div className="split-heading">
          <p className="section-index">01 / TRACKS</p>
          <div>
            <h2>Three failure modes. Three technical tracks.</h2>
            <p>
              Enter one track or combine them. Each dossier makes the input,
              system behavior, output, and planned score signals visible at a
              glance.
            </p>
          </div>
        </div>

        <div className="dossier-list">
          {tasks.map((task) => (
            <article
              className={`task-dossier task-${task.accent}`}
              key={task.number}
            >
              <div className="dossier-title">
                <div className="track-identity">
                  <span className="track-number">{task.number}</span>
                  <span className="track-code">{task.code}</span>
                </div>
                <p>{task.eyebrow}</p>
                <h3>{task.title}</h3>
                <strong className="task-question">{task.question}</strong>
                <p className="task-description">{task.description}</p>
              </div>

              <div className="task-flow" aria-label={`${task.title} workflow`}>
                {task.flow.map((step, index) => (
                  <div className="flow-step" key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>

              <div className="dossier-meta">
                <div>
                  <span className="meta-label">Planned public data</span>
                  <p>{task.data}</p>
                </div>
                <div>
                  <span className="meta-label">Score signals</span>
                  <div className="metric-chips">
                    {task.metrics.map((metric) => (
                      <span key={metric}>{metric}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="evaluation-section" id="evaluation">
        <div className="evaluation-inner">
          <div className="split-heading split-heading-dark">
            <p className="section-index">02 / EVALUATION</p>
            <div>
              <h2>A correct answer is the beginning—not the whole score.</h2>
              <p>
                FinReason is designed to separate plausible output from robust,
                verifiable performance.
              </p>
            </div>
          </div>

          <div className="evaluation-flow">
            {evaluationSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>

          <div className="scorecard">
            <div className="scorecard-heading">
              <span>Planned scorecard</span>
              <strong>PROVISIONAL</strong>
            </div>
            <div className="score-row">
              <span>01 / CHAIN</span>
              <strong>Final-answer accuracy</strong>
              <strong>ChainEval</strong>
            </div>
            <div className="score-row">
              <span>02 / HEDGE</span>
              <strong>Sharpe · Return</strong>
              <strong>Maximum drawdown</strong>
            </div>
            <div className="score-row">
              <span>03 / VERIFY</span>
              <strong>ACC · SER</strong>
              <strong>EER · CER</strong>
            </div>
            <p>
              Final formulas, tolerances, tie-breaks, and validity rules will be
              published with the public scorers.
            </p>
          </div>
        </div>
      </section>

      <section className="content-section timeline-section" id="timeline">
        <div className="split-heading">
          <p className="section-index">03 / TIMELINE</p>
          <div>
            <h2>One source of truth as the competition comes online.</h2>
            <p>
              Unconfirmed milestones stay marked TBD. The conference dates are
              confirmed; launch dates will be added only after organizer and
              IEEE verification.
            </p>
          </div>
        </div>

        <div className="timeline-track">
          {launchItems.map((item, index) => (
            <article className={`timeline-node ${item.state}`} key={item.label}>
              <div className="timeline-marker" aria-hidden="true">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <p className="timeline-date">{item.date}</p>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="interest-wrap" id="interest">
        <div className="interest-intro">
          <p className="section-index">04 / PARTICIPANT ACCESS</p>
          <h2>One verified path into the competition.</h2>
          <p>
            The LOI is available now for organizer planning and communication.
            Teams planning to participate should submit one response per team.
            Starter kits, platform links, and participant guidance will be
            added after organizer review.
          </p>
          <div className="interest-points">
            <div>
              <span>01</span>
              <p>Review the three provisional technical tracks.</p>
            </div>
            <div>
              <span>02</span>
              <p>Use only links marked as verified on this page.</p>
            </div>
            <div>
              <span>03</span>
              <p>
                LOI responses support organizer communication and aggregate
                participation statistics.
              </p>
            </div>
          </div>
        </div>
        <LaunchStatus />
      </section>

      <section className="content-section faq-section" id="faq">
        <div className="split-heading">
          <p className="section-index">05 / FAQ</p>
          <div>
            <h2>What teams need to know now.</h2>
            <p>
              Details that are still under organizer review are stated as such,
              rather than presented as final rules.
            </p>
          </div>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="wordmark-symbol" aria-hidden="true">
            <span>F</span>
            <span>R</span>
          </span>
          <p>
            FinReason Cup
            <small>Reason · Hedge · Verify</small>
          </p>
        </div>
        <p className="footer-copy">
          Organized by The Fin AI with collaborators across MBZUAI, McGill,
          Stevens, Yale, and the University of Manchester. Final dates,
          eligibility, platform rules, awards, and data terms remain subject to
          organizer and IEEE confirmation.
        </p>
        <a href="#overview">Back to top ↑</a>
      </footer>
    </main>
  );
}
