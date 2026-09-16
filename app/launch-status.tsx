import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BibtexCitation } from "./bibtex-citation";
import { getTask1PublicConfig } from "./task1/public-config";
import styles from "./paper-guidance.module.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const finchainBibtex = readFileSync(join(process.cwd(), "public/references/finchain.bib"), "utf8").trim();
const ieeeCupUrl = "https://bigdataieee.org/BigData2026/cup/";
const paperSubmissionUrl =
  "https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03";
const ieeeTemplateUrl =
  "https://www.ieee.org/conferences/publishing/templates.html";
const contactEmail = "zhuohan.xie@mbzuai.ac.ae";

export function LaunchStatus() {
  const config = getTask1PublicConfig();
  const spaceLinksAreReady = Boolean(
    config.siteMode === "final" &&
      config.developmentSpace.state === "ready" &&
      config.developmentSpace.url &&
      config.testSpace.state === "ready" &&
      config.testSpace.url,
  );

  return (
    <div className={styles.guidance}>
      <div className={styles.submissionPanel}>
        <div className={styles.panelHeading}>
          <h3>Working Notes submission</h3>
          <span className={styles.status}>SC03 OPEN</span>
        </div>
        <p className={styles.introduction}>
          Teams seeking final ranking and awards must submit a challenge paper
          through the official FinReason Cup track in CyberChair.
        </p>

        <dl className={styles.requirements}>
          <div>
            <dt>Paper length</dt>
            <dd>Up to 10 pages total, including references</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>IEEE two-column conference template</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>Single-blind; include author names and affiliations</dd>
          </div>
        </dl>

        <div className={styles.dates} aria-label="Working Notes deadlines">
          <div>
            <span>Working Notes</span>
            <strong>23 October 2026</strong>
            <span>23:59 AoE</span>
          </div>
          <div>
            <span>Feedback and acceptance</span>
            <strong>6 November 2026</strong>
          </div>
          <div>
            <span>Camera-ready</span>
            <strong>13 November 2026</strong>
            <span>23:59 AoE</span>
          </div>
        </div>

        <div className={styles.submissionActions}>
          <a className={styles.primaryLink} href={paperSubmissionUrl} target="_blank" rel="noreferrer">
            Submit paper in CyberChair <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span>SC03 · FinReason Cup</span>
        </div>
        <div className={styles.resourceLinks}>
          <a href={ieeeTemplateUrl} target="_blank" rel="noreferrer">
            Download the official IEEE conference templates
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href="https://bigdataieee.org/BigData2026/calls/papers/">
            Conference single-blind policy
          </a>
          <a href={ieeeCupUrl} target="_blank" rel="noreferrer">
            View the IEEE Big Data Cup overview
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>

      <details className={styles.supplement}>
        <summary>Schedule and publication requirements</summary>
        <p>
          Follow the organizer schedule updated on 7 September 2026 if CyberChair
          displays a different date. Competition submissions close separately on
          15 October 2026, 23:59 AoE.
        </p>
        <p>
          The organizers decide paper acceptance; selected accepted papers may
          enter the proceedings subject to conference requirements. Publication
          is not guaranteed.
        </p>
      </details>

      <details className={styles.supplement}>
        <summary>{spaceLinksAreReady ? "Task 1 is live with frozen participant data and direct uploads" : "Task 1 data and submission availability"}</summary>
        <p>
          Task 1 data and tools are released through the participant hub.
          {spaceLinksAreReady
            ? " No pre-registration or access code is required."
            : " Task 1 participant data is published; its two upload links remain under verification."}
        </p>
        {spaceLinksAreReady && (
          <>
            <p>
              <strong>Development:</strong> accepts Team Name plus a 580-row
              predictions ZIP, immediately returns Final answer, Reasoning steps,
              a receipt, and current rank, and publishes the team’s best eligible
              result on the public leaderboard.
            </p>
            <p>
              <strong>Test:</strong> accepts Team Name, Contact Email, and a 928-row
              predictions ZIP, then shows format feedback and an acceptance
              receipt with no online score or rank.
            </p>
          </>
        )}
        <div className={styles.resourceLinks}>
          <Link href="/task1/">Open Task 1 participant hub</Link>
          <Link href="/task1/leaderboard/">Open Task 1 leaderboard hub</Link>
          <Link href="/terms/">Read the Terms of Participation</Link>
          <Link href="/privacy/">Read the Privacy Notice</Link>
          <a href={`mailto:${contactEmail}`}>Contact the organizer team</a>
        </div>
      </details>
    </div>
  );
}

export function PaperReferences() {
  return (
    <div className={styles.references}>
      <article className={styles.referencePanel}>
        <span className={styles.referenceLabel}>Required benchmark reference · Task 1</span>
        <h3>
          <a href="https://aclanthology.org/2026.acl-long.662/">
            FinChain: A Symbolic Benchmark for Verifiable Chain-of-Thought Financial Reasoning
          </a>
        </h3>
        <p className={styles.referenceMetadata}>
          Zhuohan Xie et al. (2026) · ACL 2026, Volume 1: Long Papers, pages 14529–14553.
        </p>
        <p>
          Task 1 Working Notes must cite the benchmark paper. Copy the verified
          BibTeX below into your bibliography. It uses the published ACL 2026
          reference from the{" "}
          <a href="https://aclanthology.org/2026.acl-long.662/">ACL Anthology</a>.
        </p>
        <BibtexCitation bibtex={finchainBibtex} downloadUrl={`${basePath}/references/finchain.bib`} />
      </article>
      <div className={styles.overviewNote}>
        <h3>Task 1 overview paper</h3>
        <p>
          Task 1 Working Notes must also cite the Task 1 overview paper.
          Its verified BibTeX will be provided here by the organizers. Please do
          not create a placeholder citation or infer its title or author list.
        </p>
      </div>
      <p className={styles.resourceNote}>
        Cite the task data, tools, and any other resources used in your system as appropriate.
      </p>
    </div>
  );
}
