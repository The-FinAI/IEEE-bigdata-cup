const ieeeCupUrl = "https://bigdataieee.org/BigData2026/cup/";
const loiUrl = "https://forms.gle/D4VJqjgtmcaC77DL8";

export function LaunchStatus() {
  return (
    <aside className="interest-form" aria-labelledby="launch-status-title">
      <div className="form-heading">
        <span id="launch-status-title">Participant access</span>
        <strong>LOI OPEN</strong>
      </div>

      <div className="launch-status-copy">
        <p>
          The Letter of Intent records one team response for challenge planning,
          organizer communication, and aggregate participation statistics.
          Technical participation and submission instructions will be released
          separately.
        </p>
        <ul>
          <li>Letter of Intent: open</li>
          <li>Starter kits and schemas: coming soon</li>
          <li>Submission platform: coming soon</li>
          <li>Participant support channel: coming soon</li>
        </ul>
      </div>

      <a
        className="button button-primary submit-button"
        href={loiUrl}
        target="_blank"
        rel="noreferrer"
      >
        Submit LOI
        <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>

      <p className="form-status" role="status">
        Please submit one response per team. Google Forms opens in a new tab.
      </p>

      <div className="participant-notice">
        <strong>Data use</strong>
        <p>
          Responses are available only to the organizer team and are used for
          challenge operations, communication permitted by the form, and
          aggregate reporting. Do not include sensitive information. The
          participant support contact and correction or deletion process will
          be published here with the participant guidance.
        </p>
      </div>

      <a href={ieeeCupUrl} target="_blank" rel="noreferrer">
        View the IEEE Big Data Cup overview
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
