import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const requiredFiles = [
  "docs/organizer-runbook.md",
  "docs/claimable-work.md",
  ".github/ISSUE_TEMPLATE/organizer-claim.yml",
  ".github/ISSUE_TEMPLATE/participant-question.yml",
  ".github/ISSUE_TEMPLATE/release-blocker.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  "starter-kit/README.md",
  "starter-kit/docs/release_checklist.md",
];

async function collectEntries(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    collected.push({ entry, relativePath });

    if (entry.isDirectory()) {
      collected.push(
        ...(await collectEntries(
          path.join(directory, entry.name),
          relativePath,
        )),
      );
    }
  }

  return collected;
}

test("contains the organizer operations contract", async () => {
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    const fileStat = await stat(absolutePath);
    assert.ok(fileStat.isFile(), `${relativePath} must be a regular file`);
  }
});

test("starter-kit excludes Python cache artifacts", async () => {
  const starterKit = path.join(projectRoot, "starter-kit");
  const entries = await collectEntries(starterKit);
  const cacheArtifacts = entries
    .filter(
      ({ entry }) =>
        (entry.isDirectory() && entry.name === "__pycache__") ||
        (entry.isFile() && entry.name.endsWith(".pyc")),
    )
    .map(({ relativePath }) => relativePath);

  assert.deepEqual(
    cacheArtifacts,
    [],
    `starter-kit contains Python cache artifacts: ${cacheArtifacts.join(", ")}`,
  );
});
