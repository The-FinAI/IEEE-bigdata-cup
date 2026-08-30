import assert from "node:assert/strict";
import test from "node:test";
import {
  createSubmissionEnvelope,
  decryptSubmissionEnvelope,
  sha256Hex,
} from "../lib/task1-envelope.mjs";

async function keyMaterial() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return {
    publicKeyB64: Buffer.from(publicRaw).toString("base64"),
    privateKeyB64: Buffer.from(privatePkcs8).toString("base64"),
    fingerprint: await sha256Hex(publicRaw),
  };
}

test("round-trips a Task 1 encrypted submission envelope", async () => {
  const keys = await keyMaterial();
  const archive = new TextEncoder().encode("synthetic zip bytes");
  const envelope = await createSubmissionEnvelope({
    archiveBytes: archive,
    githubLogin: "ZhuohanX",
    evaluationVersion: "task1-github-pilot-v1",
    recipientPublicKeyB64: keys.publicKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    maxPlaintextBytes: 1024,
    now: new Date("2026-08-30T12:00:00Z"),
    clientSubmissionId: "11111111-1111-4111-8111-111111111111",
  });
  const decrypted = await decryptSubmissionEnvelope({
    envelope,
    recipientPrivateKeyPkcs8B64: keys.privateKeyB64,
    expectedKeyFingerprintSha256: keys.fingerprint,
    expectedEvaluationVersion: "task1-github-pilot-v1",
    maxPlaintextBytes: 1024,
  });
  assert.deepEqual(decrypted.archiveBytes, archive);
  assert.equal(decrypted.metadata.github_login, "ZhuohanX");
  assert.equal(decrypted.metadata.plaintext_sha256, await sha256Hex(archive));
  const publicAad = JSON.parse(Buffer.from(envelope.aad_b64, "base64").toString("utf8"));
  assert.equal("plaintext_sha256" in publicAad, false);
  assert.equal("plaintext_bytes" in publicAad, false);
  assert.equal("client_submission_id" in publicAad, false);
});

test("rejects tampering, wrong identity syntax, and oversized input", async () => {
  const keys = await keyMaterial();
  await assert.rejects(
    createSubmissionEnvelope({
      archiveBytes: new Uint8Array([1]),
      githubLogin: "not a login!",
      evaluationVersion: "task1-github-pilot-v1",
      recipientPublicKeyB64: keys.publicKeyB64,
      keyFingerprintSha256: keys.fingerprint,
      maxPlaintextBytes: 8,
    }),
    /exact GitHub login/,
  );
  await assert.rejects(
    createSubmissionEnvelope({
      archiveBytes: new Uint8Array(9),
      githubLogin: "ZhuohanX",
      evaluationVersion: "task1-github-pilot-v1",
      recipientPublicKeyB64: keys.publicKeyB64,
      keyFingerprintSha256: keys.fingerprint,
      maxPlaintextBytes: 8,
    }),
    /between 1 byte and 8 bytes/,
  );

  const envelope = await createSubmissionEnvelope({
    archiveBytes: new Uint8Array([1, 2, 3]),
    githubLogin: "ZhuohanX",
    evaluationVersion: "task1-github-pilot-v1",
    recipientPublicKeyB64: keys.publicKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    maxPlaintextBytes: 8,
  });
  const ciphertext = Buffer.from(envelope.ciphertext_b64, "base64");
  ciphertext[0] ^= 1;
  envelope.ciphertext_b64 = ciphertext.toString("base64");
  await assert.rejects(
    decryptSubmissionEnvelope({
      envelope,
      recipientPrivateKeyPkcs8B64: keys.privateKeyB64,
      expectedKeyFingerprintSha256: keys.fingerprint,
      expectedEvaluationVersion: "task1-github-pilot-v1",
      maxPlaintextBytes: 8,
    }),
  );
});
