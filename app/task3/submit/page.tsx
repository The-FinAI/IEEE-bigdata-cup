import type { Metadata } from "next";
import { getTask3PublicConfig } from "../public-config";
import { SubmissionGuide } from "../submission-guide";
import { Task3Nav } from "../task3-nav";

export const metadata: Metadata = {
  title: "Task 3 Submission | FinReason Cup",
  description: "How to produce and upload Task 3 predictions.",
  alternates: {
    canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/",
  },
};

export default function Task3SubmitPage() {
  const config = getTask3PublicConfig();
  const linksReady =
    config.siteMode === "final" &&
    config.scoringSpace.state === "ready" &&
    config.testSpace.state === "ready";

  return (
    <main className="task-hub-page task1-page">
      <Task3Nav current="submit" />

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 3 / SUBMISSION</p>
            <h1>Submit Task 3 predictions on the web.</h1>
            <p>
              No pre-registration, approval, access code, or account is required. Practice is
              open now; the development and test phases open when their datasets are published.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Submission quick facts">
            <div>
              <dt>Practice</dt>
              <dd>Scores + receipt</dd>
            </div>
            <div>
              <dt>Test</dt>
              <dd>Receipt only</dd>
            </div>
          </dl>
        </div>
      </header>

      <SubmissionGuide
        scoringSpaceUrl={config.scoringSpace.url}
        testSpaceUrl={config.testSpace.url}
        linksReady={linksReady}
      />
    </main>
  );
}
