const SCHEMA_VERSION = "finreason.task1.development-leaderboard/1.0.0";
const TEAM_ID_PATTERN = /^team-[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const SCORE_PATTERN = /^(?:0\.[0-9]{6}|1\.000000)$/;
const SUBMISSION_ID_PATTERN =
  /^dev-[0-9]{8}T[0-9]{6}Z-team-[a-z0-9-]{1,48}-[0-9a-f]{64}$/;
const RFC3339_UTC_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const MAX_RESPONSE_BYTES = 1_048_576;

async function readBoundedResponseBody(response) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel("Leaderboard response is too large.");
        throw new Error("Leaderboard response is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function parseAcceptedAt(value) {
  const parsed = typeof value === "string" ? new Date(value) : null;
  if (
    typeof value !== "string" ||
    !RFC3339_UTC_PATTERN.test(value) ||
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().replace(".000Z", "Z") !== value
  ) {
    throw new Error("Leaderboard accepted_at is invalid.");
  }
  return value;
}

function compareScores(left, right) {
  if (left.seenFac !== right.seenFac) {
    return left.seenFac > right.seenFac ? -1 : 1;
  }
  if (left.seenCheckpoint !== right.seenCheckpoint) {
    return left.seenCheckpoint > right.seenCheckpoint ? -1 : 1;
  }
  return 0;
}

export function parseDevelopmentLeaderboard(payload) {
  if (
    !isObject(payload) ||
    !hasExactKeys(payload, ["phase", "rows", "schema_version"]) ||
    payload.schema_version !== SCHEMA_VERSION ||
    payload.phase !== "development" ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error(`Leaderboard must use ${SCHEMA_VERSION}.`);
  }

  const observedTeams = new Set();
  const observedSubmissions = new Set();
  let previousRow = null;

  const rows = payload.rows.map((row, index) => {
    if (
      !isObject(row) ||
      !hasExactKeys(row, [
        "accepted_at",
        "rank",
        "seen_checkpoint",
        "seen_fac",
        "submission_id",
        "team_display_name",
        "team_id",
      ])
    ) {
      throw new Error(`Leaderboard row ${index} has the wrong fields.`);
    }

    const displayName = row.team_display_name;
    if (
      !Number.isInteger(row.rank) ||
      row.rank < 1 ||
      typeof row.team_id !== "string" ||
      !TEAM_ID_PATTERN.test(row.team_id) ||
      observedTeams.has(row.team_id) ||
      typeof displayName !== "string" ||
      displayName !== displayName.trim() ||
      [...displayName].length < 1 ||
      [...displayName].length > 120 ||
      /[\r\n\t]/.test(displayName) ||
      typeof row.seen_fac !== "string" ||
      !SCORE_PATTERN.test(row.seen_fac) ||
      typeof row.seen_checkpoint !== "string" ||
      !SCORE_PATTERN.test(row.seen_checkpoint) ||
      typeof row.submission_id !== "string" ||
      !SUBMISSION_ID_PATTERN.test(row.submission_id) ||
      observedSubmissions.has(row.submission_id)
    ) {
      throw new Error(`Leaderboard row ${index} is invalid.`);
    }

    const normalized = {
      rank: row.rank,
      teamId: row.team_id,
      teamDisplayName: displayName,
      seenFac: row.seen_fac,
      seenCheckpoint: row.seen_checkpoint,
      submissionId: row.submission_id,
      acceptedAt: parseAcceptedAt(row.accepted_at),
    };

    const expectedRank =
      previousRow && compareScores(previousRow, normalized) === 0
        ? previousRow.rank
        : index + 1;
    if (
      normalized.rank !== expectedRank ||
      (previousRow && compareScores(previousRow, normalized) > 0)
    ) {
      throw new Error(`Leaderboard row ${index} has invalid rank or order.`);
    }

    observedTeams.add(normalized.teamId);
    observedSubmissions.add(normalized.submissionId);
    previousRow = normalized;
    return normalized;
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    phase: "development",
    rows,
  };
}

export async function fetchDevelopmentLeaderboard(
  dataUrl,
  {
    fetchImpl = globalThis.fetch,
    signal,
    timeoutMs = 15_000,
  } = {},
) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = setTimeout(
    () => controller.abort(new Error("Leaderboard request timed out.")),
    timeoutMs,
  );
  try {
    const response = await fetchImpl(dataUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Leaderboard request returned ${response.status}.`);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error("Leaderboard response is too large.");
    }
    const body = await readBoundedResponseBody(response);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error("Leaderboard response is not valid JSON.");
    }
    return parseDevelopmentLeaderboard(payload);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export { SCHEMA_VERSION as TASK1_LEADERBOARD_SCHEMA_VERSION };
