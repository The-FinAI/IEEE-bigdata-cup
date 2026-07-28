const ieeeCupUrl = "https://bigdataieee.org/BigData2026/cup/";

export function LaunchStatus() {
  return (
    <aside className="interest-form" aria-labelledby="launch-status-title">
      <div className="form-heading">
        <span id="launch-status-title">Participant access</span>
        <strong>PRE-LAUNCH</strong>
      </div>

      <div className="launch-status-copy">
        <p>
          The official competition registration and starter-kit links are still
          being finalized. This page will become the stable source of truth for
          all participant-facing resources.
        </p>
        <ul>
          <li>Registration link: coming soon</li>
          <li>Starter kits and schemas: coming soon</li>
          <li>Submission platform: coming soon</li>
        </ul>
      </div>

      <a
        className="button button-primary submit-button"
        href={ieeeCupUrl}
        target="_blank"
        rel="noreferrer"
      >
        View IEEE Cup overview
        <span aria-hidden="true">↗</span>
      </a>

      <p className="form-status" role="status">
        No personal or team information is collected on this static site.
      </p>
    </aside>
  );
}
