const ENVELOPE_SCHEMA = "finreason.task1.github-envelope/1.0.0";
const AAD_SCHEMA = "finreason.task1.github-envelope-aad/1.0.0";
const PRIVATE_METADATA_SCHEMA = "finreason.task1.github-envelope-private/1.0.0";
const ALGORITHM = "X25519-HKDF-SHA256-AES-256-GCM";
const HKDF_INFO = new TextEncoder().encode("finreason-task1-github-envelope-v1");
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const MAX_PRIVATE_METADATA_BYTES = 4096;

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
  "github_login",
  "created_at",
];

const privateMetadataFields = [
  "schema_version",
  "client_submission_id",
  "file_name",
  "plaintext_bytes",
  "plaintext_sha256",
];

function assertExactFields(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has unexpected or missing fields`);
  }
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value, label) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`${label} must be canonical base64`);
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function normalizeLogin(login) {
  const normalized = String(login ?? "").trim();
  if (!GITHUB_LOGIN.test(normalized)) {
    throw new Error("Enter the exact GitHub login that will create the submission issue");
  }
  return normalized;
}

async function sha256Bytes(bytes) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

export async function sha256Hex(bytes) {
  return bytesToHex(await sha256Bytes(bytes));
}

function packPlaintext(archiveBytes, metadata) {
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  if (metadataBytes.byteLength === 0 || metadataBytes.byteLength > MAX_PRIVATE_METADATA_BYTES) {
    throw new Error("Submission private metadata is too large");
  }
  const packed = new Uint8Array(4 + metadataBytes.byteLength + archiveBytes.byteLength);
  new DataView(packed.buffer).setUint32(0, metadataBytes.byteLength, false);
  packed.set(metadataBytes, 4);
  packed.set(archiveBytes, 4 + metadataBytes.byteLength);
  return packed;
}

async function deriveAesKey({ privateKey, publicKey, salt, usages }) {
  const sharedBits = await globalThis.crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );
  const sharedKey = await globalThis.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: HKDF_INFO },
    sharedKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

export async function createSubmissionEnvelope({
  archiveBytes,
  githubLogin,
  evaluationVersion,
  recipientPublicKeyB64,
  keyFingerprintSha256,
  maxPlaintextBytes,
  now = new Date(),
  clientSubmissionId = globalThis.crypto.randomUUID(),
}) {
  const plaintext = archiveBytes instanceof Uint8Array ? archiveBytes : new Uint8Array(archiveBytes);
  if (plaintext.byteLength === 0 || plaintext.byteLength > maxPlaintextBytes) {
    throw new Error(`Submission ZIP must be between 1 byte and ${maxPlaintextBytes} bytes`);
  }
  const login = normalizeLogin(githubLogin);
  const recipientRaw = base64ToBytes(recipientPublicKeyB64, "recipient public key");
  if (recipientRaw.byteLength !== 32) {
    throw new Error("Recipient public key must be 32 bytes");
  }
  const observedFingerprint = await sha256Hex(recipientRaw);
  if (observedFingerprint !== keyFingerprintSha256) {
    throw new Error("Submission key fingerprint mismatch");
  }

  const recipientPublicKey = await globalThis.crypto.subtle.importKey(
    "raw",
    recipientRaw,
    { name: "X25519" },
    false,
    [],
  );
  const ephemeral = await globalThis.crypto.subtle.generateKey(
    { name: "X25519" },
    true,
    ["deriveBits"],
  );
  const ephemeralPublicRaw = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", ephemeral.publicKey),
  );
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintextSha256 = await sha256Hex(plaintext);
  const aad = {
    schema_version: AAD_SCHEMA,
    competition: "finreason-cup-2026",
    task: "task1",
    phase: "pilot",
    evaluation_version: evaluationVersion,
    github_login: login,
    created_at: now.toISOString(),
  };
  const privateMetadata = {
    schema_version: PRIVATE_METADATA_SCHEMA,
    client_submission_id: clientSubmissionId,
    file_name: "predictions.zip",
    plaintext_bytes: plaintext.byteLength,
    plaintext_sha256: plaintextSha256,
  };
  const aadBytes = new TextEncoder().encode(JSON.stringify(aad));
  const packedPlaintext = packPlaintext(plaintext, privateMetadata);
  const aesKey = await deriveAesKey({
    privateKey: ephemeral.privateKey,
    publicKey: recipientPublicKey,
    salt,
    usages: ["encrypt"],
  });
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: aadBytes, tagLength: 128 },
      aesKey,
      packedPlaintext,
    ),
  );

  return {
    schema_version: ENVELOPE_SCHEMA,
    algorithm: ALGORITHM,
    key_fingerprint_sha256: keyFingerprintSha256,
    ephemeral_public_key_b64: bytesToBase64(ephemeralPublicRaw),
    salt_b64: bytesToBase64(salt),
    nonce_b64: bytesToBase64(nonce),
    aad_b64: bytesToBase64(aadBytes),
    ciphertext_b64: bytesToBase64(ciphertext),
  };
}

export async function decryptSubmissionEnvelope({
  envelope,
  recipientPrivateKeyPkcs8B64,
  expectedKeyFingerprintSha256,
  expectedEvaluationVersion,
  maxPlaintextBytes,
}) {
  assertExactFields(envelope, envelopeFields, "submission envelope");
  if (envelope.schema_version !== ENVELOPE_SCHEMA || envelope.algorithm !== ALGORITHM) {
    throw new Error("Unsupported submission envelope version or algorithm");
  }
  if (envelope.key_fingerprint_sha256 !== expectedKeyFingerprintSha256) {
    throw new Error("Submission was encrypted for a different scoring key");
  }

  const ephemeralRaw = base64ToBytes(envelope.ephemeral_public_key_b64, "ephemeral public key");
  const salt = base64ToBytes(envelope.salt_b64, "salt");
  const nonce = base64ToBytes(envelope.nonce_b64, "nonce");
  const aadBytes = base64ToBytes(envelope.aad_b64, "AAD");
  const ciphertext = base64ToBytes(envelope.ciphertext_b64, "ciphertext");
  if (ephemeralRaw.byteLength !== 32 || salt.byteLength !== 32 || nonce.byteLength !== 12) {
    throw new Error("Submission envelope cryptographic field length is invalid");
  }
  if (
    ciphertext.byteLength < 21 ||
    ciphertext.byteLength > maxPlaintextBytes + MAX_PRIVATE_METADATA_BYTES + 4 + 16
  ) {
    throw new Error("Submission ciphertext size is invalid");
  }

  const aad = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(aadBytes));
  assertExactFields(aad, aadFields, "submission AAD");
  if (
    aad.schema_version !== AAD_SCHEMA ||
    aad.competition !== "finreason-cup-2026" ||
    aad.task !== "task1" ||
    aad.phase !== "pilot" ||
    aad.evaluation_version !== expectedEvaluationVersion
  ) {
    throw new Error("Submission metadata does not match this pilot");
  }
  normalizeLogin(aad.github_login);
  if (typeof aad.created_at !== "string" || !Number.isFinite(Date.parse(aad.created_at))) {
    throw new Error("Submission timestamp is invalid");
  }

  const privatePkcs8 = base64ToBytes(recipientPrivateKeyPkcs8B64, "recipient private key");
  const recipientPrivateKey = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    privatePkcs8,
    { name: "X25519" },
    false,
    ["deriveBits"],
  );
  const ephemeralPublicKey = await globalThis.crypto.subtle.importKey(
    "raw",
    ephemeralRaw,
    { name: "X25519" },
    false,
    [],
  );
  const aesKey = await deriveAesKey({
    privateKey: recipientPrivateKey,
    publicKey: ephemeralPublicKey,
    salt,
    usages: ["decrypt"],
  });
  const packedPlaintext = new Uint8Array(
    await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, additionalData: aadBytes, tagLength: 128 },
      aesKey,
      ciphertext,
    ),
  );
  if (packedPlaintext.byteLength < 5) throw new Error("Submission plaintext container is invalid");
  const metadataLength = new DataView(
    packedPlaintext.buffer,
    packedPlaintext.byteOffset,
    packedPlaintext.byteLength,
  ).getUint32(0, false);
  if (
    metadataLength < 1 ||
    metadataLength > MAX_PRIVATE_METADATA_BYTES ||
    4 + metadataLength >= packedPlaintext.byteLength
  ) {
    throw new Error("Submission plaintext container is invalid");
  }
  const privateMetadata = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(packedPlaintext.subarray(4, 4 + metadataLength)),
  );
  assertExactFields(privateMetadata, privateMetadataFields, "submission private metadata");
  if (
    privateMetadata.schema_version !== PRIVATE_METADATA_SCHEMA ||
    privateMetadata.file_name !== "predictions.zip"
  ) {
    throw new Error("Submission private metadata does not match this pilot");
  }
  if (
    !Number.isInteger(privateMetadata.plaintext_bytes) ||
    privateMetadata.plaintext_bytes < 1 ||
    privateMetadata.plaintext_bytes > maxPlaintextBytes
  ) {
    throw new Error("Submission plaintext size is invalid");
  }
  if (!/^[0-9a-f]{64}$/.test(privateMetadata.plaintext_sha256)) {
    throw new Error("Submission plaintext hash is invalid");
  }
  if (
    typeof privateMetadata.client_submission_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(privateMetadata.client_submission_id)
  ) {
    throw new Error("Submission client ID is invalid");
  }
  const plaintext = packedPlaintext.subarray(4 + metadataLength);
  if (
    plaintext.byteLength !== privateMetadata.plaintext_bytes ||
    (await sha256Hex(plaintext)) !== privateMetadata.plaintext_sha256
  ) {
    throw new Error("Submission plaintext commitment mismatch");
  }
  return { archiveBytes: plaintext, metadata: { ...aad, ...privateMetadata } };
}

export const task1EnvelopeConstants = Object.freeze({
  envelopeSchema: ENVELOPE_SCHEMA,
  aadSchema: AAD_SCHEMA,
  privateMetadataSchema: PRIVATE_METADATA_SCHEMA,
  algorithm: ALGORITHM,
});
