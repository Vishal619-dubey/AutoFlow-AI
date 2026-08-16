const crypto = require("crypto");

const {
  uploadDocument,
  getDocumentBuffer,
  deleteDocument,
  documentExists,
} = require("./s3StorageService");

const MAGIC = Buffer.from("AFBIO1");

/* =====================================================
   Biometric Encryption Key
===================================================== */

function getRootKey() {
  const configured = process.env.DOCUMENT_MASTER_KEY || "";

  if (/^[a-f0-9]{64}$/i.test(configured)) {
    return Buffer.from(configured, "hex");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DOCUMENT_MASTER_KEY must be a 64-character hex value in production"
    );
  }

  return crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET || "autoflow-local-development-only")
    .digest();
}

function getBiometricKey() {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      getRootKey(),
      Buffer.from("AutoFlow-BioTrust-Salt-v1"),
      Buffer.from("biometric-face-reference-v1"),
      32
    )
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/* =====================================================
   S3 Key
===================================================== */

function createBiometricKey(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return `biometrics/${userId}/face-reference.afbio`;
}

/* =====================================================
   Encrypt Face Reference
===================================================== */

function encryptBiometricBuffer(input) {
  const plaintext = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input);

  if (!plaintext.length) {
    throw new Error("Face image buffer is empty");
  }

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getBiometricKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const encryptedBuffer = Buffer.concat([
    MAGIC,
    iv,
    authTag,
    ciphertext,
  ]);

  return {
    encryptedBuffer,
    referenceHash: sha256(plaintext),
  };
}

/* =====================================================
   Decrypt Face Reference
===================================================== */

function decryptBiometricBuffer(input) {
  const payload = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input);

  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Invalid AutoFlow biometric payload");
  }

  const iv = payload.subarray(
    MAGIC.length,
    MAGIC.length + 12
  );

  const authTag = payload.subarray(
    MAGIC.length + 12,
    MAGIC.length + 28
  );

  const ciphertext = payload.subarray(
    MAGIC.length + 28
  );

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getBiometricKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
}

/* =====================================================
   Save Face Reference
===================================================== */

async function saveFaceReference({
  userId,
  imageBuffer,
}) {
  const s3Key = createBiometricKey(userId);

  const {
    encryptedBuffer,
    referenceHash,
  } = encryptBiometricBuffer(imageBuffer);

  await uploadDocument({
    key: s3Key,
    buffer: encryptedBuffer,
  });

  return {
    s3Key,
    referenceHash,
  };
}

/* =====================================================
   Get + Verify Face Reference
===================================================== */

async function getFaceReference({
  s3Key,
  referenceHash,
}) {
  if (!s3Key) {
    throw new Error("Face reference is not enrolled");
  }

  const exists = await documentExists(s3Key);

  if (!exists) {
    throw new Error("Encrypted face reference is missing");
  }

  const encryptedBuffer =
    await getDocumentBuffer(s3Key);

  let plaintext;

  try {
    plaintext =
      decryptBiometricBuffer(encryptedBuffer);
  } catch {
    throw new Error(
      "Biometric integrity verification failed"
    );
  }

  const currentHash = sha256(plaintext);

  if (
    referenceHash &&
    currentHash !== referenceHash
  ) {
    throw new Error(
      "Biometric reference fingerprint mismatch"
    );
  }

  return plaintext;
}

/* =====================================================
   Delete Face Reference
===================================================== */

async function deleteFaceReference(s3Key) {
  if (!s3Key) return;

  const exists = await documentExists(s3Key);

  if (exists) {
    await deleteDocument(s3Key);
  }
}

module.exports = {
  createBiometricKey,
  encryptBiometricBuffer,
  decryptBiometricBuffer,
  saveFaceReference,
  getFaceReference,
  deleteFaceReference,
};