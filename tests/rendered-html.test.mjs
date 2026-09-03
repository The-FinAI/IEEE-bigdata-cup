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
  assert.match(submit, /Submit Task 1 results on the web/);
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
  assert.match(submit, /Refresh leaderboard/);
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
  assert.doesNotMatch(`${hub}\n${submit}`, /current rank immediately|public table shows each team|eligible accepted/i);
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
  assert.match(terms, /participation certificate/);
  assert.match(terms, /Winning teams will receive a winner certificate/);
  assert.match(readme, /Certificates and prizes/);
  assert.match(`${home}\n${terms}\n${readme}`, /does not offer cash prizes/);
  assert.match(`${home}\n${terms}\n${readme}`, /Registration support is not confirmed at this time/);
  assert.match(`${home}\n${terms}\n${readme}`, /Certificates do not imply (?:challenge-paper )?acceptance or publication/);
  assert.match(privacy, /does not collect or store team access codes/);
  assert.match(privacy, /up to 120 days from acceptance/);
  assert.match(sitemap, /\/task1\//);
  assert.match(sitemap, /\/task1\/submit\//);
  assert.match(sitemap, /\/task1\/leaderboard\//);
  assert.doesNotMatch(sitemap, /task1\/pilot/);

  const participantCopy = `${home}\n${hub}\n${submit}\n${leaderboard}\n${terms}\n${privacy}\n${readme}`;
  assert.doesNotMatch(
    participantCopy,
    /GitHub Issues?|GitHub-only development route|official GitHub Issue Form|attached as ciphertext|immutable numeric GitHub actor ID|encrypted Issue intake/i,
  );
  assert.doesNotMatch(participantCopy, /organizer-only pilot|synthetic pilot/i);
  assert.doesNotMatch(readme, /Starter kits, schemas, validators, and baselines \| Coming soon/);
  assert.match(readme, /Task 1 validator, sample B0, and B1 baseline \| Live/);
  assert.match(readme, /Task 1 step-by-step submission guide/);
  assert.match(readme, /Task 2 and Task 3 starter kits and baselines \| Coming soon/);
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
    assert.doesNotMatch(
      participantCopy,
      /under verification|pending verification|links? (?:remain )?withheld|links? (?:are|were) being verified before/i,
    );
  } else {
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
  assert.match(publicConfigSource, /\.hf\.space/);
  assert.match(rights, /six organizer-owned participant-tool files/);
  assert.doesNotMatch(rights, /\.github\/workflows|app\/task1/);
});
