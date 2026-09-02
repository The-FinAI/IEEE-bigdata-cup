import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };

const expectedHeading = "Encrypted submission file";
const maxEnvelopeBytes = Math.ceil(
  (submissionConfig.max_plaintext_bytes + 4096 + 4 + 16) * 4 / 3,
) + 16_384;

function parseArguments(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Invalid command arguments");
    options.set(key.slice(2), value);
  }
  return options;
}

function exactSection(body, heading) {
  const marker = `### ${heading}`;
  const start = body.indexOf(marker);
  if (start < 0 || body.indexOf(marker, start + marker.length) >= 0) {
    throw new Error("SUBMISSION_FIELD_MISSING");
  }
  const contentStart = start + marker.length;
  const nextHeading = body.indexOf("\n### ", contentStart);
  return body.slice(contentStart, nextHeading < 0 ? body.length : nextHeading).trim();
}

export function parseSubmissionAttachment(body) {
  if (typeof body !== "string" || body.length > 100_000) throw new Error("ISSUE_BODY_INVALID");
  const section = exactSection(body, expectedHeading);
  const matches = [...section.matchAll(/\[([^\]\r\n]+\.json)\]\((https:\/\/[^\s)]+)\)/gi)];
  if (matches.length !== 1) throw new Error("ATTACHMENT_COUNT_INVALID");
  const fileName = matches[0][1];
  const url = new URL(matches[0][2]);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hostname !== "github.com" ||
    !/^\/user-attachments\/(?:files\/\d+\/[^/]+|assets\/[0-9a-f-]{16,})$/i.test(url.pathname)
  ) {
    throw new Error("ATTACHMENT_URL_INVALID");
  }
  return { fileName, url: url.toString() };
}

function redirectHostAllowed(hostname) {
  return (
    hostname === "github.com" ||
    hostname === "objects.githubusercontent.com" ||
    hostname === "user-images.githubusercontent.com" ||
    /^github-production-user-asset-[a-z0-9-]+\.s3\.amazonaws\.com$/i.test(hostname)
  );
}

export async function downloadBounded(initialUrl, fetchImpl = fetch) {
  let current = new URL(initialUrl);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (current.protocol !== "https:" || current.username || current.password || current.port) {
      throw new Error("ATTACHMENT_REDIRECT_INVALID");
    }
    if (redirects > 0 && !redirectHostAllowed(current.hostname)) {
      throw new Error("ATTACHMENT_REDIRECT_INVALID");
    }
    const response = await fetchImpl(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "finreason-task1-development-intake/1" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("ATTACHMENT_REDIRECT_INVALID");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok || !response.body) throw new Error("ATTACHMENT_DOWNLOAD_FAILED");
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxEnvelopeBytes) {
      throw new Error("ATTACHMENT_TOO_LARGE");
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.byteLength;
      if (total > maxEnvelopeBytes) throw new Error("ATTACHMENT_TOO_LARGE");
      chunks.push(Buffer.from(chunk));
    }
    if (total === 0) throw new Error("ATTACHMENT_EMPTY");
    return Buffer.concat(chunks, total);
  }
  throw new Error("ATTACHMENT_REDIRECT_LIMIT");
}

export function validateIssueEvent(event) {
  if (!event || event.action !== "opened") throw new Error("EVENT_NOT_OPENED");
  if (event.repository?.id !== submissionConfig.repository_id || event.repository?.full_name !== submissionConfig.repository) {
    throw new Error("REPOSITORY_MISMATCH");
  }
  if (!Number.isInteger(event.issue?.number) || typeof event.issue?.node_id !== "string") {
    throw new Error("ISSUE_ID_INVALID");
  }
  const login = event.issue?.user?.login;
  const actorId = event.issue?.user?.id;
  if (typeof login !== "string" || !Number.isInteger(actorId)) throw new Error("ACTOR_INVALID");
  const labels = new Set((event.issue?.labels ?? []).map((label) => label?.name));
  if (!labels.has(submissionConfig.issue_label)) throw new Error("FORM_LABEL_MISSING");
  const createdAt = event.issue?.created_at;
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("ISSUE_TIME_INVALID");
  }
  return {
    issue_number: event.issue.number,
    issue_node_id: event.issue.node_id,
    issue_created_at: createdAt,
    actor_id: actorId,
    github_login: login,
    body: event.issue.body,
  };
}

export async function runIntake({ event, eventBytes = Buffer.from(JSON.stringify(event)), download = downloadBounded }) {
  const issue = validateIssueEvent(event);
  const attachment = parseSubmissionAttachment(issue.body);
  const envelopeBytes = await download(attachment.url);
  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(envelopeBytes));
  } catch {
    throw new Error("ENVELOPE_JSON_INVALID");
  }
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("ENVELOPE_JSON_INVALID");
  }
  return {
    intake: {
      schema_version: "finreason.task1.github-development-intake/1.0.0",
      repository: submissionConfig.repository,
      repository_id: submissionConfig.repository_id,
      phase: submissionConfig.phase,
      evaluation_version: submissionConfig.evaluation_version,
      issue_number: issue.issue_number,
      issue_node_id: issue.issue_node_id,
      issue_created_at: issue.issue_created_at,
      actor_id: issue.actor_id,
      github_login: issue.github_login,
      attachment_name: basename(attachment.fileName),
      envelope_sha256: createHash("sha256").update(envelopeBytes).digest("hex"),
      event_sha256: createHash("sha256").update(eventBytes).digest("hex"),
      received_at: new Date().toISOString(),
    },
    envelopeBytes,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const eventPath = options.get("event");
  const outputDirectory = options.get("out");
  if (!eventPath || !outputDirectory) throw new Error("Usage: intake.mjs --event EVENT --out DIRECTORY");
  const eventBytes = await readFile(resolve(eventPath));
  const event = JSON.parse(eventBytes.toString("utf8"));
  const result = await runIntake({ event, eventBytes });
  await mkdir(resolve(outputDirectory), { recursive: true, mode: 0o700 });
  await writeFile(resolve(outputDirectory, "envelope.json"), result.envelopeBytes, { mode: 0o600 });
  await writeFile(resolve(outputDirectory, "intake.json"), `${JSON.stringify(result.intake)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: "accepted", ...result.intake })}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    const code = error instanceof Error ? error.message : "INTAKE_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "rejected", error_code: code })}\n`);
    process.exitCode = 2;
  });
}
