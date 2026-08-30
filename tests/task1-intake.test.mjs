import assert from "node:assert/strict";
import test from "node:test";
import {
  downloadBounded,
  parseSubmissionAttachment,
  runIntake,
  validateIssueEvent,
} from "../scripts/task1/intake.mjs";

function eventFixture(overrides = {}) {
  return {
    action: "opened",
    repository: {
      id: 1313988496,
      full_name: "The-FinAI/IEEE-bigdata-cup",
    },
    issue: {
      number: 17,
      node_id: "I_pilot17",
      created_at: "2026-08-30T12:00:00Z",
      user: { id: 34633896, login: "ZhuohanX" },
      labels: [{ name: "task1-pilot-submission" }],
      body: "### GitHub login\n\nZhuohanX\n\n### Encrypted submission file\n\n[pilot.json](https://github.com/user-attachments/files/1234/pilot.json)\n\n### Pilot acknowledgement\n\n- [x] accepted",
      ...overrides,
    },
  };
}

test("parses exactly one GitHub-owned JSON attachment", () => {
  assert.deepEqual(
    parseSubmissionAttachment(eventFixture().issue.body),
    {
      fileName: "pilot.json",
      url: "https://github.com/user-attachments/files/1234/pilot.json",
    },
  );
  assert.throws(
    () => parseSubmissionAttachment("### Encrypted submission file\n\n[a.json](https://attacker.example/a.json)"),
    /ATTACHMENT_URL_INVALID/,
  );
  assert.throws(
    () => parseSubmissionAttachment(
      "### Encrypted submission file\n\n[a.json](https://github.com/user-attachments/files/1/a.json) [b.json](https://github.com/user-attachments/files/1/b.json)",
    ),
    /ATTACHMENT_COUNT_INVALID/,
  );
});

test("binds intake to repository, form label, actor, and server issue identity", async () => {
  const result = await runIntake({
    event: eventFixture(),
    download: async () => Buffer.from('{"schema_version":"test"}'),
  });
  assert.equal(result.intake.repository_id, 1313988496);
  assert.equal(result.intake.issue_number, 17);
  assert.equal(result.intake.github_login, "ZhuohanX");
  assert.match(result.intake.envelope_sha256, /^[0-9a-f]{64}$/);

  assert.throws(
    () => validateIssueEvent(eventFixture({ user: { id: 7, login: "OtherUser" } })),
    /ACTOR_NOT_ALLOWED/,
  );
  assert.throws(
    () => validateIssueEvent(eventFixture({ labels: [] })),
    /FORM_LABEL_MISSING/,
  );
});

test("rejects off-domain redirects and declared oversized attachments", async () => {
  await assert.rejects(
    downloadBounded(
      "https://github.com/user-attachments/files/1234/pilot.json",
      async () => new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example/pilot.json" },
      }),
    ),
    /ATTACHMENT_REDIRECT_INVALID/,
  );
  await assert.rejects(
    downloadBounded(
      "https://github.com/user-attachments/files/1234/pilot.json",
      async () => new Response("{}", {
        status: 200,
        headers: { "content-length": "999999999" },
      }),
    ),
    /ATTACHMENT_TOO_LARGE/,
  );
});
