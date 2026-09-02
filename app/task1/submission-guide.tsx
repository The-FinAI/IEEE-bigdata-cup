const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const participantRepository = "https://github.com/The-FinAI/IEEE-bigdata-cup";
const letterOfIntent = "https://forms.gle/D4VJqjgtmcaC77DL8";
const predictionSchema =
  "https://huggingface.co/spaces/Zhuohan/finreason-task1-development/blob/main/schemas/task1_prediction.schema.json";
const paperSubmission =
  "https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03";
const ieeeTemplate = "https://www.ieee.org/conferences/publishing/templates.html";

type SubmissionGuideProps = {
  developmentSpaceUrl: string | null;
  testSpaceUrl: string | null;
  linksReady: boolean;
};

const developmentTemplateCommand =
  "python3 scripts/task1_cli.py baseline-b0 --questions public/task1/data/development/leaderboard_questions.jsonl > blank_predictions.jsonl";
const testTemplateCommand =
  "python3 scripts/task1_cli.py baseline-b0 --questions public/task1/data/test/test_questions.jsonl > blank_predictions.jsonl";

const developmentCommands = `python3 scripts/task1_cli.py validate --questions public/task1/data/development/leaderboard_questions.jsonl --predictions predictions.jsonl
python3 scripts/task1_cli.py package --questions public/task1/data/development/leaderboard_questions.jsonl --predictions predictions.jsonl --output submission.zip
python3 scripts/task1_cli.py validate-zip --questions public/task1/data/development/leaderboard_questions.jsonl --submission-zip submission.zip`;

const testCommands = `python3 scripts/task1_cli.py validate --questions public/task1/data/test/test_questions.jsonl --predictions predictions.jsonl
python3 scripts/task1_cli.py package --questions public/task1/data/test/test_questions.jsonl --predictions predictions.jsonl --output submission.zip
python3 scripts/task1_cli.py validate-zip --questions public/task1/data/test/test_questions.jsonl --submission-zip submission.zip`;

export function SubmissionGuide({
  developmentSpaceUrl,
  testSpaceUrl,
  linksReady,
}: SubmissionGuideProps) {
  return (
    <section className="submission-guide-card" id="how-to-submit" aria-labelledby="submission-guide-title">
      <header className="submission-guide-heading">
        <div>
          <p className="section-index">HOW TO SUBMIT</p>
          <h2 id="submission-guide-title">Six steps from data to receipt</h2>
        </div>
        <p>
          Follow the phase-specific filenames exactly. Competition predictions and the challenge paper
          use different submission routes.
        </p>
      </header>

      <ol className="submission-guide-list" role="list" aria-label="Six Task 1 submission steps">
        <li>
          <span className="submission-step-number" aria-hidden="true">01</span>
          <div>
            <h3><span className="sr-only">Step 1 of 6: </span>Register and receive a team code.</h3>
            <p>
              Submit one <a href={letterOfIntent}>Letter of Intent</a> per team. Registered teams receive one
              private access code from the organizers. Keep the code private.
            </p>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">02</span>
          <div>
            <h3><span className="sr-only">Step 2 of 6: </span>Download the correct phase files.</h3>
            <p>
              <strong>Development:</strong>{" "}
              <a href={`${basePath}/task1/data/development/leaderboard_questions.jsonl`} download>
                leaderboard_questions.jsonl
              </a>{" "}
              and{" "}
              <a href={`${basePath}/task1/data/development/leaderboard_expected_ids.json`} download>
                leaderboard_expected_ids.json
              </a>. Do not use <code>dev_questions.jsonl</code> for the 580-row leaderboard upload.
            </p>
            <p>
              <strong>Test:</strong>{" "}
              <a href={`${basePath}/task1/data/test/test_questions.jsonl`} download>
                test_questions.jsonl
              </a>{" "}
              and{" "}
              <a href={`${basePath}/task1/data/test/test_expected_ids.json`} download>
                test_expected_ids.json
              </a>.
            </p>
            <p>
              Use the matching expected-IDs file as your checklist: include exactly one prediction for
              every listed <code>case_id</code>, with no missing, duplicate, or additional IDs.
            </p>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">03</span>
          <div>
            <h3><span className="sr-only">Step 3 of 6: </span>Create predictions.jsonl.</h3>
            <p>
              Write one JSON object for every expected case ID: 580 rows for development or 928 rows for
              test. Every row uses exactly <code>schema_version</code>, <code>dataset_version</code>,{" "}
              <code>case_id</code>, <code>final_answer</code>, and <code>steps</code>.
            </p>
            <p>
              Start from the{" "}
              <a href={`${basePath}/task1/data/development/sample_b0_predictions.jsonl`} download>
                sample predictions
              </a>{" "}
              and check the <a href={predictionSchema}>prediction schema</a>. If useful, generate a separate
              blank template below, then save your completed system output as <code>predictions.jsonl</code>.
              The blank template is a format example, not a competitive prediction file.
            </p>
            <div className="submission-command-grid submission-template-command-grid">
              <div>
                <strong>Optional development template</strong>
                <pre tabIndex={0} aria-label="Generate a blank development template"><code>{developmentTemplateCommand}</code></pre>
              </div>
              <div>
                <strong>Optional test template</strong>
                <pre tabIndex={0} aria-label="Generate a blank test template"><code>{testTemplateCommand}</code></pre>
              </div>
            </div>
          </div>
        </li>

        <li className="submission-guide-step-wide">
          <span className="submission-step-number" aria-hidden="true">04</span>
          <div>
            <h3><span className="sr-only">Step 4 of 6: </span>Validate and package one canonical ZIP.</h3>
            <p>
              Clone or download the <a href={participantRepository}>public participant toolkit</a>, run the
              commands for your phase, and continue only when both validation commands report
              <code> valid: true</code> and the package command reports <code>status: PASS</code>. The ZIP
              must contain exactly one root-level file named <code>predictions.jsonl</code>. If an old
              <code> submission.zip</code> exists, remove or rename it before running the package command.
            </p>
            <div className="submission-command-grid">
              <div>
                <strong>Development · 580 rows</strong>
                <pre tabIndex={0} aria-label="Development validation and packaging commands"><code>{developmentCommands}</code></pre>
              </div>
              <div>
                <strong>Test · 928 rows</strong>
                <pre tabIndex={0} aria-label="Test validation and packaging commands"><code>{testCommands}</code></pre>
              </div>
            </div>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">05</span>
          <div>
            <h3><span className="sr-only">Step 5 of 6: </span>Upload submission.zip on the matching webpage.</h3>
            <p>
              Enter the same private team code, select the single <code>submission.zip</code> file, and choose
              Submit once. Do not upload the individual JSONL files.
            </p>
            <div className="submission-guide-actions" aria-label="Task 1 direct upload links">
              {linksReady && developmentSpaceUrl ? (
                <a href={developmentSpaceUrl} target="_blank" rel="noreferrer">
                  Development upload<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Development link under verification</span>
              )}
              {linksReady && testSpaceUrl ? (
                <a href={testSpaceUrl} target="_blank" rel="noreferrer">
                  Test upload<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span aria-disabled="true">Test link under verification</span>
              )}
            </div>
          </div>
        </li>

        <li>
          <span className="submission-step-number" aria-hidden="true">06</span>
          <div>
            <h3><span className="sr-only">Step 6 of 6: </span>Check the correct result.</h3>
            <p>
              <strong>Development:</strong> wait for the receipt to show the final-answer and checkpoint
              scores, then select <strong>Refresh leaderboard</strong> to load the current best-per-team table
              and rank. <strong>Test:</strong> save the receipt ID; no test score or rank is shown before the
              final results are released.
            </p>
          </div>
        </li>
      </ol>

      <aside className="submission-guide-paper-note">
        <strong>Challenge paper is separate.</strong>
        <p>
          Submit the paper PDF through <a href={paperSubmission}>CyberChair SC03</a>, using the{" "}
          <a href={ieeeTemplate}>IEEE two-column conference template</a>. The FinReason Cup requirement is
          no more than six pages total, including references, by 15 November 2026 at 23:59 Anywhere on
          Earth. CyberChair may still display an older 10-page limit and an unconfirmed deadline; follow
          the FinReason Cup requirement stated here. Do not upload a paper PDF to either prediction workspace.
        </p>
      </aside>
    </section>
  );
}
