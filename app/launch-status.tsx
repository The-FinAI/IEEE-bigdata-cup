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
          The Letter of Intent is open for teams planning to participate.
          Responses support challenge planning, organizer communication, and
          aggregate participation statistics.
        </p>
        <ul>
          <li>Letter of Intent: open</li>
          <li>Starter kits and schemas: coming soon</li>
          <li>Submission platform: coming soon</li>
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
      </a>

      <p className="form-status" role="status">
        Please submit one response per team. The form is hosted externally by
        Google Forms.
      </p>

      <a href={ieeeCupUrl} target="_blank" rel="noreferrer">
        View the IEEE Big Data Cup overview ↗
      </a>
    </aside>
  );
}
