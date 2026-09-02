import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import submissionConfig from "../../config/task1-evaluator.json" with { type: "json" };
import { decodeResultMarker, markerPrefix, validateResultRecord } from "./result-record.mjs";

const maximumPages = 100;

function compareResults(left, right) {
  if (left.seen_fac !== right.seen_fac) return right.seen_fac.localeCompare(left.seen_fac);
  if (left.seen_checkpoint !== right.seen_checkpoint) return right.seen_checkpoint.localeCompare(left.seen_checkpoint);
  const timeOrder = left.accepted_at.localeCompare(right.accepted_at);
  return timeOrder || left.issue_number - right.issue_number;
}

export function buildLeaderboard(records, verification = {}) {
  const byIssue = new Map();
  for (const record of records) {
    validateResultRecord(record, verification);
    if (
      record.status !== "scored" ||
      record.phase !== "development" ||
      submissionConfig.leaderboard_excluded_actor_ids.includes(record.actor_id)
    ) continue;
    const existing = byIssue.get(record.issue_number);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record)) {
      throw new Error(`Conflicting signed results for issue ${record.issue_number}`);
    }
    byIssue.set(record.issue_number, record);
  }
  const bestByActor = new Map();
  for (const record of byIssue.values()) {
    const existing = bestByActor.get(record.actor_id);
    if (!existing || compareResults(record, existing) < 0) bestByActor.set(record.actor_id, record);
  }
  const ordered = [...bestByActor.values()].sort(compareResults);
  let priorScore = null;
  let rank = 0;
  return {
    schema_version: "finreason.task1.development-leaderboard/1.0.0",
    phase: "development",
    rows: ordered.map((record, index) => {
      const score = `${record.seen_fac}|${record.seen_checkpoint}`;
      if (score !== priorScore) {
        rank = index + 1;
        priorScore = score;
      }
      return {
        rank,
        team_id: record.team_id,
        team_display_name: `@${record.github_login}`,
        seen_fac: record.seen_fac,
        seen_checkpoint: record.seen_checkpoint,
        submission_id: record.submission_id,
        accepted_at: record.accepted_at,
      };
    }),
  };
}

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "finreason-task1-development-leaderboard/1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub API request failed with ${response.status}`);
  return response.json();
}

export function resultMatchesIssue(record, issue) {
  return Boolean(
    record &&
    record.issue_number === issue.number &&
    record.issue_node_id === issue.node_id &&
    record.issue_created_at === issue.created_at &&
    record.actor_id === issue.user?.id
  );
}

async function fetchIssueComments(issueNumber, token) {
  const comments = [];
  for (let page = 1; page <= maximumPages; page += 1) {
    const batch = await github(
      `/repos/${submissionConfig.repository}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
      token,
    );
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw new Error(`Comment scan exceeded safety limit for issue ${issueNumber}`);
}

async function fetchScoredRecords(token) {
  const records = [];
  for (let page = 1; page <= maximumPages; page += 1) {
    const issues = await github(
      `/repos/${submissionConfig.repository}/issues?state=all&labels=${encodeURIComponent(submissionConfig.scored_label)}&per_page=100&page=${page}`,
      token,
    );
    for (const issue of issues) {
      if (issue.pull_request) continue;
      const comments = await fetchIssueComments(issue.number, token);
      const marked = comments.filter((comment) => comment.user?.login === "github-actions[bot]" && comment.body?.includes(markerPrefix));
      if (marked.length !== 1) throw new Error(`Signed result count is invalid for issue ${issue.number}`);
      const record = decodeResultMarker(marked[0].body);
      if (!record || !resultMatchesIssue(record, issue)) throw new Error(`Signed result binding failed for issue ${issue.number}`);
      records.push(record);
    }
    if (issues.length < 100) return records;
  }
  throw new Error("Development result scan exceeded safety limit");
}

async function main() {
  const outputIndex = process.argv.indexOf("--out");
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const token = process.env.GITHUB_TOKEN;
  if (!outputPath || !token) throw new Error("Missing output path or GitHub token");
  const leaderboard = buildLeaderboard(await fetchScoredRecords(token));
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(leaderboard, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "built", rows: leaderboard.rows.length })}\n`);
}

if (process.argv[1]?.endsWith("build-leaderboard.mjs")) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Leaderboard build failed"}\n`);
    process.exitCode = 1;
  });
}
