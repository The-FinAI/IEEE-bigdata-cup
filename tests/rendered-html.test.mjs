import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("renders the official GitHub-only Task 1 participant routes", async () => {
  const [home, hub, submit, leaderboard, terms, privacy, sitemap] = await Promise.all([
    text("out/index.html"),
    text("out/task1/index.html"),
    text("out/task1/submit/index.html"),
    text("out/task1/leaderboard/index.html"),
    text("out/terms/index.html"),
    text("out/privacy/index.html"),
    text("out/sitemap.xml"),
  ]);

  assert.match(home, /GitHub-only development route/);
  assert.match(hub, /TASK 1 \/ PARTICIPANT HUB/);
  assert.match(hub, /V4 DEVELOPMENT \/ 13 FILES/);
  assert.match(hub, /ROTATED V2 TEST \/ 3 FILES/);
  assert.match(hub, /Test intake disabled/);
  assert.match(submit, /Prepare encrypted submission/);
  assert.match(submit, /580-row V4 predictions ZIP/);
  assert.match(submit, /2 accepted attempts per UTC day and 40 in total/);
  assert.match(leaderboard, /Public development leaderboard/);
  assert.match(leaderboard, /SeenFAC/);
  assert.match(terms, /locally encrypted JSON ciphertext/);
  assert.match(terms, /immutable numeric GitHub actor ID/);
  assert.match(terms, /15 November 2026, 23:59 Anywhere on Earth/);
  assert.match(privacy, /public GitHub Issue/);
  assert.match(privacy, /up to 120 days from acceptance/);
  assert.match(privacy, /Test intake is currently disabled/);
  assert.match(sitemap, /\/task1\//);
  assert.match(sitemap, /\/task1\/submit\//);
  assert.match(sitemap, /\/task1\/leaderboard\//);
  assert.doesNotMatch(sitemap, /task1\/pilot/);

  const publicCopy = `${home}\n${hub}\n${submit}\n${leaderboard}\n${terms}\n${privacy}`;
  assert.doesNotMatch(publicCopy, /Hugging Face|\.hf\.space|access code/i);
  assert.doesNotMatch(publicCopy, /organizer-only pilot|synthetic pilot/i);
  await assert.rejects(access(new URL("out/task1/pilot", root)));
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

test("workflow is actor-serialized, least-privilege, and test intake is absent", async () => {
  const [workflow, issueForm, pages, config, rights] = await Promise.all([
    text(".github/workflows/task1-development-submission.yml"),
    text(".github/ISSUE_TEMPLATE/task1-development-submission.yml"),
    text(".github/workflows/deploy-pages.yml"),
    text("public/task1/submission-config.json"),
    text("public/task1/RIGHTS_AND_PROVENANCE.md"),
  ]);
  assert.match(workflow, /group: task1-development-actor-\$\{\{ github\.event\.issue\.user\.id \}\}/);
  assert.match(workflow, /environment: task1-pilot/);
  assert.match(workflow, /actions: read[\s\S]*contents: read[\s\S]*issues: read/);
  assert.match(workflow, /publish:[\s\S]*permissions:[\s\S]*contents: read[\s\S]*issues: write/);
  assert.doesNotMatch(workflow, /actions: write/);
  assert.match(issueForm, /title: "\[Task 1 DEV\] Encrypted submission"/);
  assert.match(issueForm, /type: upload[\s\S]*validations:[\s\S]*accept: "\.json"[\s\S]*required: true/);
  assert.doesNotMatch(issueForm, /team name|raw filename/i);
  assert.match(pages, /Rebuild leaderboard from signed result comments/);
  assert.match(config, /"submission_deadline_exclusive": "2026-11-16T12:00:00Z"/);
  assert.match(rights, /six organizer-owned participant-tool files/);
  assert.doesNotMatch(rights, /\.github\/workflows|app\/task1|scripts\/task1\/score-development/);
  await assert.rejects(access(new URL(".github/workflows/task1-test-submission.yml", root)));
});
