import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };
import {
  decodeResultMarker,
  markerPrefix,
  renderResultComment,
  validateResultRecord,
} from "./result-record.mjs";

const apiRoot = "https://api.github.com";
const maximumCommentPages = 100;

async function github(path, { method = "GET", body, token, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${apiRoot}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "finreason-task1-development-publisher/1",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed with ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function fetchAllComments(issuePath, options) {
  const comments = [];
  for (let page = 1; page <= maximumCommentPages; page += 1) {
    const batch = await github(`${issuePath}/comments?per_page=100&page=${page}`, options);
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw new Error("Development result comment scan exceeded its safety limit");
}

export function validatePublishEvent(record, event, verification = {}) {
  validateResultRecord(record, verification);
  if (
    event?.action !== "opened" ||
    event.repository?.id !== submissionConfig.repository_id ||
    event.repository?.full_name !== submissionConfig.repository ||
    event.issue?.number !== record.issue_number ||
    event.issue?.node_id !== record.issue_node_id ||
    event.issue?.created_at !== record.issue_created_at ||
    event.issue?.user?.id !== record.actor_id ||
    event.issue?.user?.login?.toLowerCase() !== record.github_login.toLowerCase()
  ) {
    throw new Error("RESULT_EVENT_MISMATCH");
  }
  return record;
}

export async function publishResult({ record, event, token, fetchImpl = fetch, verification = {} }) {
  validatePublishEvent(record, event, verification);
  const issuePath = `/repos/${submissionConfig.repository}/issues/${record.issue_number}`;
  const comments = await fetchAllComments(issuePath, { token, fetchImpl });
  const markerComments = comments.filter(
    (comment) => comment.user?.login === "github-actions[bot]" && comment.body?.includes(markerPrefix),
  );
  const existingRecords = markerComments.map((comment) => decodeResultMarker(comment.body, verification));
  if (existingRecords.some((existing) => !existing) || existingRecords.length > 1) {
    throw new Error("Development result comment integrity check failed");
  }
  const existing = existingRecords[0] ?? null;
  const body = renderResultComment(record, verification);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(record)) {
      throw new Error("A different development result already exists for this issue");
    }
  } else {
    await github(`${issuePath}/comments`, { method: "POST", body: { body }, token, fetchImpl });
  }
  const label = record.status === "scored" ? submissionConfig.scored_label : submissionConfig.invalid_label;
  await github(`${issuePath}/labels`, { method: "POST", body: { labels: [label] }, token, fetchImpl });
  await github(issuePath, { method: "PATCH", body: { state: "closed", state_reason: "completed" }, token, fetchImpl });
  await github(`${issuePath}/lock`, { method: "PUT", body: { lock_reason: "resolved" }, token, fetchImpl });

  return { status: existing ? "already-published" : "published", label };
}

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

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const resultPath = options.get("result");
  const eventPath = options.get("event");
  const token = process.env.GITHUB_TOKEN;
  if (!resultPath || !eventPath || !token) throw new Error("Missing result, event, or GitHub token");
  const record = JSON.parse(await readFile(resolve(resultPath), "utf8"));
  const event = JSON.parse(await readFile(resolve(eventPath), "utf8"));
  const outcome = await publishResult({ record, event, token });
  process.stdout.write(`${JSON.stringify(outcome)}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Publishing failed"}\n`);
    process.exitCode = 1;
  });
}
