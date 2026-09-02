const ENVELOPE_SCHEMA = "finreason.task1.dev-reference-envelope/1.0.0";
const AAD_SCHEMA = "finreason.task1.dev-reference-aad/1.0.0";
const PRIVATE_METADATA_SCHEMA = "finreason.task1.dev-reference-private/1.0.0";
const ALGORITHM = "X25519-HKDF-SHA256-AES-256-GCM";
const HKDF_INFO = new TextEncoder().encode("finreason-task1-dev-reference-v1");
const MAX_REFERENCE_BYTES = 2 * 1024 * 1024;

const envelopeFields = [
  "schema_version",
  "algorithm",
  "key_fingerprint_sha256",
  "ephemeral_public_key_b64",
  "salt_b64",
  "nonce_b64",
  "aad_b64",
  "ciphertext_b64",
];

const aadFields = [
  "schema_version",
  "competition",
  "task",
  "phase",
  "evaluation_version",
  "dataset_version",
  "release_version",
  "release_manifest_sha256",
  "questions_sha256",
  "expected_ids_sha256",
];

const privateMetadataFields = [
  "schema_version",
  "gold_sha256",
  "manifest_sha256",
  "created_at",
];

function exactFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unexpected or missing fields`);
  }
}

function decodeBase64(value, label) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`${label} must be canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error(`${label} must be canonical base64`);
  return new Uint8Array(bytes);
}

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

async function sha256(bytes) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

async function deriveAesKey(privateKey, publicKey, salt, usages) {
  const shared = await globalThis.crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );
  const sharedKey = await globalThis.crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return globalThis.crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: HKDF_INFO },
    sharedKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function packReference(goldBytes, manifestBytes, metadata) {
  if (!goldBytes.byteLength || !manifestBytes.byteLength || goldBytes.byteLength + manifestBytes.byteLength > MAX_REFERENCE_BYTES) {
    throw new Error("Development reference size is invalid");
  }
  exactFields(metadata, privateMetadataFields, "development reference private metadata");
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  if (!metadataBytes.byteLength || metadataBytes.byteLength > 1024) {
    throw new Error("Development reference private metadata size is invalid");
  }
  const packed = new Uint8Array(8 + metadataBytes.byteLength + goldBytes.byteLength + manifestBytes.byteLength);
  const view = new DataView(packed.buffer);
  view.setUint32(0, metadataBytes.byteLength, false);
  view.setUint32(4, goldBytes.byteLength, false);
  packed.set(metadataBytes, 8);
  packed.set(goldBytes, 8 + metadataBytes.byteLength);
  packed.set(manifestBytes, 8 + metadataBytes.byteLength + goldBytes.byteLength);
  return packed;
}

export async function sealDevelopmentReference({
  goldBytes,
  manifestBytes,
  recipientPublicKeyB64,
  keyFingerprintSha256,
  commitments,
  createdAt = "2026-09-02T00:00:00Z",
}) {
  const gold = goldBytes instanceof Uint8Array ? goldBytes : new Uint8Array(goldBytes);
  const manifest = manifestBytes instanceof Uint8Array ? manifestBytes : new Uint8Array(manifestBytes);
  const recipientRaw = decodeBase64(recipientPublicKeyB64, "recipient public key");
  if (recipientRaw.byteLength !== 32 || hex(await sha256(recipientRaw)) !== keyFingerprintSha256) {
    throw new Error("Development reference recipient key mismatch");
  }
  const observedGold = hex(await sha256(gold));
  const observedManifest = hex(await sha256(manifest));
  const aad = {
    schema_version: AAD_SCHEMA,
    competition: "finreason-cup-2026",
    task: "task1",
    phase: "development",
    evaluation_version: commitments.evaluation_version,
    dataset_version: commitments.dataset_version,
    release_version: commitments.release_version,
    release_manifest_sha256: commitments.release_manifest_sha256,
    questions_sha256: commitments.questions_sha256,
    expected_ids_sha256: commitments.expected_ids_sha256,
  };
  const privateMetadata = {
    schema_version: PRIVATE_METADATA_SCHEMA,
    gold_sha256: observedGold,
    manifest_sha256: observedManifest,
    created_at: createdAt,
  };
  exactFields(aad, aadFields, "development reference AAD");
  const aadBytes = new TextEncoder().encode(JSON.stringify(aad));
  const recipientPublicKey = await globalThis.crypto.subtle.importKey("raw", recipientRaw, { name: "X25519" }, false, []);
  const ephemeral = await globalThis.crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const ephemeralRaw = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(ephemeral.privateKey, recipientPublicKey, salt, ["encrypt"]);
  const ciphertext = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aadBytes, tagLength: 128 },
    aesKey,
    packReference(gold, manifest, privateMetadata),
  ));
  return {
    schema_version: ENVELOPE_SCHEMA,
    algorithm: ALGORITHM,
    key_fingerprint_sha256: keyFingerprintSha256,
    ephemeral_public_key_b64: Buffer.from(ephemeralRaw).toString("base64"),
    salt_b64: Buffer.from(salt).toString("base64"),
    nonce_b64: Buffer.from(nonce).toString("base64"),
    aad_b64: Buffer.from(aadBytes).toString("base64"),
    ciphertext_b64: Buffer.from(ciphertext).toString("base64"),
  };
}

export async function openDevelopmentReference({
  envelope,
  recipientPrivateKeyPkcs8B64,
  keyFingerprintSha256,
  commitments,
}) {
  exactFields(envelope, envelopeFields, "development reference envelope");
  if (envelope.schema_version !== ENVELOPE_SCHEMA || envelope.algorithm !== ALGORITHM || envelope.key_fingerprint_sha256 !== keyFingerprintSha256) {
    throw new Error("Development reference envelope identity mismatch");
  }
  const ephemeralRaw = decodeBase64(envelope.ephemeral_public_key_b64, "ephemeral public key");
  const salt = decodeBase64(envelope.salt_b64, "salt");
  const nonce = decodeBase64(envelope.nonce_b64, "nonce");
  const aadBytes = decodeBase64(envelope.aad_b64, "AAD");
  const ciphertext = decodeBase64(envelope.ciphertext_b64, "ciphertext");
  if (ephemeralRaw.byteLength !== 32 || salt.byteLength !== 32 || nonce.byteLength !== 12 || ciphertext.byteLength > MAX_REFERENCE_BYTES + 1048) {
    throw new Error("Development reference cryptographic field length is invalid");
  }
  const aad = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(aadBytes));
  exactFields(aad, aadFields, "development reference AAD");
  const expectedAad = {
    schema_version: AAD_SCHEMA,
    competition: "finreason-cup-2026",
    task: "task1",
    phase: "development",
    evaluation_version: commitments.evaluation_version,
    dataset_version: commitments.dataset_version,
    release_version: commitments.release_version,
    release_manifest_sha256: commitments.release_manifest_sha256,
    questions_sha256: commitments.questions_sha256,
    expected_ids_sha256: commitments.expected_ids_sha256,
  };
  if (JSON.stringify(aad) !== JSON.stringify(expectedAad)) throw new Error("Development reference AAD mismatch");
  const privateRaw = decodeBase64(recipientPrivateKeyPkcs8B64, "recipient private key");
  const privateKey = await globalThis.crypto.subtle.importKey("pkcs8", privateRaw, { name: "X25519" }, false, ["deriveBits"]);
  const publicKey = await globalThis.crypto.subtle.importKey("raw", ephemeralRaw, { name: "X25519" }, false, []);
  const aesKey = await deriveAesKey(privateKey, publicKey, salt, ["decrypt"]);
  const packed = new Uint8Array(await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aadBytes, tagLength: 128 },
    aesKey,
    ciphertext,
  ));
  if (packed.byteLength < 12 || packed.byteLength > MAX_REFERENCE_BYTES + 1032) throw new Error("Development reference plaintext size is invalid");
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
  const metadataLength = view.getUint32(0, false);
  const goldLength = view.getUint32(4, false);
  if (metadataLength < 1 || metadataLength > 1024 || goldLength < 1 || 8 + metadataLength + goldLength >= packed.byteLength) {
    throw new Error("Development reference container is invalid");
  }
  const metadata = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(packed.subarray(8, 8 + metadataLength)));
  exactFields(metadata, privateMetadataFields, "development reference private metadata");
  if (
    metadata.schema_version !== PRIVATE_METADATA_SCHEMA ||
    typeof metadata.created_at !== "string" ||
    !Number.isFinite(Date.parse(metadata.created_at)) ||
    !/^[0-9a-f]{64}$/.test(metadata.gold_sha256) ||
    !/^[0-9a-f]{64}$/.test(metadata.manifest_sha256)
  ) {
    throw new Error("Development reference private metadata is invalid");
  }
  const gold = packed.subarray(8 + metadataLength, 8 + metadataLength + goldLength);
  const manifest = packed.subarray(8 + metadataLength + goldLength);
  if (hex(await sha256(gold)) !== metadata.gold_sha256 || hex(await sha256(manifest)) !== metadata.manifest_sha256) {
    throw new Error("Development reference plaintext commitment mismatch");
  }
  return { goldBytes: gold, manifestBytes: manifest, aad, metadata };
}

export const task1DevelopmentReferenceConstants = Object.freeze({
  envelopeSchema: ENVELOPE_SCHEMA,
  aadSchema: AAD_SCHEMA,
  privateMetadataSchema: PRIVATE_METADATA_SCHEMA,
  algorithm: ALGORITHM,
});
