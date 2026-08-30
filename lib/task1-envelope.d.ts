export type Task1Envelope = {
  schema_version: string;
  algorithm: string;
  key_fingerprint_sha256: string;
  ephemeral_public_key_b64: string;
  salt_b64: string;
  nonce_b64: string;
  aad_b64: string;
  ciphertext_b64: string;
};

export function createSubmissionEnvelope(options: {
  archiveBytes: Uint8Array | ArrayBuffer;
  githubLogin: string;
  evaluationVersion: string;
  recipientPublicKeyB64: string;
  keyFingerprintSha256: string;
  maxPlaintextBytes: number;
  now?: Date;
  clientSubmissionId?: string;
}): Promise<Task1Envelope>;

export function decryptSubmissionEnvelope(options: {
  envelope: Task1Envelope;
  recipientPrivateKeyPkcs8B64: string;
  expectedKeyFingerprintSha256: string;
  expectedEvaluationVersion: string;
  maxPlaintextBytes: number;
}): Promise<{ archiveBytes: Uint8Array; metadata: Record<string, unknown> }>;

export function sha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string>;

export const task1EnvelopeConstants: Readonly<{
  envelopeSchema: string;
  aadSchema: string;
  privateMetadataSchema: string;
  algorithm: string;
}>;
