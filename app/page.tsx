import { LaunchStatus } from "./launch-status";
import { getTask1PublicConfig } from "./task1/public-config";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const paperSubmissionUrl =
  "https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03";
const contactEmail = "zhuohan.xie@mbzuai.ac.ae";

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
      "Solve multi-step financial problems and submit a typed final answer plus values for the published intermediate-step slots. The frozen Task 1 scorer reports the two results separately.",
    flow: ["Financial problem", "Answer + reasoning steps", "Two development scores"],
    data:
      "Released: 2,900 labeled training cases, 290 labeled local-development cases, 580 unlabeled leaderboard-development questions, and 928 public test questions. The Task 1 hub publishes the frozen schema and validator, plus the current submission guide.",
    metrics: ["Final answer", "Reasoning steps"],
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
      "Training data is available from HERCULEAN: prices, news, and corporate filings in Parquet format. Development and private evaluation splits, exact windows, asset policy, costs, and validity rules will be published with the scorer.",
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
      "Task 1 publishes a machine-checkable prediction schema, validator, and scorer. Task 2 and Task 3 contracts will follow after organizer verification.",
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
      "Task 1 test answers remain private; test scores and ranks are withheld until final results. Task 2 and Task 3 held-out policies remain under organizer review.",
  },
  {
    number: "04",
    title: "Reproducibility review",
    detail:
      "Task-specific code and reproducibility requirements will be published before final submission.",
  },
];

const buildLaunchItems = (spaceLinksAreReady: boolean) => [
  {
    state: "current",
    label: "Task 1 direct submission",
    date: spaceLinksAreReady ? "OPEN" : "VERIFYING",
    detail: spaceLinksAreReady
      ? "No pre-registration or access code is required. Submit a canonical ZIP directly through the development or test page."
      : "No pre-registration or access code will be required. The two direct-upload links remain under verification.",
  },
  {
    state: "current",
    label: "Task 1 participant hub",
    date: "DATA LIVE",
    detail:
      "Training, development, and test files, plus the submission guide and practice baselines, are live. The participant hub shows current upload availability.",
  },
  {
    state: "upcoming",
    label: "Task 2 + Task 3 release",
    date: "PENDING",
    detail:
      "Task 2 training data is available now. Remaining datasets, contracts, scorers, submission routes, and task-specific dates will follow organizer testing.",
  },
  {
    state: "scheduled",
    label: "Final paper + solution",
    date: "15 NOV · 23:59 AOE",
    detail:
      "The challenge paper and solution materials specified in the final task rules are due.",
  },
  {
    state: "scheduled",
    label: "Winning teams announced",
    date: "25 NOV",
    detail: "Final results and winning teams are scheduled to be announced.",
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
    question: "Where do teams submit the challenge paper?",
    answer:
      "Use the official FinReason Cup SC03 track in CyberChair. Teams seeking final ranking and awards must submit a challenge paper of up to 6 pages total, including references, in the IEEE two-column conference format by 15 November 2026, 23:59 Anywhere on Earth.",
  },
  {
    question: "Is the paper submission also the competition submission?",
    answer:
      "No. CyberChair SC03 is for the challenge paper. Task 1 solution files use the separate development and test submission pages linked from the participant hub. Both routes share the final submission deadline.",
  },
  {
    question: "Why does CyberChair show a 10-page limit and deadline TBA?",
    answer:
      "CyberChair has not yet updated its displayed deadline and currently shows a 10-page upload limit. The FinReason Cup organizer deadline is 15 November 2026, 23:59 Anywhere on Earth, and FinReason teams should submit no more than 6 pages total, including references.",
  },
  {
    question: "Does submitting a challenge paper guarantee publication?",
    answer:
      "No. Any publication is subject to conference peer review, acceptance, camera-ready submission, registration, and presentation requirements.",
  },
  {
    question: "Can a team enter more than one task?",
    answer:
      "Task 1 is open for direct participation now. Multi-task participation and the separate Task 2 and Task 3 submission rules will be published with those starter kits.",
  },
  {
    question: "Where will the competition run?",
    answer:
      "The Task 1 participant hub provides the training, development, and test downloads. Teams upload predictions directly through separate development and test submission pages. Development returns scores and updates the public leaderboard immediately; test returns a receipt only, with no online score or rank. The paper route remains separate through CyberChair SC03.",
  },
  {
    question: "What certificates and prizes are available?",
    answer:
      "FinReason does not offer cash prizes. Registration support is not confirmed at this time. A team will receive a participation certificate if it submits both (1) at least one valid final solution under the applicable task rules and (2) a challenge paper through CyberChair SC03 by 15 November 2026, 23:59 Anywhere on Earth. Winning teams will receive a winner certificate. Additional award categories remain provisional until published. Certificates do not imply paper acceptance or publication.",
  },
  {
    question: "Does Task 1 require registration or a team code?",
    answer:
      "No. Choose a consistent team name and submit directly. Development asks for Team Name and a canonical ZIP. Test asks for the same Team Name, a Contact Email, and a canonical ZIP. The Contact Email is private, is not used as a login, and is used only for submission identification, submission-related support, matching final results to the related challenge paper, and enforcing test submission quotas and replay protection through a non-public pseudonymous identifier.",
  },
  {
    question: "What happens after a Task 1 upload?",
    answer:
      "An accepted development upload immediately shows the Final answer score, Reasoning steps score, receipt ID, and current rank, and updates the public development leaderboard. An accepted test upload shows only a receipt; test scores, ranks, diagnostics, and score-derived signals remain hidden until final results.",
  },
  {
    question: "How can participants contact the organizer team?",
    answer: (
      <>
        Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> for
        participant support, submission questions, team-name corrections, or
        privacy requests. Include the team name and task number when
        applicable, but do not send a submission archive by
        email.
      </>
    ),
  },
];

export default function Home() {
  const config = getTask1PublicConfig();
  const spaceLinksAreReady = Boolean(
    config.siteMode === "final" &&
      config.developmentSpace.state === "ready" &&
      config.developmentSpace.url &&
      config.testSpace.state === "ready" &&
      config.testSpace.url,
  );
  const launchItems = buildLaunchItems(spaceLinksAreReady);

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
            <a href={`${basePath}/task1/`}>Task 1</a>
            <a href={`${basePath}/task2/`}>Task 2</a>
            <a href="#tracks">Tracks</a>
            <a href="#evaluation">Evaluation</a>
            <a href="#timeline">Timeline</a>
            <a href="#faq">FAQ</a>
            <a className="nav-action" href="#interest">
              <span className="nav-full">Paper details</span>
              <span className="nav-short">Paper</span>
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
              <a className="button button-bright" href={`${basePath}/task1/`}>
                Open Task 1 hub
                <span aria-hidden="true">→</span>
              </a>
              <a
                className="button button-ghost"
                href={paperSubmissionUrl}
                target="_blank"
                rel="noreferrer"
              >
                Submit paper
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <p className="hero-note">
              The CyberChair paper channel is open. The Task 1 participant hub
              publishes the canonical data and current direct-upload status.
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
            <span>Final report</span>
            <strong>Up to 6 pages</strong>
          </li>
          <li>
            <span>Deadline</span>
            <strong>15 Nov · 23:59 AoE</strong>
          </li>
          <li>
            <span>Status</span>
            <strong className="status-open">SC03 paper channel open</strong>
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
              {spaceLinksAreReady
                ? "Task 1 is live with frozen participant data and direct uploads. "
                : "Task 1 participant data and tools are live; its two upload links remain under verification. "}
              Task 2 and Task 3 contracts remain in preparation; each dossier
              summarizes the current inputs, system behavior, outputs, and
              score signals.
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
                  <span className="meta-label">Data status</span>
                  <p>{task.data}</p>
                  {task.number === "02" && (
                    <a className="button button-primary" href={`${basePath}/task2/`}>
                      Download Task 2 training data
                    </a>
                  )}
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
              <span>Scorecard status</span>
              <strong>TASK 1 LIVE</strong>
            </div>
            <div className="score-row">
              <span>01 / CHAIN</span>
              <strong>Final answer</strong>
              <strong>Reasoning steps</strong>
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
              Task 1 uses the published scorer and labels above. Task 2 and Task
              3 formulas, tolerances, tie-breaks, and validity rules will be
              published with their public scorers.
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
              {spaceLinksAreReady
                ? "Task 1 data and direct uploads are live. "
                : "Task 1 data is live; its two upload links remain under verification. "}
              Task 2 training data is available now. Remaining Task 2 and Task 3
              release dates will be added after organizer testing. Final paper and solution submissions are due on 15
              November.
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
          <p className="section-index">04 / SUBMISSION</p>
          <h2>Paper and competition files use separate routes.</h2>
          <p>
            Teams seeking final ranking and awards submit the challenge paper
            through CyberChair SC03. Solution materials specified in the final
            task rules use a separate participant path. The Task 1 hub is
            the stable entry point for public data downloads, direct-upload
            status, and the development leaderboard.
          </p>
          <div className="interest-points">
            <div>
              <span>01</span>
              <p>
                Submit a paper of up to 6 pages total, including references,
                using the IEEE two-column conference format.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                Upload the paper through the official FinReason Cup SC03 track
                in CyberChair.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                Submit the final paper and solution materials by 15 November
                2026, 23:59 Anywhere on Earth.
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
              Task-specific dates, platform settings, award categories, and
              resource licenses are published only after organizer verification.
            </p>
            <nav className="source-links" aria-label="Participant information and challenge sources">
              <a href={`${basePath}/terms/`}>Terms</a>
              <a href={`${basePath}/privacy/`}>Privacy</a>
              <a href={`mailto:${contactEmail}`}>Contact</a>
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
            <p className="footer-updated">Last reviewed 3 September 2026.</p>
          </div>
          <a href="#overview">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
