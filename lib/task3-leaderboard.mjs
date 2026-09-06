const SCHEMA_VERSION = "finreason.task3.development-leaderboard/1.0.0";
// Two-decimal percentages, 0.00 through 100.00. Task 1's 0-1 six-decimal form
// is a different contract and must not be accepted here.
const SCORE_PATTERN = /^(?:100\.00|[1-9]?\d\.\d{2})$/;
const RFC3339_UTC_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const VALID_BASES = new Set(["official", "deterministic"]);
const MAX_RESPONSE_BYTES = 1_048_576;
const ROW_KEYS = ["acc", "accepted_at", "cer", "eer", "rank", "ser", "team_name"];
const PAYLOAD_KEYS = ["basis", "phase", "rows", "schema_version"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((k, i) => k === expected[i]);
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

function parseAcceptedAt(value, index) {
  const parsed = typeof value === "string" ? new Date(value) : null;
  if (
    typeof value !== "string" ||
    !RFC3339_UTC_PATTERN.test(value) ||
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().replace(".000Z", "Z") !== value
  ) {
    throw new Error(`Leaderboard row ${index} has an invalid accepted_at.`);
  }
  return value;
}

// Compared as NUMBERS. These are percentages of varying width, so "9.00" is
// lexicographically greater than "48.19" while being numerically smaller --
// a text comparison would silently accept a wrongly ordered board.
function scoreTuple(row) {
  return [-Number(row.acc), Number(row.cer), Number(row.eer), Number(row.ser)];
}

function compareRows(left, right) {
  const a = scoreTuple(left);
  const b = scoreTuple(right);
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function parseDevelopmentLeaderboard(payload) {
  if (
    !isObject(payload) ||
    !hasExactKeys(payload, PAYLOAD_KEYS) ||
    payload.schema_version !== SCHEMA_VERSION ||
    payload.phase !== "development" ||
    !Array.isArray(payload.rows)
  ) {
    throw new Error(`Leaderboard must use ${SCHEMA_VERSION}.`);
  }
  if (typeof payload.basis !== "string" || !VALID_BASES.has(payload.basis)) {
    throw new Error("Leaderboard basis must be official or deterministic.");
  }

  let previousRow = null;
  let previousRank = 0;

  const rows = payload.rows.map((raw, index) => {
    if (!isObject(raw) || !hasExactKeys(raw, ROW_KEYS)) {
      throw new Error(`Leaderboard row ${index} has the wrong fields.`);
    }

    const teamName = parseTeamDisplayName(raw.team_name, index);
    for (const key of ["acc", "ser", "eer", "cer"]) {
      if (typeof raw[key] !== "string" || !SCORE_PATTERN.test(raw[key])) {
        throw new Error(`Leaderboard row ${index} has an invalid ${key}.`);
      }
    }
    if (!Number.isInteger(raw.rank) || raw.rank < 1) {
      throw new Error(`Leaderboard row ${index} has an invalid rank.`);
    }

    const expectedRank =
      previousRow && compareRows(previousRow, raw) === 0 ? previousRank : index + 1;
    if (raw.rank !== expectedRank || (previousRow && compareRows(previousRow, raw) > 0)) {
      throw new Error(`Leaderboard row ${index} has invalid rank or order.`);
    }

    previousRow = raw;
    previousRank = raw.rank;

    return {
      rank: raw.rank,
      teamName,
      acc: raw.acc,
      ser: raw.ser,
      eer: raw.eer,
      cer: raw.cer,
      acceptedAt: parseAcceptedAt(raw.accepted_at, index),
    };
  });

  return { schemaVersion: SCHEMA_VERSION, phase: "development", basis: payload.basis, rows };
}

async function readBoundedResponseBody(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    for (;;) {
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

export async function fetchDevelopmentLeaderboard(
  dataUrl,
  { fetchImpl = globalThis.fetch, signal, timeoutMs = 15_000 } = {},
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
    if (!response.ok) throw new Error(`Leaderboard request returned ${response.status}.`);
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

export { SCHEMA_VERSION as TASK3_LEADERBOARD_SCHEMA_VERSION };
