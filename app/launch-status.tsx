import Link from "next/link";

const ieeeCupUrl = "https://bigdataieee.org/BigData2026/cup/";
const loiUrl = "https://forms.gle/D4VJqjgtmcaC77DL8";
const paperSubmissionUrl =
  "https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03";
const ieeeTemplateUrl =
  "https://www.ieee.org/conferences/publishing/templates.html";
const contactEmail = "zhuohan.xie@mbzuai.ac.ae";

export function LaunchStatus() {
  return (
    <aside className="interest-form" aria-labelledby="launch-status-title">
      <div className="form-heading">
        <span id="launch-status-title">Paper submission</span>
        <strong>SC03 OPEN</strong>
      </div>

      <div className="launch-status-copy">
        <p>
          Teams seeking final ranking and awards must submit a challenge paper
          through the official FinReason Cup track in CyberChair.
        </p>
        <ul>
          <li>Length: up to 6 pages total, including references</li>
          <li>Format: IEEE two-column conference template</li>
          <li>Deadline: 15 November 2026, 23:59 AoE</li>
          <li>Track: SC03 · FinReason Cup</li>
        </ul>
      </div>

      <a
        className="button button-primary submit-button"
        href={paperSubmissionUrl}
        target="_blank"
        rel="noreferrer"
      >
        Submit paper in CyberChair
        <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>

      <p className="form-status" role="status">
        CyberChair has not yet updated its displayed deadline and currently
        shows a 10-page upload limit. The FinReason organizer deadline is 15
        November 2026, 23:59 AoE, and FinReason teams should submit no more than
        6 pages total, including references.
      </p>

      <div className="participant-notice">
        <strong>Separate Task 1 participant hub</strong>
        <p>
          Task 1 publishes the training, development, and test files through the participant hub.
          Development and test use separate submission pages. Development returns scores and can
          update the leaderboard immediately, while test returns only an acceptance receipt.
        </p>
        <div className="participant-notice-links">
          <Link href="/task1/">Open Task 1 participant hub</Link>
          <Link href="/task1/leaderboard/">Open Task 1 leaderboard hub</Link>
          <Link href="/terms/">Read the Terms of Participation</Link>
          <Link href="/privacy/">Read the Privacy Notice</Link>
          <a href={`mailto:${contactEmail}`}>Contact the organizer team</a>
        </div>
      </div>

      <a href={ieeeTemplateUrl} target="_blank" rel="noreferrer">
        Download the official IEEE conference templates
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a href={loiUrl} target="_blank" rel="noreferrer">
        Submit one Letter of Intent per team
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a href={ieeeCupUrl} target="_blank" rel="noreferrer">
        View the IEEE Big Data Cup overview
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
