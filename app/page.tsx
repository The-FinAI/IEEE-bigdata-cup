import { LaunchStatus, PaperReferences } from "./launch-status";
import { getTask1PublicConfig } from "./task1/public-config";
import { getTask3PublicConfig } from "./task3/public-config";
import styles from "./homepage.module.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const contactEmail = "zhuohan.xie@mbzuai.ac.ae";

const tasks = [
  {
    number: "01",
    slug: "chain",
    title: "Verifiable Financial Chain Reasoning",
    status: "TASK 1 LIVE",
    description: "Solve multi-step financial problems with a typed final answer and values for the published reasoning steps.",
    detail: "2,900 labeled training cases, 290 labeled local-development cases, 580 unlabeled leaderboard-development questions, and 928 public test questions.",
    metrics: ["Final answer", "Reasoning steps"],
    href: "/task1/",
    link: "Open Task 1 hub",
  },
  {
    number: "02",
    slug: "hedge",
    title: "Market-Neutral Hedging",
    status: "TRAINING DATA AVAILABLE",
    description: "Manage paired asset positions with zero net dollar exposure using point-in-time prices, news, and corporate filings.",
    detail: "HERCULEAN training data is available. Evaluation windows, execution costs, and final submission rules will follow with the scorer.",
    metrics: ["Return", "Sharpe ratio", "Drawdown"],
    href: "/task2/",
    link: "Open Task 2 hub",
  },
  {
    number: "03",
    slug: "verify",
    title: "Financial Audit Verification",
    status: "PUBLIC PRACTICE AVAILABLE",
    description: "Verify reported numeric facts against their calculation context in organizer-packaged SEC EDGAR XBRL filings.",
    detail: "Explore the starter kit, validator, and public practice workflow. See the task hub for phase availability and held-out evaluation updates.",
    metrics: ["Accuracy", "Format", "Extraction", "Calculation"],
    href: "/task3/",
    link: "Open Task 3 hub",
  },
];

const launchItems = [
  {
    state: "scheduled",
    label: "Competition closes · Tasks 1–3",
    date: "15 OCT · 23:59 AOE",
    detail: "Final system submissions and required solution materials are due through each task’s competition route.",
  },
  {
    state: "scheduled",
    label: "Final competition results",
    date: "16 OCT",
    detail: "Results are released after the AoE cutoff has passed, no earlier than 16:00 Abu Dhabi time (12:00 UTC).",
  },
  {
    state: "scheduled",
    label: "Working Notes due",
    date: "23 OCT · 23:59 AOE",
    detail: "Submit the team’s challenge paper through CyberChair SC03, up to 10 pages total including references.",
  },
  {
    state: "scheduled",
    label: "Review feedback + acceptance",
    date: "6 NOV",
    detail: "The organizers return paper feedback and acceptance decisions.",
  },
  {
    state: "scheduled",
    label: "Camera-ready papers due",
    date: "13 NOV · 23:59 AOE",
    detail: "Accepted teams submit their revised, camera-ready papers.",
  },
  {
    state: "scheduled",
    label: "Organizer overview due",
    date: "20 NOV",
    detail: "The organizers submit the challenge overview to the conference.",
  },
  {
    state: "scheduled",
    label: "Winning teams announced",
    date: "25 NOV",
    detail: "Award announcement. Competition results are released earlier, on 16 October.",
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
    question: "Can I revise my Task 1 Test submission?",
    answer:
      "Yes. Test submissions are unlimited before 15 October 2026, 23:59 Anywhere on Earth, with no daily or total count limit. Keep the same Team Name and Contact Email. Your latest accepted, valid submission replaces earlier versions for final evaluation; invalid or rejected uploads do not. An identical repeat upload returns its original receipt and acceptance time, rather than creating a new revision. This policy was updated on 16 September 2026.",
  },
  {
    question: "Should Working Notes be anonymous?",
    answer:
      "Keep author names and affiliations in your Working Notes PDF. FinReason follows the conference's published single-blind review policy: reviewers can see author identities. Submit through CyberChair SC03 using the IEEE two-column format, up to 10 pages including references.",
  },
  {
    question: "Where do teams submit the challenge paper?",
    answer:
      "Use the official FinReason Cup SC03 track in CyberChair. Teams seeking final ranking and awards must submit Working Notes (a challenge paper) of up to 10 pages total, including references, in the IEEE two-column conference format by 23 October 2026, 23:59 Anywhere on Earth.",
  },
  {
    question: "Is the paper submission also the competition submission?",
    answer:
      "No. Final system submissions and required solution materials for all three tasks are due through the task-specific competition routes by 15 October 2026, 23:59 Anywhere on Earth. Working Notes use CyberChair SC03 and are due separately on 23 October 2026, 23:59 Anywhere on Earth. Use the participant hubs for current task availability and upload instructions.",
  },
  {
    question: "Which schedule should teams follow if CyberChair displays a different date?",
    answer:
      "CyberChair currently displays its deadline as to be announced and allows up to 10 pages including references. Follow the organizer schedule updated on 7 September 2026: competition submissions close on 15 October, Working Notes are due on 23 October, and camera-ready papers are due on 13 November, each at 23:59 Anywhere on Earth. This replaces the previously published combined 15 November cutoff. CyberChair display settings may take time to reflect this update.",
  },
  {
    question: "Does submitting a challenge paper guarantee publication?",
    answer:
      "No. The organizers review the Working Notes and decide paper acceptance, with feedback and decisions scheduled for 6 November. Selected accepted papers may be included in the conference proceedings, subject to conference publication, camera-ready, registration, and presentation requirements. Participation, ranking, or a certificate does not guarantee paper acceptance or proceedings publication.",
  },
  {
    question: "Can a team enter more than one task?",
    answer:
      "Task 1 is open for direct participation now. Multi-task participation and the separate Task 2 and Task 3 submission rules will be published with those starter kits.",
  },
  {
    question: "Where will the competition run?",
    answer:
      "The Task 1 participant hub provides the training, development, and test downloads. Teams upload predictions directly through separate development and test submission pages. Development returns scores and updates the public leaderboard immediately; test shows format feedback and an acceptance receipt, with no online score or rank. The paper route remains separate through CyberChair SC03.",
  },
  {
    question: "What certificates and prizes are available?",
    answer:
      "FinReason does not offer cash prizes. Registration support is not confirmed at this time, and the organizers do not promise registration funding. A team will receive a participation certificate if it submits both (1) at least one valid final solution under the applicable task rules by 15 October 2026, 23:59 Anywhere on Earth and (2) Working Notes through CyberChair SC03 by 23 October 2026, 23:59 Anywhere on Earth. Winning teams will receive a winner certificate. Additional award categories remain provisional until published. Certificates do not imply paper acceptance or publication.",
  },
  {
    question: "Does Task 1 require registration or a team code?",
    answer:
      "No. Choose a consistent team name and submit directly. Development asks for Team Name and a canonical ZIP. Test asks for the same Team Name, a Contact Email, and a canonical ZIP. The Contact Email is private, is not used as a login, and is used only for submission identification, submission-related support, matching final results to the related challenge paper, and selecting the latest accepted test submission and handling repeat uploads through a non-public pseudonymous identifier.",
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
  const task1Ready = Boolean(config.siteMode === "final" && config.developmentSpace.state === "ready" && config.testSpace.state === "ready");
  // Task 3's badge used to be the hard-coded string "PUBLIC PRACTICE
  // AVAILABLE", which went stale the moment the development and test phases
  // opened. Derive it, so the card cannot outlive the state it describes.
  const task3Config = getTask3PublicConfig();
  const task3Ready = Boolean(
    task3Config.siteMode === "final" &&
      task3Config.scoringSpace.state === "ready" &&
      task3Config.testSpace.state === "ready",
  );

  const badgeIsLive = (number: string) =>
    (number === "01" && task1Ready) || (number === "03" && task3Ready);
  const badgeLabel = (number: string, fallback: string) => {
    if (number === "01") return task1Ready ? "TASK 1 LIVE" : "PARTICIPANT DATA AVAILABLE";
    if (number === "03") return task3Ready ? "TASK 3 LIVE" : "PUBLIC PRACTICE AVAILABLE";
    return fallback;
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="#overview" aria-label="FinReason Cup home">
            <span className={styles.brandMark} aria-hidden="true">FR<span>26</span></span>
            <span>FinReason Cup<small>IEEE Big Data 2026</small></span>
          </a>
          <nav className={styles.nav} aria-label="Primary navigation">
            <a href="#tracks">Tasks</a>
            <a href="#timeline">Dates</a>
            <a href="#interest">Working Notes</a>
            <a href="#paper-references">Citations</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className={styles.headerAction} href={`${basePath}/task1/`}>Participate <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main id="main-content">
        <section className={`${styles.container} ${styles.hero}`} id="overview" aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.statusDot} /> IEEE BIG DATA CUP · 2026</p>
            <h1 id="hero-title">FinReason Cup<span>2026</span></h1>
            <p className={styles.heroDescription}>Agentic financial reasoning,<br className={styles.desktopBreak} /> hedging, and audit verification.</p>
            <p className={styles.heroNote}>Three tasks for building and evaluating financial AI systems. Explore the data, develop your approach, and submit your results.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#tracks">Explore the tasks <span aria-hidden="true">↓</span></a>
              <a className={styles.secondaryButton} href={`${basePath}/task1/leaderboard/`}>Task 1 leaderboard <span aria-hidden="true">↗</span></a>
            </div>
            <p className={styles.conferenceNote}>14–17 December 2026 <span aria-hidden="true">·</span> Phoenix, Arizona</p>
          </div>
          <aside className={styles.deadlinePanel} aria-labelledby="deadline-heading">
            <div className={styles.panelTop}><span className={styles.panelLabel}>PARTICIPANT SCHEDULE</span><span className={styles.yearTag}>2026</span></div>
            <h2 id="deadline-heading">Dates to plan around</h2>
            <div className={styles.keyDate}>
              <time dateTime="2026-10-15"><span>OCT</span>15</time>
              <div><strong>Competition closes</strong><p>Tasks 1–3 · 23:59 AoE</p></div>
            </div>
            <div className={styles.keyDate}>
              <time dateTime="2026-10-23"><span>OCT</span>23</time>
              <div><strong>Working Notes due</strong><p>CyberChair SC03 · 23:59 AoE</p></div>
            </div>
            <div className={styles.panelFoot}><span>Results from 16 October</span><a href="#timeline">Full schedule <span aria-hidden="true">↗</span></a></div>
          </aside>
        </section>

        <div className={styles.container}>
          {task3Ready ? (
            <aside className={styles.notice} aria-label="Task 3 is open">
              <span className={styles.noticeLabel}>Task 3 is open <span>24 Sep 2026</span></span>
              <p>
                All three phases of <a href={`${basePath}/task3/`}>Financial Audit Verification</a>{" "}
                accept submissions. <strong>Practice</strong> scores you instantly against 332
                public cases and is never ranked. <strong>Development</strong> scores and ranks
                you on the public leaderboard. <strong>Test</strong> returns an acceptance
                receipt and decides the final result. The development and test questions &mdash;
                680 cases each, answers withheld &mdash; are published as{" "}
                <a href="https://huggingface.co/datasets/YanAdjeNole/FinReason-Task3">
                  YanAdjeNole/FinReason-Task3
                </a>.
              </p>
            </aside>
          ) : null}
          <aside className={styles.notice} aria-label="Schedule update">
            <span className={styles.noticeLabel}>Schedule update <span>7 Sep 2026</span></span>
            <p>Competition submissions now close <strong>15 October</strong>; Working Notes are due <strong>23 October</strong>. These dates replace the previous combined 15 November cutoff.</p>
          </aside>
        </div>

        <section className={`${styles.container} ${styles.section}`} id="tracks" aria-labelledby="tasks-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / COMPETITION TASKS</p><h2 id="tasks-title">Choose your task</h2></div><p>Each participant hub contains its data, rules,<br className={styles.desktopBreak} /> and current submission options.</p></div>
          <div className={styles.taskGrid}>
            {tasks.map((task) => (
              <article className={styles.taskCard} id={task.slug} key={task.number}>
                <div className={styles.taskTop}><span className={styles.taskNumber}>TASK {task.number}</span><span className={badgeIsLive(task.number) ? styles.liveBadge : styles.phaseBadge}>{badgeLabel(task.number, task.status)}</span></div>
                <h3>{task.title}</h3>
                <p className={styles.taskDescription}>{task.description}</p>
                <div className={styles.metrics} aria-label={`Task ${task.number} evaluation measures`}>{task.metrics.map(metric => <span key={metric}>{metric}</span>)}</div>
                <details className={styles.taskDetails}><summary>Data &amp; evaluation details</summary><p>{task.detail}{task.number === "02" && " The displayed measures are provisional until final scoring rules are published."}{task.number === "03" && " This task evaluates targeted numeric checks, not a full financial-statement audit."}</p></details>
                <a className={styles.taskLink} href={`${basePath}${task.href}`}>{task.link}<span aria-hidden="true">↗</span></a>
              </article>
            ))}
          </div>
          <div className={styles.taskQuickLinks}><span>Task 1 quick links</span><a href={`${basePath}/task1/submit/`}>Submission guide ↗</a><a href={`${basePath}/task1/leaderboard/`}>Development leaderboard ↗</a><a href={`${basePath}/task1/leaderboard/test/`}>Test submission status ↗</a></div>
        </section>

        <section className={styles.evaluationBand} id="evaluation" aria-labelledby="evaluation-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / EVALUATION</p><h2 id="evaluation-title">From development to final results</h2></div></div>
            <div className={styles.evaluationGrid}>
              <article><span className={styles.stepNumber}>01</span><h3>Develop and validate</h3><p>Use the published data, schemas, and validators. Task 1 development uploads return separate final-answer and reasoning-step scores.</p></article>
              <article><span className={styles.stepNumber}>02</span><h3>Submit test predictions</h3><p>Task 1 allows unlimited submissions before the deadline. Keep the same Team Name and Contact Email; the latest accepted, valid version is used.</p></article>
              <article><span className={styles.stepNumber}>03</span><h3>Receive final results</h3><p>Task 1 test answers remain private; test scores and ranks are withheld until final results. Follow each hub for task-specific evaluation rules.</p></article>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.section}`} id="timeline" aria-labelledby="timeline-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>03 / KEY DATES</p><h2 id="timeline-title">Competition &amp; paper schedule</h2></div><p>All dates are in 2026.<br />AoE = Anywhere on Earth (UTC−12).</p></div>
          <ol className={styles.schedule}>
            {launchItems.map((item, index) => <li className={index === 0 || index === 2 ? styles.scheduleKey : undefined} key={item.label}><span className={styles.scheduleDate}>{item.date}</span><div><h3>{item.label}</h3><p>{item.detail}</p></div></li>)}
          </ol>
          <p className={styles.scheduleNote}>The 15 October AoE deadline passes at 12:00 UTC on 16 October. Follow the dates here if CyberChair has not yet updated its displayed deadline.</p>
        </section>

        <section className={`${styles.container} ${styles.section} ${styles.divider}`} id="interest" aria-labelledby="papers-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>04 / WORKING NOTES</p><h2 id="papers-title">Prepare your challenge paper</h2></div><p>Prediction files go through the task hubs.<br />Working Notes go through CyberChair SC03.</p></div>
          <LaunchStatus />
        </section>

        <section className={`${styles.container} ${styles.section} ${styles.divider}`} id="paper-references" aria-labelledby="references-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>05 / REFERENCES</p><h2 id="references-title">Citations for your paper</h2></div><p>Use the supplied BibTeX<br />to keep reference details consistent.</p></div>
          <PaperReferences />
        </section>

        <section className={`${styles.container} ${styles.section} ${styles.divider}`} id="faq" aria-labelledby="faq-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>06 / PARTICIPANT FAQ</p><h2 id="faq-title">Questions &amp; answers</h2></div><a className={styles.textLink} href={`mailto:${contactEmail}`}>Contact the organizers ↗</a></div>
          <div className={styles.faqGrid}>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}><a className={styles.brand} href="#overview"><span className={styles.brandMark} aria-hidden="true">FR<span>26</span></span><span>FinReason Cup<small>IEEE Big Data 2026</small></span></a><a href="#overview">Back to top ↑</a></div>
          <p className={styles.footerDescription}>Led by The Fin AI, with contributors affiliated with MBZUAI, McGill, Stevens, Yale, and the University of Manchester. Affiliations do not imply institutional sponsorship.</p>
          <div className={styles.footerBottom}><nav aria-label="Policies and sources"><a href={`${basePath}/terms/`}>Terms</a><a href={`${basePath}/privacy/`}>Privacy</a><a href={`mailto:${contactEmail}`}>Contact</a><a href="https://bigdataieee.org/BigData2026/cup/" target="_blank" rel="noreferrer">IEEE Cup ↗</a><a href="https://github.com/mbzuai-nlp/finchain" target="_blank" rel="noreferrer">FinChain ↗</a><a href="https://arxiv.org/abs/2605.14355" target="_blank" rel="noreferrer">HERCULEAN ↗</a><a href="https://thefin.ai/" target="_blank" rel="noreferrer">The Fin AI ↗</a></nav><p>Updated 16 September 2026</p></div>
        </div>
      </footer>
    </div>
  );
}
