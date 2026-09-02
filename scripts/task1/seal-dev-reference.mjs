import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };
import { sealDevelopmentReference } from "../../lib/task1-dev-reference.mjs";

function options(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith("--") || argv[index + 1] === undefined) throw new Error("Invalid arguments");
    result.set(argv[index].slice(2), argv[index + 1]);
  }
  return result;
}

const args = options(process.argv.slice(2));
const goldPath = args.get("gold");
const manifestPath = args.get("manifest");
const outputPath = args.get("out");
if (!goldPath || !manifestPath || !outputPath) {
  throw new Error("Usage: seal-dev-reference.mjs --gold FILE --manifest FILE --out FILE");
}

const envelope = await sealDevelopmentReference({
  goldBytes: await readFile(resolve(goldPath)),
  manifestBytes: await readFile(resolve(manifestPath)),
  recipientPublicKeyB64: submissionConfig.recipient_public_key_b64,
  keyFingerprintSha256: submissionConfig.key_fingerprint_sha256,
  commitments: submissionConfig,
  createdAt: "2026-09-02T00:00:00Z",
});
await writeFile(resolve(outputPath), `${JSON.stringify(envelope)}\n`, { mode: 0o600 });
