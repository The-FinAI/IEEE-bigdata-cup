import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const projectRoot = new URL("../", import.meta.url);
const publicConfig = resolveTask1PublicConfig({
  siteMode: process.env.FINREASON_TASK1_SITE_MODE,
  hfSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL,
  leaderboardApiUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL,
});
const siteMode = publicConfig.siteMode;
const configuredSpace = publicConfig.hfSpace.url;
const configuredLeaderboardApi = publicConfig.leaderboardApi.url;

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
    pilotSubmitHtml,
    pilotLeaderboardHtml,
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
    readFile(new URL("out/task1/pilot/submit/index.html", projectRoot), "utf8"),
    readFile(new URL("out/task1/pilot/leaderboard/index.html", projectRoot), "utf8"),
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
  assert.match(launchStatus, /\/task1\/submit\//);
  assert.match(launchStatus, /\/task1\/leaderboard\//);
  assert.match(layout, /FinReason Cup 2026/);
  assert.match(layout, /the-finai\.github\.io\/IEEE-bigdata-cup/);
  assert.match(layout, /og\.jpg/);
  assert.match(sitemap, /https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\//);
  assert.match(sitemap, /task1\/submit/);
  assert.match(sitemap, /task1\/leaderboard/);
  assert.doesNotMatch(sitemap, /task1\/pilot/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /\/IEEE-bigdata-cup/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40} # v5\.0\.0/);
  assert.match(workflow, /FINREASON_TASK1_SITE_MODE/);
  assert.match(workflow, /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/);
  assert.match(workflow, /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/);
  assert.doesNotMatch(workflow, /build-leaderboard|rebuild_pilot/);
  assert.match(packageJson, /build:pages/);
  assert.match(html, /Organizer-maintained challenge site/);
  assert.match(html, /Submit paper/);
  assert.match(html, /Submit paper in CyberChair/);
  assert.match(html, /up to 6 pages total, including references/);
  assert.match(html, /15 November 2026, 23:59 AoE/);
  assert.match(html, /subarea=SC03/);
  assert.match(html, /publishing\/templates\.html/);
  assert.match(html, /Separate Task 1 participant hub/);
  assert.match(html, /\/IEEE-bigdata-cup\/task1\/submit\//);
  assert.match(html, /\/IEEE-bigdata-cup\/task1\/leaderboard\//);
  assert.match(html, /CyberChair has not yet updated its displayed deadline/);
  assert.match(html, /Winning teams announced/);
  assert.match(html, /Last reviewed 31 August 2026/);
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
  assert.match(submitHtml, /TASK 1 \/ PARTICIPANT HUB/);
  assert.match(
    submitHtml,
    /rel="canonical" href="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/task1\/submit\/"/,
  );
  assert.match(submitHtml, /01 \/ DEVELOPMENT/);
  assert.match(submitHtml, /02 \/ FINAL/);
  assert.match(submitHtml, /GitHub Issues are not a participant submission channel/);
  assert.doesNotMatch(
    submitHtml,
    /GITHUB-ONLY PILOT|Prepare encrypted submission|Open GitHub submission form/,
  );
  assert.match(leaderboardHtml, /Scores and leaderboard/);
  assert.match(
    leaderboardHtml,
    /rel="canonical" href="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/task1\/leaderboard\/"/,
  );
  assert.match(leaderboardHtml, /authenticated Task 1 Space/);
  assert.doesNotMatch(
    leaderboardHtml,
    /GitHub-only pilot leaderboard|Seen FAC|github\.com\/The-FinAI\/IEEE-bigdata-cup\/issues/,
  );

  if (siteMode === "final") {
    assert.ok(configuredSpace, "final render verification requires the configured Space URL");
    const normalizedSpace = new URL(configuredSpace).toString();
    assert.match(submitHtml, /Submission Space available/);
    assert.match(submitHtml, /Final Pages configuration/);
    assert.ok(submitHtml.includes(`href="${normalizedSpace}"`));
    assert.ok(leaderboardHtml.includes(`href="${normalizedSpace}"`));
    assert.doesNotMatch(submitHtml, /Submission link pending verification/);
    assert.doesNotMatch(leaderboardHtml, /Space link pending verification/);

    if (configuredLeaderboardApi) {
      assert.match(leaderboardHtml, /Loading development results/);
      assert.ok(leaderboardHtml.includes(new URL(configuredLeaderboardApi).toString()));
    } else {
      assert.match(leaderboardHtml, /Public aggregate table not enabled/);
    }
  } else {
    assert.equal(siteMode, "development");
    assert.match(submitHtml, /Submission link pending verification/);
    assert.match(submitHtml, /Development preview configuration/);
    assert.match(leaderboardHtml, /Space link pending verification/);
    assert.match(leaderboardHtml, /Public aggregate table not enabled/);
    assert.match(leaderboardHtml, /does not substitute pilot or cached results/);
    if (configuredSpace) {
      assert.ok(!submitHtml.includes(new URL(configuredSpace).toString()));
      assert.ok(!leaderboardHtml.includes(new URL(configuredSpace).toString()));
    }
  }

  assert.match(pilotLeaderboardHtml, /GitHub-only pilot leaderboard/);
  assert.match(pilotLeaderboardHtml, /organizer smoke test only/);
  assert.match(pilotLeaderboardHtml, /name="robots" content="noindex, nofollow"/);
  assert.match(pilotSubmitHtml, /TASK 1 \/ ORGANIZER-ONLY PILOT/);
  assert.match(pilotSubmitHtml, /Prepare encrypted submission/);
  assert.match(pilotSubmitHtml, /Synthetic examples only/);
  assert.match(pilotSubmitHtml, /name="robots" content="noindex, nofollow"/);
  assert.match(issueForm, /type: upload/);
  assert.match(issueForm, /accept: "\.json"/);
  assert.match(issueForm, /Do not attach a plaintext predictions ZIP/);
  assert.match(submissionWorkflow, /issues:/);
  assert.match(submissionWorkflow, /types:\s*\n\s*- opened/);
  assert.match(submissionWorkflow, /TASK1_PILOT_PRIVATE_KEY_PKCS8_B64/);
  assert.match(submissionWorkflow, /TASK1_PILOT_SIGNING_PRIVATE_KEY_PKCS8_B64/);
  assert.match(submissionWorkflow, /github\.run_attempt/);
  assert.doesNotMatch(submissionWorkflow, /actions: write|deploy-pages\.yml\/dispatches/);
  assert.match(submissionWorkflow, /permissions: \{\}/);
  assert.doesNotMatch(
    submissionWorkflow,
    /pull_request_target|github\.event\.issue\.body\s*}}/,
  );
});
