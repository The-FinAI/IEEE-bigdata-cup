import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("contains the complete FinReason Cup landing-page contract", async () => {
  const [html, page, layout, launchStatus, nextConfig, workflow, packageJson] =
    await Promise.all([
    readFile(new URL("out/index.html", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/launch-status.tsx", projectRoot), "utf8"),
    readFile(new URL("next.config.ts", projectRoot), "utf8"),
    readFile(
      new URL(".github/workflows/deploy-pages.yml", projectRoot),
      "utf8",
    ),
    readFile(new URL("package.json", projectRoot), "utf8"),
  ]);

  assert.match(page, /FinReason Cup/);
  assert.match(page, /Verifiable Financial Chain Reasoning/);
  assert.match(page, /Market-Neutral Hedging/);
  assert.match(page, /Financial Audit Verification/);
  assert.match(page, /Submit optional LOI/);
  assert.match(page, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(launchStatus, /not required to access the/);
  assert.match(launchStatus, /Teams may participate even if they do not submit/);
  assert.match(launchStatus, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(layout, /FinReason Cup 2026/);
  assert.match(layout, /the-finai\.github\.io\/IEEE-bigdata-cup/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /\/IEEE-bigdata-cup/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(packageJson, /build:pages/);
  assert.match(html, /Official challenge overview/);
  assert.match(html, /Submit optional LOI/);
  assert.match(html, /forms\.gle\/D4VJqjgtmcaC77DL8/);
  assert.match(html, /\/IEEE-bigdata-cup\/finreason-hero\.png/);
  assert.doesNotMatch(html, /\/api\/interest|name="contactEmail"/);
  assert.doesNotMatch(page, /The proposal supports/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview|2027 IEEE/i);
  assert.doesNotMatch(layout, /next\/headers|headers\(\)/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|drizzle/);
});
