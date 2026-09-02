import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import config from "../config/task1-evaluator.json" with { type: "json" };
import { openDevelopmentReference, sealDevelopmentReference } from "../lib/task1-dev-reference.mjs";

async function keyMaterial() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const publicRaw = Buffer.from(await crypto.subtle.exportKey("raw", pair.publicKey));
  const privatePkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return {
    publicKeyB64: publicRaw.toString("base64"),
    privateKeyB64: privatePkcs8.toString("base64"),
    fingerprint: createHash("sha256").update(publicRaw).digest("hex"),
  };
}

test("development reference uses a separate domain and keeps private commitments encrypted", async () => {
  const keys = await keyMaterial();
  const gold = Buffer.from('private-gold-case-id\n');
  const manifest = Buffer.from('private-manifest-answer\n');
  const envelope = await sealDevelopmentReference({
    goldBytes: gold,
    manifestBytes: manifest,
    recipientPublicKeyB64: keys.publicKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    commitments: config,
    createdAt: "2026-09-02T00:00:00Z",
  });
  const serialized = JSON.stringify(envelope);
  assert.doesNotMatch(serialized, /private-gold-case-id|private-manifest-answer/);
  const aad = JSON.parse(Buffer.from(envelope.aad_b64, "base64").toString("utf8"));
  assert.equal("gold_sha256" in aad, false);
  assert.equal("manifest_sha256" in aad, false);
  const opened = await openDevelopmentReference({
    envelope,
    recipientPrivateKeyPkcs8B64: keys.privateKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    commitments: config,
  });
  assert.deepEqual(Buffer.from(opened.goldBytes), gold);
  assert.deepEqual(Buffer.from(opened.manifestBytes), manifest);
  assert.match(opened.metadata.gold_sha256, /^[0-9a-f]{64}$/);

  const tampered = { ...envelope };
  const bytes = Buffer.from(tampered.ciphertext_b64, "base64");
  bytes[0] ^= 1;
  tampered.ciphertext_b64 = bytes.toString("base64");
  await assert.rejects(openDevelopmentReference({
    envelope: tampered,
    recipientPrivateKeyPkcs8B64: keys.privateKeyB64,
    keyFingerprintSha256: keys.fingerprint,
    commitments: config,
  }));
});
