const crypto = require("crypto");
const fs = require("fs");

const MAGIC = Buffer.from("AFLOW1");

const masterKey = () => {
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
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const hashFile = (filePath) => sha256(fs.readFileSync(filePath));

/* =====================================================
   Buffer Encryption
===================================================== */

const encryptBuffer = (input) => {
  const plaintext = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input);

  const plaintextHash = sha256(plaintext);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    masterKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  const encryptedBuffer = Buffer.concat([
    MAGIC,
    iv,
    tag,
    ciphertext,
  ]);

  return {
    encryptedBuffer,
    plaintextHash,
    encryptedHash: sha256(encryptedBuffer),
    iv: iv.toString("hex"),
  };
};

/* =====================================================
   Buffer Decryption
===================================================== */

const decryptBuffer = (input) => {
  const payload = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input);

  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    return payload;
  }

  const iv = payload.subarray(
    MAGIC.length,
    MAGIC.length + 12
  );

  const tag = payload.subarray(
    MAGIC.length + 12,
    MAGIC.length + 28
  );

  const ciphertext = payload.subarray(
    MAGIC.length + 28
  );

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    iv
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
};

/* =====================================================
   Existing File Encryption
===================================================== */

const encryptFile = (filePath) => {
  const plaintext = fs.readFileSync(filePath);

  const encrypted = encryptBuffer(plaintext);

  const encryptedPath = `${filePath}.afenc`;

  fs.writeFileSync(
    encryptedPath,
    encrypted.encryptedBuffer,
    { mode: 0o600 }
  );

  fs.unlinkSync(filePath);

  return {
    encryptedPath,
    plaintextHash: encrypted.plaintextHash,
    encryptedHash: encrypted.encryptedHash,
    iv: encrypted.iv,
  };
};

/* =====================================================
   Existing File Decryption
===================================================== */

const decryptFile = (filePath) => {
  const payload = fs.readFileSync(filePath);
  return decryptBuffer(payload);
};

/* =====================================================
   S3 / Buffer Integrity Verification
===================================================== */

const verifyDocumentIntegrityBuffer = (
  document,
  encryptedBuffer
) => {
  if (
    !encryptedBuffer ||
    !Buffer.isBuffer(encryptedBuffer) ||
    encryptedBuffer.length === 0
  ) {
    return {
      valid: false,
      status: "missing",
      reason: "Stored file is unavailable",
    };
  }

  const currentEncryptedHash = sha256(encryptedBuffer);

  if (
    document.security?.encryptedHash &&
    currentEncryptedHash !== document.security.encryptedHash
  ) {
    return {
      valid: false,
      status: "tampered",
      reason: "Encrypted file fingerprint mismatch",
    };
  }

  try {
    const plaintext = decryptBuffer(encryptedBuffer);
    const currentPlaintextHash = sha256(plaintext);

    if (
      document.security?.plaintextHash &&
      currentPlaintextHash !== document.security.plaintextHash
    ) {
      return {
        valid: false,
        status: "tampered",
        reason: "Decrypted document fingerprint mismatch",
      };
    }

    return {
      valid: true,
      status: "verified",
      reason: "Cryptographic fingerprints match",
      currentEncryptedHash,
      currentPlaintextHash,
    };
  } catch {
    return {
      valid: false,
      status: "tampered",
      reason: "Authenticated decryption failed",
    };
  }
};

/* =====================================================
   Legacy Local File Integrity Verification
===================================================== */

const verifyDocumentIntegrity = (document) => {
  if (
    !document.filepath ||
    !fs.existsSync(document.filepath)
  ) {
    return {
      valid: false,
      status: "missing",
      reason: "Stored file is unavailable",
    };
  }

  const encryptedBuffer = fs.readFileSync(
    document.filepath
  );

  return verifyDocumentIntegrityBuffer(
    document,
    encryptedBuffer
  );
};

/* =====================================================
   Prompt Injection Detection
===================================================== */

const detectPromptInjection = (text = "") => {
  const rules = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
    /bypass\s+(security|authorization|access)/i,
    /do\s+not\s+follow\s+(the\s+)?(system|previous)/i,
    /(send|upload|exfiltrate).{0,40}(secret|password|token|document)/i,
  ];

  const matches = rules
    .filter((rule) => rule.test(text))
    .map((rule) => rule.source);

  return {
    detected: matches.length > 0,
    matchCount: matches.length,
    rules: matches,
  };
};

/* =====================================================
   Trust Score
===================================================== */

const calculateTrustScore = ({
  integrityStatus = "pending",
  encrypted = false,
  ownerBound = true,
  injectionDetected = false,
  sensitiveRisk = "safe",
}) => {
  const dimensions = {
    integrity:
      integrityStatus === "verified"
        ? 35
        : integrityStatus === "pending"
        ? 15
        : 0,

    confidentiality:
      (encrypted ? 15 : 0) +
      (ownerBound ? 10 : 0),

    authentication: 20,

    contentSafety:
      (injectionDetected ? 0 : 12) +
      (["safe", "low"].includes(sensitiveRisk)
        ? 8
        : 3),
  };

  const score = Object.values(dimensions).reduce(
    (sum, value) => sum + value,
    0
  );

  const grade =
    score >= 85 &&
    encrypted &&
    integrityStatus === "verified"
      ? "trusted"
      : score >= 65
      ? "review"
      : "restricted";

  return {
    score,
    grade,
    dimensions,
  };
};

module.exports = {
  encryptFile,
  encryptBuffer,
  decryptFile,
  decryptBuffer,
  verifyDocumentIntegrity,
  verifyDocumentIntegrityBuffer,
  detectPromptInjection,
  calculateTrustScore,
  sha256,
  hashFile,
};