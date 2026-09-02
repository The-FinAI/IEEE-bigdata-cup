import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import evaluatorConfig from "../../config/task1-evaluator.json" with { type: "json" };

const developmentFiles = Object.freeze({
  "train_questions.jsonl": "60851375e2d64b348bb5efe95466a894acab5978caac03e55ec9bfeb6d9d3046",
  "train_gold.jsonl": "850c52100fbae1ff451eaffb9c59f4293c5c51d4f28581bb43b9c0147012824e",
  "train_manifest.jsonl": "9ea9426a9f1a6dd2cba1fbe35c3d199b446422d98761d721ee34de1736eae441",
  "train_targets.jsonl": "6c2d2fabfd126bc5b7a6e8cccd6ef646b590179eb3feb6246430523176efdc19",
  "dev_questions.jsonl": "2c83939565f38066e69daaca1ca1cb9b9c2b8da60f9e852ffa31907c7e742216",
  "dev_gold.jsonl": "27a2e0ea0f4cccaa30b6a4e321e20a7517bdc13d98112e72dc57e99b4c9b0e95",
  "dev_manifest.jsonl": "6e6566c9a4b37309ec680d21c90e4d44e604af6a33b769d27b5c1ca06358a0b8",
  "dev_targets.jsonl": "47b758df42ea68e5f1f250ffdc07697a433ea9c8acf5ef63f0f55a943eaa0d32",
  "leaderboard_questions.jsonl": "829b49003cdecb935d0d4548bb54bedfa1a0ebcd42fd2517844f112414b5f5b4",
  "leaderboard_expected_ids.json": "aeb5694f3fd0d05b95940a3a8d4547247bcce4a77d1aecadf2b4b242b6f3238f",
  "sample_b0_predictions.jsonl": "a5dd6cf8ce09e85f2b9fc05ab4d53ccc9ddb1261c961b12af74488230b4c0ab9",
  "sample_b0_submission.zip": "ea934d8c3e0dcffa1a6d123ad2a2d1d71a317c492d11d73f3318e2aa9247b8fb",
  "release_manifest.json": "78ba29228132323b5b54eddf1d1d4cc46defbce3559b4752d0cbf6773a9422f7",
});
const testFiles = Object.freeze({
  "test_questions.jsonl": "0a89a55aef94e812b03db27896c8de9bd20c71eb0925692bd99f7da7afbb3456",
  "test_expected_ids.json": "ff89c3fb6ea2185090b551d3780bb0d638bb82db86119615756f6579d2ba5e33",
  "test_release_manifest.json": "b0ca6bd07150777037964ed24fa2ae52fb235edf8b43859096820ee101183436",
});
const forbiddenNames = new Set([
  "dev-reference.enc.json",
  "leaderboard_gold.jsonl",
  "leaderboard_manifest.jsonl",
]);

async function filesBelow(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unexpected public filesystem entry: ${path}`);
  }
  return result;
}

function sameSet(actual, expected) {
  return actual.size === expected.size && [...actual].every((item) => expected.has(item));
}

async function verifyMirroredFiles(outputRoot, phase, expected) {
  const sourceRoot = resolve("public/task1/data", phase);
  const deployedRoot = resolve(outputRoot, "task1/data", phase);
  const entries = await readdir(deployedRoot, { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile())) {
    throw new Error(`${phase} public directory must contain regular files only`);
  }
  const names = new Set(entries.map((entry) => entry.name));
  if (!sameSet(names, new Set(Object.keys(expected)))) throw new Error(`${phase} public allowlist differs from the frozen exact set`);
  for (const name of names) {
    const source = await readFile(join(sourceRoot, name));
    const deployed = await readFile(join(deployedRoot, name));
    const sourceHash = createHash("sha256").update(source).digest("hex");
    const deployedHash = createHash("sha256").update(deployed).digest("hex");
    if (sourceHash !== expected[name] || deployedHash !== expected[name]) {
      throw new Error(`${phase}/${name} differs from its frozen SHA-256`);
    }
  }
}

const rootIndex = process.argv.indexOf("--root");
const outputRoot = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : "out");
if (!(await stat(outputRoot)).isDirectory()) throw new Error("Public output directory is missing");
await verifyMirroredFiles(outputRoot, "development", developmentFiles);
await verifyMirroredFiles(outputRoot, "test", testFiles);

const forbiddenValues = [evaluatorConfig.reference_envelope_sha256];
for (const path of await filesBelow(outputRoot)) {
  if (forbiddenNames.has(basename(path)) || path.includes("/task1/pilot/")) {
    throw new Error(`Private or retired path reached Pages: ${path}`);
  }
  const metadata = await stat(path);
  if (metadata.size > 10 * 1024 * 1024) continue;
  const content = await readFile(path, "utf8");
  if (/Hugging Face|\.hf\.space/i.test(content)) throw new Error(`Retired endpoint wording reached Pages: ${path}`);
  if (forbiddenValues.some((value) => content.includes(value))) {
    throw new Error(`Private evaluator commitment reached Pages: ${path}`);
  }
}

process.stdout.write("TASK1_PUBLIC_BOUNDARY_OK\n");
