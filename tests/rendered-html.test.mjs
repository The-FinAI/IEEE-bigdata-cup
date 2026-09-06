import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const root = new URL("../", import.meta.url);
const publicConfig = resolveTask1PublicConfig({
  siteMode: process.env.FINREASON_TASK1_SITE_MODE,
  developmentSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL,
  testSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL,
  leaderboardApiUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL,
});

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("renders direct web upload routes without a GitHub Issue intake", async () => {
  const [home, hub, submit, leaderboard, terms, privacy, sitemap, readme, cliSource, guideSource] = await Promise.all([
    text("out/index.html"),
    text("out/task1/index.html"),
    text("out/task1/submit/index.html"),
    text("out/task1/leaderboard/index.html"),
    text("out/terms/index.html"),
    text("out/privacy/index.html"),
    text("out/sitemap.xml"),
    text("README.md"),
    text("scripts/task1_cli.py"),
    text("app/task1/submission-guide.tsx"),
  ]);

  assert.match(hub, /TASK 1 \/ PARTICIPANT HUB/);
  assert.match(hub, /DEVELOPMENT \/ 13 FILES/);
  assert.match(hub, /TEST \/ 3 FILES/);
  assert.match(submit, /Submit Task 1 predictions on the web/);
  assert.match(submit, /Six steps from data to receipt/);
  assert.match(submit, /leaderboard_questions\.jsonl/);
  assert.match(submit, /leaderboard_expected_ids\.json/);
  assert.match(submit, /Do not use <code>dev_questions\.jsonl<\/code>/);
  assert.match(submit, /test_questions\.jsonl/);
  assert.match(submit, /test_expected_ids\.json/);
  assert.match(submit, /exactly one root-level file named <code>predictions\.jsonl<\/code>/);
  assert.match(submit, /baseline-b0/);
  assert.match(submit, /task1_cli\.py validate/);
  assert.match(submit, /task1_cli\.py package/);
  assert.match(submit, /task1_cli\.py validate-zip/);
  assert.match(submit, /No pre-registration, approval, access code, or account is required/);
  assert.match(submit, /Development:<\/strong> enter Team Name/);
  assert.match(submit, /Test:<\/strong> enter the same Team Name, provide a Contact Email/);
  assert.match(submit, /Final answer score, Reasoning steps score, receipt ID, and current rank/);
  assert.match(submit, /score-derived signal/);
  assert.match(submit, /Challenge paper is separate/);
  assert.match(submit, /no more than six pages total/);
  assert.match(guideSource, /baseline-b0[^\n]+> blank_predictions\.jsonl/);
  assert.doesNotMatch(guideSource, /baseline-b0[^\n]+> predictions\.jsonl/);
  assert.match(cliSource, /commands\.add_parser\("validate"\)/);
  assert.match(cliSource, /commands\.add_parser\("validate-zip"\)/);
  assert.match(cliSource, /\("baseline-b0", command_baseline_b0\)/);
  assert.match(cliSource, /commands\.add_parser\("package"\)/);
  assert.match(cliSource, /package\.add_argument\("--output", required=True\)/);
  assert.match(cliSource, /validate_zip\.add_argument\("--submission-zip", required=True\)/);
  assert.match(submit, /Development and test submission/);
  assert.match(submit, /Test returns only an acceptance receipt/);
  assert.match(`${hub}\n${submit}`, /current rank immediately|receipt ID, and current rank/);
  assert.match(leaderboard, /Development leaderboard/);
  assert.match(leaderboard, /Two scores, shown on a 0–1 scale/);
  assert.match(leaderboard, />Final answer</);
  assert.match(leaderboard, />Reasoning steps</);
  assert.match(leaderboard, /No-answer baseline/);
  assert.match(leaderboard, /Rule-based baseline/);
  assert.match(leaderboard, /Fin-o1-8B/);
  assert.match(leaderboard, /0\.285873/);
  assert.match(leaderboard, /0\.592606/);
  assert.match(leaderboard, /leaderboard-entry-pill baseline/);
  assert.match(leaderboard, /the two should not be compared directly/);
  assert.doesNotMatch(
    `${hub}\n${submit}\n${leaderboard}\n${terms}\n${privacy}`,
    /SeenFAC|SeenCheckpoint/,
  );
  assert.doesNotMatch(hub, /V4 DEVELOPMENT|ROTATED V2 TEST/);
  assert.doesNotMatch(
    leaderboard,
    /ORGANIZER REFERENCE|OPTIONAL PUBLIC VIEW|Public aggregate table not enabled|Legal null-prediction control|Pinned zero-shot JSON-schema generation/,
  );
  assert.match(terms, /verified development or test service/);
  assert.match(home, /participation certificate/);
  assert.match(home, /Winning teams will receive a winner certificate/);
  assert.match(home, /2,900 labeled training cases/);
  assert.match(home, /290 labeled local-development cases/);
  assert.match(home, /580 unlabeled leaderboard-development questions/);
  assert.match(home, /928 public test questions/);
  assert.match(home, /TASK 1 LIVE/);
  assert.match(home, />Final answer</);
  assert.match(home, />Reasoning steps</);
  assert.match(home, /Task 1 test answers remain private; test scores and ranks are withheld until final results/);
  assert.doesNotMatch(
    `${home}\n${readme}`,
    /ChainEval|Planned FinChain-derived problems|Final-answer accuracy|Planned scorecard/,
  );
  assert.match(terms, /participation certificate/);
  assert.match(terms, /Winning teams will receive a winner certificate/);
  assert.match(readme, /Certificates and prizes/);
  assert.match(`${home}\n${terms}\n${readme}`, /does not offer cash prizes/);
  assert.match(`${home}\n${terms}\n${readme}`, /Registration support is not confirmed at this time/);
  assert.match(`${home}\n${terms}\n${readme}`, /Certificates do not imply (?:challenge-paper )?acceptance or publication/);
  assert.match(privacy, /does not collect or store Contact/);
  assert.match(privacy, /Contact Email is never published/);
  assert.match(
    privacy,
    /Contact Email is used only for\s+submission identification, submission-related support, matching\s+final results to the related challenge paper, and enforcing test\s+submission quotas and replay protection through a non-public\s+pseudonymous identifier/,
  );
  assert.match(privacy, /Readable Contact Email is kept only while needed/);
  assert.match(privacy, /do not promise deletion of every historical\s+copy within a fixed period/);
  assert.match(sitemap, /\/task1\//);
  assert.match(sitemap, /\/task1\/submit\//);
  assert.match(sitemap, /\/task1\/leaderboard\//);
  assert.doesNotMatch(sitemap, /task1\/pilot/);
  assert.equal((sitemap.match(/2026-09-03/g) ?? []).length, 6);

  const participantCopy = `${home}\n${hub}\n${submit}\n${leaderboard}\n${terms}\n${privacy}\n${readme}`;
  assert.doesNotMatch(participantCopy, /Letter of Intent|\bLOI\b|forms\.gle/i);
  assert.match(privacy, /Before 3 September 2026, the organizers also used a Google Forms/);
  assert.match(privacy, /no longer a participation or submission/);
  assert.doesNotMatch(
    participantCopy,
    /Registered teams|Register and receive a team code|organizer-issued (?:team )?(?:access )?code|private team code|submission code|authenticated (?:leaderboard|table)|optional public development leaderboard/i,
  );
  assert.doesNotMatch(
    participantCopy,
    /GitHub Issues?|GitHub-only development route|official GitHub Issue Form|attached as ciphertext|immutable numeric GitHub actor ID|encrypted Issue intake/i,
  );
  assert.doesNotMatch(participantCopy, /organizer-only pilot|synthetic pilot/i);
  assert.doesNotMatch(participantCopy, /checkpoint scores?/i);
  assert.doesNotMatch(participantCopy, /refresh for rank|refresh leaderboard/i);
  assert.doesNotMatch(participantCopy, /an\s+non-public pseudonymous identifier/i);
  assert.doesNotMatch(readme, /Starter kits, schemas, validators, and baselines \| Coming soon/);
  assert.match(readme, /Task 1 validator, sample B0, and B1 baseline \| Live/);
  assert.match(readme, /Task 1 step-by-step submission guide/);
  assert.match(readme, /Task 2 and Task 3 starter kits and baselines \| Coming soon/);
  assert.match(readme, /Final answer and Reasoning steps \(live\)/);
  await assert.rejects(access(new URL("out/task1/pilot", root)));

  if (publicConfig.siteMode === "final") {
    assert.ok(publicConfig.developmentSpace.url);
    assert.ok(publicConfig.testSpace.url);
    assert.match(submit, /Direct web upload available/);
    assert.match(submit, /Open development submission/);
    assert.match(submit, /Open test submission/);
    assert.ok(submit.includes(publicConfig.developmentSpace.url));
    assert.ok(submit.includes(publicConfig.testSpace.url));
    assert.ok(leaderboard.includes(publicConfig.developmentSpace.url));
    assert.ok(!leaderboard.includes(publicConfig.testSpace.url));
    assert.match(home, /Task 1 is live with frozen participant data and direct uploads/);
    assert.match(home, /immediately returns Final answer, Reasoning steps, a receipt, and current rank/);
    assert.match(home, /returns only an acceptance receipt with no online score or rank/);
    assert.doesNotMatch(
      participantCopy,
      /under verification|pending verification|links? (?:remain )?withheld|links? (?:are|were) being verified before/i,
    );
  } else {
    assert.match(home, /its two upload links remain under verification/);
    assert.match(submit, /Direct web upload under verification/);
    assert.match(submit, /Development upload link pending verification/);
    assert.match(submit, /Test upload link pending verification/);
    assert.doesNotMatch(submit, /href="https:\/\/[^" ]+\.hf\.space\//);
  }
});

test("publishes exactly the frozen 13 development and 3 test downloads", async () => {
  const development = (await readdir(new URL("out/task1/data/development/", root))).sort();
  const rotatedTest = (await readdir(new URL("out/task1/data/test/", root))).sort();
  assert.deepEqual(development, [
    "dev_gold.jsonl", "dev_manifest.jsonl", "dev_questions.jsonl", "dev_targets.jsonl",
    "leaderboard_expected_ids.json", "leaderboard_questions.jsonl", "release_manifest.json",
    "sample_b0_predictions.jsonl", "sample_b0_submission.zip", "train_gold.jsonl",
    "train_manifest.jsonl", "train_questions.jsonl", "train_targets.jsonl",
  ]);
  assert.deepEqual(rotatedTest, [
    "test_expected_ids.json", "test_questions.jsonl", "test_release_manifest.json",
  ]);
});

test("removes the Issue route and guards direct Space configuration", async () => {
  const [pages, publicConfigSource, rights] = await Promise.all([
    text(".github/workflows/deploy-pages.yml"),
    text("lib/task1-public-config.mjs"),
    text("public/task1/RIGHTS_AND_PROVENANCE.md"),
  ]);

  await assert.rejects(access(new URL(".github/workflows/task1-development-submission.yml", root)));
  await assert.rejects(access(new URL(".github/ISSUE_TEMPLATE/task1-development-submission.yml", root)));
  await assert.rejects(access(new URL("app/task1/submit/submission-packer.tsx", root)));
  await assert.rejects(access(new URL("public/task1/submission-config.json", root)));
  await assert.rejects(access(new URL("out/task1/submission-config.json", root)));
  await assert.rejects(access(new URL(".github/workflows/task1-test-submission.yml", root)));
  await assert.rejects(access(new URL("config/task1-evaluator.json", root)));
  await assert.rejects(access(new URL("evaluator/task1/dev-reference.enc.json", root)));
  await assert.rejects(access(new URL("scripts/task1/intake.mjs", root)));
  await assert.rejects(access(new URL("scripts/task1/publish-result.mjs", root)));
  await assert.rejects(access(new URL("scripts/task1/build-leaderboard.mjs", root)));
  await assert.rejects(access(new URL("tests/task1-intake.test.mjs", root)));
  await assert.rejects(access(new URL("public/task1/development-leaderboard.json", root)));

  assert.doesNotMatch(pages, /workflow_run|Task 1 development submission|issues:\s*read|build-leaderboard/);
  assert.match(pages, /FINREASON_TASK1_SITE_MODE/);
  assert.match(pages, /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/);
  assert.match(pages, /NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/);
  assert.match(publicConfigSource, /two different isolated deployments/);
  assert.match(publicConfigSource, /hfSpaceHostname/);
  assert.match(publicConfigSource, /\/api\/leaderboard/);
  assert.match(rights, /six organizer-owned participant-tool files/);
  assert.doesNotMatch(rights, /\.github\/workflows|app\/task1/);
});

test("publishes the Task 3 participant hub with honest phase status", async () => {
  const hub = await text("out/task3/index.html");

  assert.match(hub, /TASK 3 \/ PARTICIPANT HUB/);
  assert.match(hub, /Financial Audit Verification/);

  // All three phases are listed, with their real status.
  assert.match(hub, /Practice/);
  assert.match(hub, /Development/);
  assert.match(hub, /Test/);
  // Bind each status to its own row. Asserting that "Live" and "Coming soon"
  // merely appear somewhere would still pass if the labels were swapped between
  // phases.
  // Extract each row and assert within it. A window-based regex is not anchored
  // to a row: measured against the built page, the development marker sits 275
  // characters before the TEST row's status, so mutating development's own chip
  // to "ready" still matched by borrowing the next row's "pending".
  const rowOf = (slug) =>
    hub.match(new RegExp(`<tr[^>]*data-phase="${slug}"[\\s\\S]*?</tr>`))?.[0] ?? "";

  for (const slug of ["practice", "development", "test"]) {
    assert.notEqual(rowOf(slug), "", `${slug} row is missing`);
  }

  // Development and test have no datasets, in any build.
  for (const slug of ["development", "test"]) {
    assert.match(rowOf(slug), /data-state="pending"/, `${slug} must be pending`);
    assert.doesNotMatch(rowOf(slug), /data-state="ready"/, `${slug} must not claim to be live`);
  }

  // Practice tracks the configuration, and this assertion works in BOTH site
  // modes -- unlike the conditional guard below it, which is inert in a final
  // build and so leaves the shipping configuration untested.
  const practiceOpen = /<dd>Open now<\/dd>/.test(hub);
  assert.match(
    rowOf("practice"),
    practiceOpen ? /data-state="ready"/ : /data-state="pending"/,
    "the practice row disagrees with the quick-facts panel",
  );

  // The page must never contradict itself: if the panel says the link is still
  // being verified, no phase row may simultaneously claim to be open. This holds
  // in both site modes, which is why it is the assertion that would have caught
  // the original defect.
  if (/Link under verification/.test(hub)) {
    assert.doesNotMatch(
      hub,
      /data-state="ready"/,
      "the panel says the link is unverified while a phase row claims to be Live",
    );
  }

  // The practice phase must say why it is not ranked.
  assert.match(hub, /public/i);
  assert.match(hub, /not ranked|never ranked/i);

  // The site hosts no Task 3 data files; it points at the released sources.
  assert.match(hub, /TheFinAI\/FinMR/);
  assert.match(hub, /332/);

  // Nothing private may appear.
  assert.doesNotMatch(hub, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(hub, /hf_[A-Za-z0-9]{10,}/);
  assert.doesNotMatch(hub, /extracted_value"\s*:/);
});

test("publishes a Task 3 submission guide with the real file contract", async () => {
  const submit = await text("out/task3/submit/index.html");

  assert.match(submit, /TASK 3 \/ SUBMISSION/);
  assert.match(submit, /predictions\.jsonl/);
  assert.match(submit, /extracted_value/);
  assert.match(submit, /calculated_value/);
  assert.match(submit, /prepare_public_dev\.py/);
  assert.match(submit, /validate_submission\.py/);
  // Matching is by id, and a missing line invalidates the whole submission.
  assert.match(submit, /matched .{0,20}by <code>id<\/code>|never by row order/i);
  assert.match(submit, /332/);
  // The three things a participant most often gets wrong.
  assert.match(submit, /&quot;0&quot;/);
  assert.match(submit, /UTF-8/);
  assert.match(submit, /exactly one root-level file named <code>predictions\.jsonl<\/code>/);
  // Test phase returns nothing but a receipt.
  assert.match(submit, /acceptance receipt/i);
  assert.doesNotMatch(submit, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);

  // The filenames alone are not the contract: a copy-edit that renamed a flag
  // would ship a command that cannot run, with every other assertion still
  // passing. These are the flags the real scripts define.
  assert.match(submit, /--predictions/);
  assert.match(submit, /--reference/);
  assert.match(submit, /--gold/);
  assert.match(submit, /--judge deterministic/);
});

test("publishes the Task 3 leaderboard page with only measured baselines", async () => {
  const board = await text("out/task3/leaderboard/index.html");

  assert.match(board, /Development leaderboard/);
  // The four rates, named.
  assert.match(board, /ACC/);
  assert.match(board, /Structural error rate/i);
  assert.match(board, /Extraction error rate/i);
  assert.match(board, /Calculation error rate/i);
  // The A/S/E/C hierarchy short-circuits, and that must be explained.
  assert.match(board, /first check that fails|short-circuit/i);
  // The one measured baseline, with its real numbers.
  assert.match(board, /Dummy baseline/);
  // Extract the baseline row and compare its cells as an ordered array. A
  // span-matching regex over the whole document does not work here: the caption
  // paragraph below the table repeats "4.52%", so a swapped-column table still
  // satisfied it. Text outside the row cannot reach this assertion.
  const baselineRow = board.match(/<tr[^>]*leaderboard-baseline-row[\s\S]*?<\/tr>/);
  assert.ok(baselineRow, "the dummy baseline row is missing from the leaderboard page");
  const baselineCells = [...baselineRow[0].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(
    (match) => match[1].trim(),
  );
  assert.deepEqual(
    baselineCells,
    ["0.00%", "0.00%", "95.48%", "4.52%"],
    "the baseline row's rates are not in ACC, SER, EER, CER order",
  );
  assert.match(board, /332/);
  // Practice results must never appear on the board.
  assert.match(board, /practice/i);
  assert.match(board, /not ranked|never ranked|excluded/i);
  // No fabricated model baselines.
  assert.doesNotMatch(board, /gpt-|claude-|deepseek/i);
  assert.doesNotMatch(board, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("lists the Task 3 routes in the sitemap and keeps Task 1 intact", async () => {
  const sitemap = await text("out/sitemap.xml");
  for (const route of ["task3/", "task3/submit/", "task3/leaderboard/"]) {
    assert.match(sitemap, new RegExp(`IEEE-bigdata-cup/${route.replace(/\//g, "\\/")}<`));
  }
  for (const route of ["task1/", "task1/submit/", "task1/leaderboard/"]) {
    assert.match(sitemap, new RegExp(`IEEE-bigdata-cup/${route.replace(/\//g, "\\/")}<`));
  }
});

test("every Task 3 page cross-links the other two", async () => {
  const [hub, submit, board] = await Promise.all([
    text("out/task3/index.html"),
    text("out/task3/submit/index.html"),
    text("out/task3/leaderboard/index.html"),
  ]);
  for (const page of [hub, submit, board]) {
    assert.match(page, /task3\/"/);
    assert.match(page, /task3\/submit\/"/);
    assert.match(page, /task3\/leaderboard\/"/);
  }
});

test("the home page links to both task hubs", async () => {
  // A participant site nobody can navigate to does not do its job. The Task 3
  // route existed in the sitemap but no page linked to it.
  const home = await text("out/index.html");
  assert.match(home, /href="[^"]*\/task1\/"/);
  assert.match(home, /href="[^"]*\/task3\/"/);
});
