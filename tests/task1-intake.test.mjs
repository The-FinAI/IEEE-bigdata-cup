import assert from "node:assert/strict";
import test from "node:test";
import { downloadBounded, parseSubmissionAttachment, runIntake, validateIssueEvent } from "../scripts/task1/intake.mjs";

function eventFixture(overrides = {}) {
  return {
    action: "opened",
    repository: { id: 1313988496, full_name: "The-FinAI/IEEE-bigdata-cup" },
    issue: {
      number: 17,
      node_id: "I_development17",
      created_at: "2026-11-16T11:59:59Z",
      user: { id: 987654321, login: "AnyTeamActor" },
      labels: [{ name: "task1-development-submission" }],
      body: "### Encrypted submission file\n\n[finreason-task1-dev-id.json](https://github.com/user-attachments/files/1234/finreason-task1-dev-id.json)\n\n### Submission acknowledgement\n\n- [x] accepted",
      ...overrides,
    },
  };
}

test("accepts any authenticated GitHub actor and binds immutable server event identity", async () => {
  const result = await runIntake({
    event: eventFixture(),
    eventBytes: Buffer.from("exact-event"),
    download: async () => Buffer.from('{"schema_version":"test"}'),
  });
  assert.equal(result.intake.repository_id, 1313988496);
  assert.equal(result.intake.actor_id, 987654321);
  assert.equal(result.intake.github_login, "AnyTeamActor");
  assert.equal(result.intake.issue_created_at, "2026-11-16T11:59:59Z");
  assert.match(result.intake.envelope_sha256, /^[0-9a-f]{64}$/);
  assert.match(result.intake.event_sha256, /^[0-9a-f]{64}$/);
  assert.equal(validateIssueEvent(eventFixture({ user: { id: 42, login: "AnotherActor" } })).actor_id, 42);
  assert.throws(() => validateIssueEvent(eventFixture({ labels: [] })), /FORM_LABEL_MISSING/);
  assert.throws(() => validateIssueEvent({ ...eventFixture(), repository: { id: 1, full_name: "attacker/repo" } }), /REPOSITORY_MISMATCH/);
});

test("parses exactly one GitHub-owned JSON attachment", () => {
  assert.deepEqual(parseSubmissionAttachment(eventFixture().issue.body), {
    fileName: "finreason-task1-dev-id.json",
    url: "https://github.com/user-attachments/files/1234/finreason-task1-dev-id.json",
  });
  assert.throws(() => parseSubmissionAttachment(
    "### Encrypted submission file\n\n[a.json](https://attacker.example/a.json)",
  ), /ATTACHMENT_URL_INVALID/);
  assert.throws(() => parseSubmissionAttachment(
    "### Encrypted submission file\n\n[a.json](https://github.com/user-attachments/files/1/a.json) [b.json](https://github.com/user-attachments/files/1/b.json)",
  ), /ATTACHMENT_COUNT_INVALID/);
});

test("rejects off-domain redirects and oversized attachments", async () => {
  await assert.rejects(downloadBounded(
    "https://github.com/user-attachments/files/1234/file.json",
    async () => new Response(null, { status: 302, headers: { location: "https://attacker.example/file.json" } }),
  ), /ATTACHMENT_REDIRECT_INVALID/);
  await assert.rejects(downloadBounded(
    "https://github.com/user-attachments/files/1234/file.json",
    async () => new Response("{}", { status: 200, headers: { "content-length": "999999999" } }),
  ), /ATTACHMENT_TOO_LARGE/);
});
