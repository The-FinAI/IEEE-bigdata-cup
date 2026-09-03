const SCHEMA_VERSION = "finreason.task1.development-leaderboard/2.0.0";
const SCORE_PATTERN = /^(?:0\.[0-9]{6}|1\.000000)$/;
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

function parseTeamDisplayName(value, index) {
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").replace(/\p{White_Space}+/gu, " ").trim()
    : "";
  if (
    typeof value !== "string" ||
    value !== normalized ||
    [...value].length < 1 ||
    [...value].length > 120 ||
    /\p{C}/u.test(value)
  ) {
    throw new Error(`Leaderboard row ${index} has an invalid team_name.`);
  }
  return value;
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

  let previousRow = null;

  const rows = payload.rows.map((row, index) => {
    if (
      !isObject(row) ||
      !hasExactKeys(row, [
        "accepted_at",
        "final_answer_score",
        "rank",
        "reasoning_steps_score",
        "team_name",
      ])
    ) {
      throw new Error(`Leaderboard row ${index} has the wrong fields.`);
    }

    const displayName = parseTeamDisplayName(row.team_name, index);
    if (
      !Number.isInteger(row.rank) ||
      row.rank < 1 ||
      typeof row.final_answer_score !== "string" ||
      !SCORE_PATTERN.test(row.final_answer_score) ||
      typeof row.reasoning_steps_score !== "string" ||
      !SCORE_PATTERN.test(row.reasoning_steps_score)
    ) {
      throw new Error(`Leaderboard row ${index} is invalid.`);
    }

    const normalized = {
      rank: row.rank,
      teamDisplayName: displayName,
      seenFac: row.final_answer_score,
      seenCheckpoint: row.reasoning_steps_score,
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

    // Team identity and best-per-team deduplication are authoritative server
    // behavior. JavaScript has no Python-equivalent full Unicode casefold, so
    // the public client validates the canonical display form without applying
    // a lossy approximation that could reject valid distinct team names.
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
      credentials: "omit",
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
