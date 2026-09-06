const starterKit = "https://github.com/The-FinAI/IEEE-bigdata-cup/tree/main/finreason_task3";

type SubmissionGuideProps = {
  scoringSpaceUrl: string | null;
  testSpaceUrl: string | null;
  // Gated independently. A single flag that required BOTH Spaces meant a build
  // with the scoring Space verified but the test Space not yet configured
  // published a hub row saying practice was open while this page offered no
  // upload link at all.
  scoringReady: boolean;
  testReady: boolean;
};

const prepareCommand = `cd finreason_task3
pip install -r requirements.txt
python scripts/prepare_public_dev.py`;

const validateCommand = `python scripts/validate_submission.py \\
    --predictions predictions.jsonl \\
    --reference data/public_dev_inputs.jsonl`;

const scoreCommand = `python scripts/score_submission.py \\
    --predictions predictions.jsonl \\
    --gold data/public_dev.jsonl \\
    --judge deterministic`;

const predictionLine =
  '{"id": "DEV_000000", "extracted_value": "-1284", "calculated_value": "1284"}';

export function SubmissionGuide({
  scoringSpaceUrl,
  testSpaceUrl,
  scoringReady,
  testReady,
}: SubmissionGuideProps) {
  return (
    <section className="submission-guide-card" id="how-to-submit" aria-labelledby="task3-guide-title">
      <header className="submission-guide-heading">
        <div>
          <p className="section-index">HOW TO SUBMIT</p>
          <h2 id="task3-guide-title">Five steps from data to receipt</h2>
        </div>
        <p>
          Task 3 is method-agnostic. You are scored on your predictions, not on how you
          produced them.
        </p>
      </header>

      <ol className="submission-guide-list" role="list" aria-label="Five Task 3 submission steps">
        <li>
          <span className="submission-step-number" aria-hidden="true">01</span>
          <div>
            <h3><span className="sr-only">Step 1 of 5: </span>Get the practice data.</h3>
            <p>
              Clone the <a href={starterKit}>Task 3 starter kit</a> and run its prepare script.
              It downloads the 332 public cases and writes both the answered and unanswered
              copies.
            </p>
            <pre tabIndex={0} aria-label="Prepare the practice data"><code>{prepareCommand}</code></pre>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">02</span>
          <div>
            <h3><span className="sr-only">Step 2 of 5: </span>Produce predictions.jsonl.</h3>
            <p>
              One JSON object per line, one line per case. Only three fields are required, and
              only <code>id</code> is used to match your prediction to a case — predictions are
              matched by <code>id</code>, never by row order, so you may write the lines in any
              order.
            </p>
            <pre tabIndex={0} aria-label="One prediction line"><code>{predictionLine}</code></pre>
            <p>
              Number formatting is free: <code>-1,284</code>, <code>-1284</code> and{" "}
              <code>(1,284)</code> are read as the same number. Emit <code>&quot;0&quot;</code>{" "}
              when your system cannot determine a value — never omit a line, because a missing
              id invalidates the whole submission rather than costing you one case.
            </p>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">03</span>
          <div>
            <h3><span className="sr-only">Step 3 of 5: </span>Validate before you upload.</h3>
            <p>
              The validator catches missing, duplicate and unknown ids, missing fields, empty
              values and malformed JSON. Exit code <code>0</code> means valid.
            </p>
            <pre tabIndex={0} aria-label="Validate the submission"><code>{validateCommand}</code></pre>
            <p>
              You can also score yourself locally against the practice answers, which are
              public. The rule-based judge is free, instant and offline:
            </p>
            <pre tabIndex={0} aria-label="Score locally"><code>{scoreCommand}</code></pre>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">04</span>
          <div>
            <h3><span className="sr-only">Step 4 of 5: </span>Upload.</h3>
            <p>
              Upload <code>predictions.jsonl</code> directly, or a ZIP containing exactly one
              root-level file named <code>predictions.jsonl</code>. The file must be UTF-8.
              Practice asks only for a Team Name; the development and test phases also ask for
              a Contact Email, which is never published and is stored only as a salted hash.
            </p>
            <div className="submission-guide-actions" aria-label="Task 3 upload links">
              {scoringReady && scoringSpaceUrl ? (
                <a href={scoringSpaceUrl} target="_blank" rel="noreferrer">
                  Practice and development upload
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Upload link under verification</span>
              )}
              {testReady && testSpaceUrl ? (
                <a href={testSpaceUrl} target="_blank" rel="noreferrer">
                  Test upload — opens when the test set is released
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Test link under verification</span>
              )}
            </div>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">05</span>
          <div>
            <h3><span className="sr-only">Step 5 of 5: </span>Read what comes back.</h3>
            <p>
              <strong>Practice</strong> returns the four rates immediately, broken down by DQC
              rule, plus a receipt. <strong>Development</strong> returns a provisional score at
              once and the official score when the judge finishes.{" "}
              <strong>Test</strong> returns an acceptance receipt and nothing else — no score,
              rank, or diagnostic is shown before the final results are released.
            </p>
            <p>
              A validation failure never costs you a submission quota. Only a file that reaches
              scoring is counted.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
