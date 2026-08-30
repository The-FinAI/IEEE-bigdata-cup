import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("contains the complete FinReason Cup landing-page contract", async () => {
  const [
    html,
    page,
    layout,
    launchStatus,
    sitemap,
    nextConfig,
    workflow,
    packageJson,
    submitHtml,
    leaderboardHtml,
    issueForm,
    submissionWorkflow,
  ] = await Promise.all([
    readFile(new URL("out/index.html", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/launch-status.tsx", projectRoot), "utf8"),
    readFile(new URL("out/sitemap.xml", projectRoot), "utf8"),
    readFile(new URL("next.config.ts", projectRoot), "utf8"),
    readFile(
      new URL(".github/workflows/deploy-pages.yml", projectRoot),
      "utf8",
    ),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("out/task1/submit/index.html", projectRoot), "utf8"),
    readFile(new URL("out/task1/leaderboard/index.html", projectRoot), "utf8"),
    readFile(
      new URL(".github/ISSUE_TEMPLATE/task1-pilot-submission.yml", projectRoot),
      "utf8",
    ),
    readFile(
      new URL(".github/workflows/task1-submission-pilot.yml", projectRoot),
      "utf8",
    ),
  ]);

  assert.match(page, /FinReason Cup/);
  assert.match(page, /Verifiable Financial Chain Reasoning/);
  assert.match(page, /Market-Neutral Hedging/);
  assert.match(page, /Financial Audit Verification/);
  assert.match(page, /Submit LOI/);
  assert.match(page, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(page, /15 NOV · 23:59 AOE/);
  assert.match(page, /Winning teams announced/);
  assert.match(page, /25 NOV/);
  assert.match(page, /Why does CyberChair show a 10-page limit and deadline TBA/);
  assert.match(page, /publication is subject to conference peer review/);
  assert.match(launchStatus, /Submit paper in CyberChair/);
  assert.match(launchStatus, /up to 6 pages total, including references/);
  assert.match(launchStatus, /15 November 2026, 23:59 AoE/);
  assert.match(launchStatus, /subarea=SC03/);
  assert.match(launchStatus, /publishing\/templates\.html/);
  assert.match(launchStatus, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(layout, /FinReason Cup 2026/);
  assert.match(layout, /the-finai\.github\.io\/IEEE-bigdata-cup/);
  assert.match(layout, /og\.jpg/);
  assert.match(sitemap, /https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\//);
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /\/IEEE-bigdata-cup/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40} # v4/);
  assert.match(packageJson, /build:pages/);
  assert.match(html, /Organizer-maintained challenge site/);
  assert.match(html, /Submit paper/);
  assert.match(html, /Submit paper in CyberChair/);
  assert.match(html, /up to 6 pages total, including references/);
  assert.match(html, /15 November 2026, 23:59 AoE/);
  assert.match(html, /subarea=SC03/);
  assert.match(html, /publishing\/templates\.html/);
  assert.match(html, /including any required predictions, source code/);
  assert.match(html, /CyberChair has not yet updated its displayed deadline/);
  assert.match(html, /Winning teams announced/);
  assert.match(html, /Last reviewed 22 August 2026/);
  assert.match(html, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(html, /\/IEEE-bigdata-cup\/finreason-hero\.webp/);
  assert.match(html, /This is not a full financial-statement audit/);
  assert.ok(html.indexOf("<header") < html.indexOf("<main"));
  assert.ok(html.indexOf("</main>") < html.indexOf("<footer"));
  assert.doesNotMatch(html, /\/api\/interest|name="contactEmail"/);
  assert.doesNotMatch(
    html,
    /\boptional\b|not required|non-gating|does not gate participation/i,
  );
  assert.doesNotMatch(page, /The proposal supports/);
  assert.doesNotMatch(page, /not required|may still enter without|does not gate/i);
  assert.doesNotMatch(page, /Enter one track or combine them|Reproducible code/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview|2027 IEEE/i);
  assert.doesNotMatch(layout, /next\/headers|headers\(\)/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|drizzle/);
  assert.match(submitHtml, /TASK 1 \/ GITHUB-ONLY PILOT/);
  assert.match(submitHtml, /Prepare encrypted submission/);
  assert.match(submitHtml, /Synthetic examples only/);
  assert.match(submitHtml, /\/IEEE-bigdata-cup\/task1\/pilot-example-predictions\.jsonl/);
  assert.match(leaderboardHtml, /GitHub-only pilot leaderboard/);
  assert.match(leaderboardHtml, /Awaiting first pilot score|Updated 20|Seen FAC/);
  assert.match(issueForm, /type: upload/);
  assert.match(issueForm, /accept: "\.json"/);
  assert.match(issueForm, /Do not attach a plaintext predictions ZIP/);
  assert.match(submissionWorkflow, /issues:/);
  assert.match(submissionWorkflow, /types:\s*\n\s*- opened/);
  assert.match(submissionWorkflow, /TASK1_PILOT_PRIVATE_KEY_PKCS8_B64/);
  assert.match(submissionWorkflow, /TASK1_PILOT_SIGNING_PRIVATE_KEY_PKCS8_B64/);
  assert.match(submissionWorkflow, /github\.run_attempt/);
  assert.match(submissionWorkflow, /actions: write/);
  assert.match(submissionWorkflow, /permissions: \{\}/);
  assert.doesNotMatch(submissionWorkflow, /pull_request_target|github\.event\.issue\.body\s*}}/);
});
