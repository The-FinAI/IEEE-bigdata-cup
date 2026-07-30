import { LaunchStatus } from "./launch-status";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const loiUrl = "https://forms.gle/D4VJqjgtmcaC77DL8";

const tasks = [
  {
    number: "01",
    slug: "chain",
    code: "CHAIN",
    accent: "mint",
    eyebrow: "Symbolic reasoning",
    title: "Verifiable Financial Chain Reasoning",
    question: "Can a system provide an auditable path to a financial answer?",
    description:
      "Solve multi-step financial problems and provide a final answer plus a step-by-step reasoning trace, evaluated against gold traces generated from executable FinChain templates.",
    flow: ["Financial problem", "Step-by-step trace", "Answer + trace score"],
    data:
      "Planned FinChain-derived problems across core financial domains. The exact subset, trace format, ChainEval version, and tolerance policy will be frozen with the starter kit.",
    metrics: ["Final-answer accuracy", "ChainEval · provisional"],
  },
  {
    number: "02",
    slug: "hedge",
    code: "HEDGE",
    accent: "gold",
    eyebrow: "Sequential decisions",
    title: "Market-Neutral Hedging",
    question:
      "Can an agent exploit relative value without relying on net directional exposure?",
    description:
      "Select an asset pair and manage a zero-net-dollar position over time using point-in-time prices, news, and corporate filings. Final execution and position rules will be published with the scorer.",
    flow: ["Market context", "Paired actions", "Risk-aware return"],
    data:
      "Planned HERCULEAN-derived development and private evaluation splits. Exact windows, asset policy, costs, and validity rules will be published with the dataset release.",
    metrics: [
      "Cumulative return · CR",
      "Sharpe ratio · SR",
      "Max drawdown · MDD",
    ],
  },
  {
    number: "03",
    slug: "verify",
    code: "VERIFY",
    accent: "coral",
    eyebrow: "Structured verification",
    title: "Financial Audit Verification",
    question:
      "Can a reported XBRL fact be checked against its calculation context?",
    description:
      "Perform targeted numeric-fact verification on organizer-packaged SEC EDGAR XBRL filing materials by comparing reported and calculation-derived values. This is not a full financial-statement audit.",
    flow: ["Filing package", "Reported + calculated values", "Match status"],
    data:
      "Planned public filing cases with taxonomy metadata, followed by separately constructed held-out SEC filing cases subject to leakage review.",
    metrics: [
      "ACC · correct",
      "SER · format",
      "EER · extraction",
      "CER · calculation",
    ],
  },
];

const evaluationSteps = [
  {
    number: "01",
    title: "Submission contract",
    detail:
      "Published task contracts will define machine-checkable predictions, traces, and actions.",
  },
  {
    number: "02",
    title: "Task scorer",
    detail: "Each track measures the capability it is designed to expose.",
  },
  {
    number: "03",
    title: "Hidden evaluation",
    detail:
      "Separately constructed held-out seeds and cases are planned to reduce memorization and leakage.",
  },
  {
    number: "04",
    title: "Reproducibility review",
    detail:
      "Final rules will specify the reproducibility materials required from eligible finalists.",
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
    detail:
      "A separately constructed held-out evaluation and reproducibility review are planned.",
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
      "Teams planning to participate should submit one LOI using the verified link on this page. Technical participation, starter kit, and submission instructions will be published separately after organizer verification.",
  },
  {
    question: "Can a team enter more than one task?",
    answer:
      "Teams may indicate interest in any combination of tasks in the LOI. Final multi-task participation and submission rules will be published with the starter kits.",
  },
  {
    question: "Where will the competition run?",
    answer:
      "The IEEE overview currently lists Kaggle with an organizer-run Docker evaluation path. The organizer team is validating the participant workflow; final verified platform and submission links will appear here.",
  },
  {
    question: "Are cash prizes confirmed?",
    answer:
      "No FinReason cash prize or registration support is confirmed at this time. Award categories for task performance, reproducible open-source systems, and student teams remain provisional.",
  },
  {
    question: "What happens after an LOI is submitted?",
    answer:
      "Google Forms displays a confirmation after submission. Follow this organizer-maintained site for verified starter kit, schedule, support, and submission updates.",
  },
  {
    question: "How are LOI responses used?",
    answer:
      "Responses are used by the organizer team for challenge operations, communication permitted by the form, and aggregate participation statistics. Do not include sensitive information. The participant support contact and correction or deletion process will be published with the participant guidance.",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="masthead">
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
        </div>
      </header>

      <main className="site-shell" id="main-content" tabIndex={-1}>
        <div className="hero-stage" id="overview">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-label">
                <span className="live-indicator" aria-hidden="true" />
                Organizer-maintained challenge site
              </span>
              <span className="eyebrow-divider" aria-hidden="true" />
              <span className="eyebrow-location">
                Phoenix · 14–17 Dec 2026
              </span>
            </p>
            <h1>
              Financial AI
              <span>should show its work.</span>
            </h1>
            <p className="hero-summary">
              FinReason Cup challenges systems to reason, act, and verify across
              three complementary tracks—then prove how they reached the result.
            </p>
            <p className="hero-organizers">
              Led by The Fin AI, with contributors affiliated with MBZUAI,
              McGill, Stevens, Yale, and the University of Manchester.
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
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                className="button button-ghost"
                href="https://bigdataieee.org/BigData2026/cup/"
                target="_blank"
                rel="noreferrer"
              >
                IEEE Cup overview
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <p className="hero-note">
              The LOI is open for teams planning to participate. Dataset,
              starter kit, submission, and leaderboard links will appear here
              after organizer verification.
            </p>
          </div>

          <figure className="hero-art">
            <img
              src={`${basePath}/finreason-hero.webp`}
              alt="An abstract verification engine connecting reasoning nodes, balanced market signals, and filing evidence."
              width="1100"
              height="1100"
              decoding="async"
              fetchPriority="high"
            />
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
            <figcaption>
              <span>Proof system / 03 tracks</span>
              <strong>Reason · Hedge · Verify</strong>
            </figcaption>
          </figure>
        </section>

        <ul className="fact-rail" aria-label="Competition highlights">
          <li>
            <span>Tracks</span>
            <strong>03 technical tasks</strong>
          </li>
          <li>
            <span>Evaluation</span>
            <strong>Public + private</strong>
          </li>
          <li>
            <span>Finalist review</span>
            <strong>Reproducibility planned</strong>
          </li>
          <li>
            <span>Status</span>
            <strong className="status-open">LOI open</strong>
          </li>
        </ul>
      </div>

      <section className="proof-section" aria-labelledby="proof-title">
        <div className="proof-heading">
          <p className="section-index">00 / THE PREMISE</p>
          <h2 id="proof-title">
            A plausible answer is not yet a trustworthy answer.
          </h2>
        </div>
        <div
          className="proof-model"
          role="group"
          aria-label="FinReason verification model"
        >
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
            <h2>Three financial-AI capabilities. Three technical tracks.</h2>
            <p>
              Explore one or more tracks. Final participation rules will be
              published with the starter kits; each dossier summarizes the
              planned inputs, system behavior, outputs, and score signals.
            </p>
          </div>
        </div>

        <nav className="track-jump" aria-label="Task shortcuts">
          {tasks.map((task) => (
            <a href={`#task-${task.slug}`} key={task.slug}>
              <span>{task.number}</span>
              {task.code}
            </a>
          ))}
        </nav>

        <div className="dossier-list">
          {tasks.map((task) => (
            <article
              className={`task-dossier task-${task.accent}`}
              id={`task-${task.slug}`}
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

              <div
                className="task-flow"
                role="list"
                aria-label={`${task.title} workflow`}
              >
                {task.flow.map((step, index) => (
                  <div className="flow-step" role="listitem" key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>

              <div className="dossier-meta">
                <div>
                  <span className="meta-label">Data plan</span>
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
              <strong>Cumulative return · Sharpe ratio</strong>
              <strong>Maximum drawdown · provisional</strong>
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
              This organizer-maintained page keeps unconfirmed milestones
              marked TBD. Conference dates are confirmed; launch dates will be
              added only after organizer and IEEE verification.
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
          <h2>Share your interest in FinReason Cup.</h2>
          <p>
            The LOI collects one response per team for challenge planning,
            organizer communication, and aggregate participation statistics.
            Technical participation and submission instructions will be
            released separately.
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
                Follow this page for verified data, support, platform, and
                submission links.
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

      </main>

      <footer className="footer-stage">
        <div className="site-footer">
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
          <div className="footer-details">
            <p className="footer-copy">
              Organizer team led by The Fin AI, with contributors affiliated
              with MBZUAI, McGill, Stevens, Yale, and the University of
              Manchester. Affiliations do not imply institutional sponsorship.
              Final dates, eligibility, platform rules, awards, and data terms
              remain subject to organizer and IEEE confirmation.
            </p>
            <nav className="source-links" aria-label="Challenge sources">
              <a
                href="https://bigdataieee.org/BigData2026/cup/"
                target="_blank"
                rel="noreferrer"
              >
                IEEE Cup
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                href="https://github.com/mbzuai-nlp/finchain"
                target="_blank"
                rel="noreferrer"
              >
                FinChain
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                href="https://arxiv.org/abs/2605.14355"
                target="_blank"
                rel="noreferrer"
              >
                HERCULEAN
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href="https://thefin.ai/" target="_blank" rel="noreferrer">
                The Fin AI
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </nav>
            <p className="footer-updated">Last reviewed 30 July 2026.</p>
          </div>
          <a href="#overview">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
