import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pilotConfig from "../../public/task1/pilot-config.json" with { type: "json" };
import { decryptSubmissionEnvelope } from "../../lib/task1-envelope.mjs";
import { signResultRecord } from "./result-record.mjs";

function parseArguments(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith("--") || argv[index + 1] === undefined) {
      throw new Error("Invalid command arguments");
    }
    options.set(argv[index].slice(2), argv[index + 1]);
  }
  return options;
}

function participantError(code, intake) {
  return {
    schema_version: "finreason.task1.github-pilot-result/1.0.0",
    status: "participant_error",
    error_code: code,
    evaluation_version: pilotConfig.evaluation_version,
    repository: intake.repository,
    issue_number: intake.issue_number,
    issue_node_id: intake.issue_node_id,
    issue_created_at: intake.issue_created_at,
    actor_id: intake.actor_id,
    github_login: intake.github_login,
  };
}

export async function scorePilot({ intake, envelope, privateKeyB64 }) {
  let decrypted;
  try {
    decrypted = await decryptSubmissionEnvelope({
      envelope,
      recipientPrivateKeyPkcs8B64: privateKeyB64,
      expectedKeyFingerprintSha256: pilotConfig.key_fingerprint_sha256,
      expectedEvaluationVersion: pilotConfig.evaluation_version,
      maxPlaintextBytes: pilotConfig.max_plaintext_bytes,
    });
  } catch {
    return participantError("ENVELOPE_DECRYPTION_FAILED", intake);
  }
  if (decrypted.metadata.github_login.toLowerCase() !== intake.github_login.toLowerCase()) {
    return participantError("GITHUB_LOGIN_MISMATCH", intake);
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "finreason-task1-pilot-"));
  const archivePath = join(temporaryDirectory, "predictions.zip");
  try {
    await writeFile(archivePath, decrypted.archiveBytes, { mode: 0o600 });
    const scorerPath = fileURLToPath(new URL("./pilot_scorer.py", import.meta.url));
    const processResult = spawnSync("python3", [scorerPath, archivePath], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", PYTHONHASHSEED: "0" },
      timeout: 60_000,
      maxBuffer: 128 * 1024,
    });
    if (processResult.status !== 0) throw new Error("SCORER_FAILED");
    const score = JSON.parse(processResult.stdout);
    if (score.status === "participant_error") {
      return participantError(score.error_code, intake);
    }
    if (
      score.status !== "scored" ||
      score.evaluation_version !== pilotConfig.evaluation_version ||
      !/^(?:0\.\d{6}|1\.000000)$/.test(score.seen_fac) ||
      !/^(?:0\.\d{6}|1\.000000)$/.test(score.seen_checkpoint) ||
      score.case_count !== 2
    ) {
      throw new Error("SCORER_OUTPUT_INVALID");
    }
    return {
      schema_version: "finreason.task1.github-pilot-result/1.0.0",
      status: "scored",
      evaluation_version: pilotConfig.evaluation_version,
      repository: intake.repository,
      issue_number: intake.issue_number,
      issue_node_id: intake.issue_node_id,
      issue_created_at: intake.issue_created_at,
      actor_id: intake.actor_id,
      github_login: intake.github_login,
      seen_fac: score.seen_fac,
      seen_checkpoint: score.seen_checkpoint,
      case_count: score.case_count,
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const intakePath = options.get("intake");
  const envelopePath = options.get("envelope");
  const outputPath = options.get("out");
  const privateKeyB64 = process.env.TASK1_PILOT_PRIVATE_KEY_PKCS8_B64;
  const signingPrivateKeyB64 = process.env.TASK1_PILOT_SIGNING_PRIVATE_KEY_PKCS8_B64;
  if (!intakePath || !envelopePath || !outputPath || !privateKeyB64 || !signingPrivateKeyB64) {
    throw new Error("Missing scorer input or key");
  }
  const intake = JSON.parse(await readFile(resolve(intakePath), "utf8"));
  const envelope = JSON.parse(await readFile(resolve(envelopePath), "utf8"));
  const result = signResultRecord(
    await scorePilot({ intake, envelope, privateKeyB64 }),
    signingPrivateKeyB64,
  );
  await writeFile(resolve(outputPath), `${JSON.stringify(result)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: result.status, issue_number: result.issue_number })}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(() => {
    process.stderr.write('{"status":"infrastructure_error","error_code":"SCORING_PIPELINE_FAILED"}\n');
    process.exitCode = 1;
  });
}
