import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { resolveTask1PublicConfig } from "../lib/task1-public-config.mjs";

const projectRoot = new URL("../", import.meta.url);
const publicConfig = resolveTask1PublicConfig({
  siteMode: process.env.FINREASON_TASK1_SITE_MODE,
  developmentSpaceUrl:
    process.env.NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL,
  testSpaceUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL,
  leaderboardApiUrl: process.env.NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL,
});
const siteMode = publicConfig.siteMode;
const configuredDevelopmentSpace = publicConfig.developmentSpace.url;
const configuredTestSpace = publicConfig.testSpace.url;
const configuredLeaderboardApi = publicConfig.leaderboardApi.url;

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function assertRenderedUrl(page, value) {
  const normalized = new URL(value).toString();
  const nextInlineJson = normalized
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  const candidates = [
    normalized,
    escapeHtmlAttribute(normalized),
    JSON.stringify(normalized).slice(1, -1),
    nextInlineJson,
  ];
  assert.ok(
    candidates.some((candidate) => page.includes(candidate)),
    `expected rendered output to contain configured URL ${normalized}`,
  );
}

function assertDoesNotRenderUrl(page, value) {
  const normalized = new URL(value).toString();
  const candidates = [
    normalized,
    escapeHtmlAttribute(normalized),
    JSON.stringify(normalized).slice(1, -1),
    normalized
      .replaceAll("&", "\\u0026")
      .replaceAll("<", "\\u003c")
      .replaceAll(">", "\\u003e"),
  ];
  assert.ok(
    candidates.every((candidate) => !page.includes(candidate)),
    `expected rendered output not to disclose staged URL ${normalized}`,
  );
}

async function readStaticTextArtifact() {
  const outputRoot = new URL("out/", projectRoot);
  const entries = await readdir(outputRoot, {
    recursive: true,
    withFileTypes: true,
  });
  const textExtensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsonl",
    ".txt",
    ".xml",
  ]);
  const files = entries
    .filter((entry) => entry.isFile() && textExtensions.has(path.extname(entry.name)))
    .map((entry) => new URL(entry.parentPath.replaceAll("\\", "/") + "/" + entry.name, outputRoot));
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}

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
    termsHtml,
    privacyHtml,
    pilotSubmitHtml,
    pilotLeaderboardHtml,
    issueForm,
    submissionWorkflow,
    aggregateLeaderboard,
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
    readFile(new URL("out/terms/index.html", projectRoot), "utf8"),
    readFile(new URL("out/privacy/index.html", projectRoot), "utf8"),
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
    readFile(
      new URL("app/task1/leaderboard/aggregate-leaderboard.tsx", projectRoot),
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
  assert.match(sitemap, /\/terms\//);
  assert.match(sitemap, /\/privacy\//);
  assert.doesNotMatch(sitemap, /task1\/pilot/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /\/IEEE-bigdata-cup/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40} # v5\.0\.0/);
  assert.match(workflow, /FINREASON_TASK1_SITE_MODE/);
  assert.match(workflow, /NEXT_PUBLIC_FINREASON_TASK1_DEVELOPMENT_SPACE_URL/);
  assert.match(workflow, /NEXT_PUBLIC_FINREASON_TASK1_TEST_SPACE_URL/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_FINREASON_TASK1_HF_SPACE_URL/);
  assert.match(workflow, /NEXT_PUBLIC_FINREASON_TASK1_LEADERBOARD_API_URL/);
  assert.doesNotMatch(workflow, /build-leaderboard|rebuild_pilot/);
  assert.doesNotMatch(workflow, /issues:\s*read/);
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
  assert.match(html, /Last reviewed 1 September 2026/);
  assert.match(html, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(html, /\/IEEE-bigdata-cup\/terms\//);
  assert.match(html, /\/IEEE-bigdata-cup\/privacy\//);
  assert.match(html, /mailto:zhuohan\.xie@mbzuai\.ac\.ae/);
  assert.match(html, /aria-label="Participant information and challenge sources"/);
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
  assert.match(submitHtml, /01 \/ TRAIN/);
  assert.match(submitHtml, /02 \/ DEVELOPMENT/);
  assert.match(submitHtml, /03 \/ TEST/);
  assert.match(submitHtml, /Train results are not submitted to a leaderboard/);
  assert.match(submitHtml, /SeenFAC and SeenCheckpoint immediately/);
  assert.match(submitHtml, /Test submissions receive no online score/);
  assert.match(submitHtml, /private access code issued by the organizers/);
  assert.match(submitHtml, /does not collect or store team access codes/);
  assert.match(submitHtml, /GitHub Issues are not a participant submission channel/);
  assert.match(submitHtml, /Terms of Participation/);
  assert.match(submitHtml, /Privacy Notice/);
  assert.match(submitHtml, /mailto:zhuohan\.xie@mbzuai\.ac\.ae/);
  assert.doesNotMatch(
    submitHtml,
    /GITHUB-ONLY PILOT|Prepare encrypted submission|Open GitHub submission form/,
  );
  assert.match(leaderboardHtml, /Development scores and leaderboard/);
  assert.match(leaderboardHtml, /Test submissions return receipts only/);
  assert.match(
    leaderboardHtml,
    /rel="canonical" href="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/task1\/leaderboard\/"/,
  );
  assert.match(leaderboardHtml, /PRIVATE TEAM ACCESS/);
  assert.match(leaderboardHtml, /private access code issued by the organizers/);
  assert.doesNotMatch(leaderboardHtml, /authenticated Task 1 Space|Sign in there/i);
  assert.doesNotMatch(
    leaderboardHtml,
    /GitHub-only pilot leaderboard|Seen FAC|github\.com\/The-FinAI\/IEEE-bigdata-cup\/issues/,
  );
  assert.match(leaderboardHtml, /Terms of Participation/);
  assert.match(leaderboardHtml, /Privacy Notice/);
  assert.match(
    termsHtml,
    /rel="canonical" href="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/terms\/"/,
  );
  assert.match(termsHtml, /organizer-maintained terms/);
  assert.match(termsHtml, /property="og:title" content="Terms of Participation \| FinReason Cup"/);
  assert.match(
    termsHtml,
    /property="og:url" content="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/terms\/"/,
  );
  assert.match(termsHtml, /name="twitter:title" content="Terms of Participation \| FinReason Cup"/);
  assert.match(termsHtml, /GitHub Issues are not an official participant submission channel/);
  assert.match(termsHtml, /Test submissions return an acceptance receipt only/);
  assert.match(termsHtml, /Participants retain their rights/);
  assert.match(termsHtml, /mailto:zhuohan\.xie@mbzuai\.ac\.ae/);
  assert.match(
    privacyHtml,
    /rel="canonical" href="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/privacy\/"/,
  );
  assert.match(privacyHtml, /public GitHub Pages website does not collect or store/);
  assert.match(privacyHtml, /property="og:title" content="Privacy Notice \| FinReason Cup"/);
  assert.match(
    privacyHtml,
    /property="og:url" content="https:\/\/the-finai\.github\.io\/IEEE-bigdata-cup\/privacy\/"/,
  );
  assert.match(privacyHtml, /name="twitter:title" content="Privacy Notice \| FinReason Cup"/);
  assert.match(privacyHtml, /retained for up to 120 days from acceptance/);
  assert.match(privacyHtml, /do not sell participant information/);
  assert.match(privacyHtml, /mailto:zhuohan\.xie@mbzuai\.ac\.ae/);

  if (siteMode === "final") {
    assert.ok(
      configuredDevelopmentSpace,
      "final render verification requires the configured development Space URL",
    );
    assert.ok(
      configuredTestSpace,
      "final render verification requires the configured test Space URL",
    );
    const normalizedDevelopmentSpace = new URL(configuredDevelopmentSpace).toString();
    const normalizedTestSpace = new URL(configuredTestSpace).toString();
    assert.notEqual(normalizedDevelopmentSpace, normalizedTestSpace);
    assert.match(submitHtml, /Submission Spaces available/);
    assert.match(submitHtml, /Live Pages configuration/);
    assert.match(submitHtml, /Open development submission Space/);
    assert.match(submitHtml, /Open test submission Space/);
    assert.match(leaderboardHtml, /Open development submission Space/);
    assert.doesNotMatch(leaderboardHtml, /Open test submission Space/);
    assert.match(submitHtml, /final site mode means the Pages deployment is live/i);
    assert.ok(
      submitHtml.includes(`href="${escapeHtmlAttribute(normalizedDevelopmentSpace)}"`),
    );
    assert.ok(submitHtml.includes(`href="${escapeHtmlAttribute(normalizedTestSpace)}"`));
    assert.ok(
      leaderboardHtml.includes(`href="${escapeHtmlAttribute(normalizedDevelopmentSpace)}"`),
    );
    assertDoesNotRenderUrl(leaderboardHtml, normalizedTestSpace);
    assert.doesNotMatch(submitHtml, /Space link pending verification/);
    assert.doesNotMatch(leaderboardHtml, /Development Space link pending verification/);

    if (configuredLeaderboardApi) {
      assert.match(leaderboardHtml, /Loading development results/);
      assertRenderedUrl(leaderboardHtml, configuredLeaderboardApi);
    } else {
      assert.match(leaderboardHtml, /Public aggregate table not enabled/);
    }
  } else {
    assert.equal(siteMode, "development");
    assert.match(submitHtml, /Development Space link pending verification/);
    assert.match(submitHtml, /Test Space link pending verification/);
    assert.match(submitHtml, /Development preview configuration/);
    assert.match(leaderboardHtml, /Development Space link pending verification/);
    assert.match(leaderboardHtml, /Public aggregate table not enabled/);
    assert.match(leaderboardHtml, /does not substitute pilot or cached results/);
    assert.doesNotMatch(submitHtml, /Open development submission Space|Open test submission Space/);
    if (configuredDevelopmentSpace) {
      assertDoesNotRenderUrl(submitHtml, configuredDevelopmentSpace);
      assertDoesNotRenderUrl(leaderboardHtml, configuredDevelopmentSpace);
    }
    if (configuredTestSpace) {
      assertDoesNotRenderUrl(submitHtml, configuredTestSpace);
      assertDoesNotRenderUrl(leaderboardHtml, configuredTestSpace);
    }
    const staticArtifact = await readStaticTextArtifact();
    for (const stagedEndpoint of [
      configuredDevelopmentSpace,
      configuredTestSpace,
      configuredLeaderboardApi,
    ]) {
      if (stagedEndpoint) assertDoesNotRenderUrl(staticArtifact, stagedEndpoint);
    }
  }

  assert.match(pilotLeaderboardHtml, /GitHub-only pilot leaderboard/);
  assert.match(pilotLeaderboardHtml, /organizer smoke test only/);
  assert.match(pilotLeaderboardHtml, /name="robots" content="noindex, nofollow"/);
  assert.match(pilotSubmitHtml, /TASK 1 \/ ORGANIZER-ONLY PILOT/);
  assert.match(pilotSubmitHtml, /Prepare encrypted submission/);
  assert.match(pilotSubmitHtml, /Synthetic examples only/);
  assert.match(pilotSubmitHtml, /It does not refresh the isolated pilot leaderboard/);
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
  assert.match(
    aggregateLeaderboard,
    /role="status" aria-live="polite" aria-atomic="true"/,
  );
  assert.match(aggregateLeaderboard, /aria-busy=\{state\.status === "loading"\}/);
  assert.match(aggregateLeaderboard, /<th scope="row">\{row\.teamDisplayName\}<\/th>/);
  assert.match(
    aggregateLeaderboard,
    /role="region"\s+aria-labelledby="development-table-title"\s+tabIndex=\{0\}/,
  );
});
