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
          The optional Letter of Intent is open for planning, communication, and
          aggregate participation statistics. It is not required to access the
          data, enter a task, or submit a solution.
        </p>
        <ul>
          <li>Optional Letter of Intent: open</li>
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
        Submit optional LOI
        <span aria-hidden="true">↗</span>
      </a>

      <p className="form-status" role="status">
        Teams may participate even if they do not submit the LOI. The form is
        hosted externally by Google Forms.
      </p>

      <a href={ieeeCupUrl} target="_blank" rel="noreferrer">
        View the IEEE Big Data Cup overview ↗
      </a>
    </aside>
  );
}
