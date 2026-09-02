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
  const [home, hub, submit, leaderboard, terms, privacy, sitemap, readme] = await Promise.all([
    text("out/index.html"),
    text("out/task1/index.html"),
    text("out/task1/submit/index.html"),
    text("out/task1/leaderboard/index.html"),
    text("out/terms/index.html"),
    text("out/privacy/index.html"),
    text("out/sitemap.xml"),
    text("README.md"),
  ]);

  assert.match(hub, /TASK 1 \/ PARTICIPANT HUB/);
  assert.match(hub, /V4 DEVELOPMENT \/ 13 FILES/);
  assert.match(hub, /ROTATED V2 TEST \/ 3 FILES/);
  assert.match(hub, /GitHub Issues are not a submission channel/);
  assert.match(submit, /Submit Task 1 results on the web/);
  assert.match(submit, /Development and test submission/);
  assert.match(submit, /Development returns SeenFAC and SeenCheckpoint immediately/);
  assert.match(submit, /Test returns only an acceptance receipt/);
  assert.match(leaderboard, /Development scores and leaderboard/);
  assert.match(leaderboard, /Test submissions are receipt-only/);
  assert.match(terms, /verified development or test service/);
  assert.match(privacy, /does not collect or store team access codes/);
  assert.match(privacy, /up to 120 days from acceptance/);
  assert.match(sitemap, /\/task1\//);
  assert.match(sitemap, /\/task1\/submit\//);
  assert.match(sitemap, /\/task1\/leaderboard\//);
  assert.doesNotMatch(sitemap, /task1\/pilot/);

  const participantCopy = `${home}\n${hub}\n${submit}\n${leaderboard}\n${terms}\n${privacy}\n${readme}`;
  assert.doesNotMatch(
    participantCopy,
    /GitHub-only development route|official GitHub Issue Form|attached as ciphertext|immutable numeric GitHub actor ID|encrypted Issue intake/i,
  );
  assert.doesNotMatch(participantCopy, /organizer-only pilot|synthetic pilot/i);
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
