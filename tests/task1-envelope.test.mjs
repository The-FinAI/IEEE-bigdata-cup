import assert from "node:assert/strict";
import test from "node:test";
import config from "../config/task1-evaluator.json" with { type: "json" };
import { createSubmissionEnvelope, decryptSubmissionEnvelope, sha256Hex } from "../lib/task1-envelope.mjs";

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

function encryptionOptions(keys, overrides = {}) {
  return {
    githubLogin: "Any-Authenticated-Actor",
    evaluationVersion: config.evaluation_version,
    phase: config.phase,
    repository: config.repository,
    repositoryId: config.repository_id,
    releaseManifestSha256: config.release_manifest_sha256,
    questionsSha256: config.questions_sha256,
    expectedIdsSha256: config.expected_ids_sha256,
    recipientPublicKeyB64: keys.publicKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    maxPlaintextBytes: 1024,
    now: new Date("2026-11-16T11:59:59Z"),
    clientSubmissionId: "11111111-1111-4111-8111-111111111111",
    ...overrides,
  };
}

function decryptionOptions(keys, envelope, overrides = {}) {
  return {
    envelope,
    recipientPrivateKeyPkcs8B64: keys.privateKeyB64,
    expectedKeyFingerprintSha256: keys.fingerprint,
    expectedEvaluationVersion: config.evaluation_version,
    expectedPhase: config.phase,
    expectedRepository: config.repository,
    expectedRepositoryId: config.repository_id,
    expectedReleaseManifestSha256: config.release_manifest_sha256,
    expectedQuestionsSha256: config.questions_sha256,
    expectedIdsSha256: config.expected_ids_sha256,
    maxPlaintextBytes: 1024,
    ...overrides,
  };
}

test("round-trips an envelope bound to actor login, repository, phase, and frozen release", async () => {
  const keys = await keyMaterial();
  const archive = new TextEncoder().encode("zip bytes");
  const envelope = await createSubmissionEnvelope({ archiveBytes: archive, ...encryptionOptions(keys) });
  const decrypted = await decryptSubmissionEnvelope(decryptionOptions(keys, envelope));
  assert.deepEqual(decrypted.archiveBytes, archive);
  assert.equal(decrypted.metadata.github_login, "Any-Authenticated-Actor");
  assert.equal(decrypted.metadata.plaintext_sha256, await sha256Hex(archive));
  const publicAad = JSON.parse(Buffer.from(envelope.aad_b64, "base64").toString("utf8"));
  assert.equal(publicAad.repository_id, config.repository_id);
  assert.equal(publicAad.phase, "development");
  assert.equal("plaintext_sha256" in publicAad, false);
  assert.equal("client_submission_id" in publicAad, false);
});

test("fails closed on tampering, wrong release binding, login syntax, and size", async () => {
  const keys = await keyMaterial();
  await assert.rejects(createSubmissionEnvelope({
    archiveBytes: new Uint8Array([1]),
    ...encryptionOptions(keys, { githubLogin: "not a login!" }),
  }), /exact GitHub login/);
  await assert.rejects(createSubmissionEnvelope({
    archiveBytes: new Uint8Array(1025),
    ...encryptionOptions(keys),
  }), /between 1 byte and 1024 bytes/);

  const envelope = await createSubmissionEnvelope({
    archiveBytes: new Uint8Array([1, 2, 3]),
    ...encryptionOptions(keys),
  });
  await assert.rejects(decryptSubmissionEnvelope(decryptionOptions(keys, envelope, {
    expectedPhase: "test",
  })), /does not match/);
  const tampered = { ...envelope };
  const ciphertext = Buffer.from(tampered.ciphertext_b64, "base64");
  ciphertext[0] ^= 1;
  tampered.ciphertext_b64 = ciphertext.toString("base64");
  await assert.rejects(decryptSubmissionEnvelope(decryptionOptions(keys, tampered)));
});
