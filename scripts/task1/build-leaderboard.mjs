import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pilotConfig from "../../public/task1/pilot-config.json" with { type: "json" };
import { decodeResultMarker, markerPrefix } from "./result-record.mjs";

const maximumCommentPages = 100;

function compareResults(left, right) {
  if (left.seen_fac !== right.seen_fac) return right.seen_fac.localeCompare(left.seen_fac);
  if (left.seen_checkpoint !== right.seen_checkpoint) {
    return right.seen_checkpoint.localeCompare(left.seen_checkpoint);
  }
  const timeOrder = left.issue_created_at.localeCompare(right.issue_created_at);
  return timeOrder || left.issue_number - right.issue_number;
}

export function buildLeaderboard(records, generatedAt = new Date().toISOString()) {
  const scoredByIssue = new Map();
  for (const record of records) {
    if (record?.status !== "scored" || record.evaluation_version !== pilotConfig.evaluation_version) continue;
    if (!scoredByIssue.has(record.issue_number)) scoredByIssue.set(record.issue_number, record);
  }
  const byActor = new Map();
  for (const record of scoredByIssue.values()) {
    const existing = byActor.get(record.actor_id) ?? { attempts: 0, best: record };
    existing.attempts += 1;
    if (compareResults(record, existing.best) < 0) existing.best = record;
    byActor.set(record.actor_id, existing);
  }
  const ordered = [...byActor.values()].sort((left, right) => compareResults(left.best, right.best));
  let lastScore = null;
  let lastRank = 0;
  const rows = ordered.map(({ attempts, best }, index) => {
    const scoreKey = `${best.seen_fac}|${best.seen_checkpoint}`;
    if (scoreKey !== lastScore) {
      lastRank = index + 1;
      lastScore = scoreKey;
    }
    return {
      rank: lastRank,
      github_login: best.github_login,
      seen_fac: best.seen_fac,
      seen_checkpoint: best.seen_checkpoint,
      attempts,
      last_submission_issue: best.issue_number,
    };
  });
  return {
    schema_version: "finreason.task1.github-pilot-leaderboard/1.0.0",
    generated_at: generatedAt,
    evaluation_version: pilotConfig.evaluation_version,
    status: "organizer-pilot",
    rows,
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "finreason-task1-pilot-leaderboard/1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub API request failed with ${response.status}`);
  return response.json();
}

async function fetchAllComments(commentsUrl, token) {
  const comments = [];
  for (let page = 1; page <= maximumCommentPages; page += 1) {
    const batch = await githubJson(`${commentsUrl}?per_page=100&page=${page}`, token);
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw new Error("Pilot leaderboard comment scan exceeded its safety limit");
}

export function resultMatchesIssue(record, issue) {
  return Boolean(
    record &&
    record.issue_number === issue.number &&
    record.issue_node_id === issue.node_id &&
    record.issue_created_at === issue.created_at &&
    record.actor_id === issue.user?.id &&
    record.github_login.toLowerCase() === issue.user?.login?.toLowerCase()
  );
}

async function fetchScoredRecords(token) {
  const records = [];
  for (let page = 1; ; page += 1) {
    const issues = await githubJson(
      `https://api.github.com/repos/${pilotConfig.repository}/issues?state=all&labels=task1-pilot-scored&per_page=100&page=${page}`,
      token,
    );
    for (const issue of issues) {
      if (issue.pull_request) continue;
      const comments = await fetchAllComments(issue.comments_url, token);
      let markerCount = 0;
      for (const comment of comments) {
        if (comment.user?.login !== "github-actions[bot]") continue;
        if (!comment.body?.includes(markerPrefix)) continue;
        markerCount += 1;
        const record = decodeResultMarker(comment.body);
        if (!record || !resultMatchesIssue(record, issue)) {
          throw new Error(`Pilot result integrity check failed for issue ${issue.number}`);
        }
        records.push(record);
      }
      if (markerCount > 1) throw new Error(`Multiple pilot results found for issue ${issue.number}`);
    }
    if (issues.length < 100) break;
  }
  return records;
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

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Leaderboard build failed"}\n`);
    process.exitCode = 1;
  });
}
