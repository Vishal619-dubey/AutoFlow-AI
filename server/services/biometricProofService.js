const jwt = require("jsonwebtoken");

const BIOMETRIC_PROOF_TTL_SECONDS = 180;

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}

function createBiometricProof({
  userId,
  documentId,
  faceVersion = 1,
}) {
  if (!userId || !documentId) {
    throw new Error(
      "User ID and document ID are required for BioTrust proof"
    );
  }

  const token = jwt.sign(
    {
      purpose: "biotrust-step-up",
      action: "download",
      documentId: String(documentId),
      faceVersion: Number(faceVersion || 1),
    },
    getSecret(),
    {
      algorithm: "HS256",
      subject: String(userId),
      issuer: "autoflow-ai",
      audience: "autoflow-biotrust",
      expiresIn: BIOMETRIC_PROOF_TTL_SECONDS,
    }
  );

  return {
    token,
    expiresIn: BIOMETRIC_PROOF_TTL_SECONDS,
  };
}

function verifyBiometricProof({
  token,
  userId,
  documentId,
  faceVersion = 1,
}) {
  if (!token) {
    return {
      valid: false,
      reason: "missing",
    };
  }

  try {
    const payload = jwt.verify(
      token,
      getSecret(),
      {
        algorithms: ["HS256"],
        issuer: "autoflow-ai",
        audience: "autoflow-biotrust",
      }
    );

    if (
      payload.purpose !== "biotrust-step-up" ||
      payload.action !== "download"
    ) {
      return {
        valid: false,
        reason: "invalid_scope",
      };
    }

    if (payload.sub !== String(userId)) {
      return {
        valid: false,
        reason: "wrong_user",
      };
    }

    if (
      payload.documentId !==
      String(documentId)
    ) {
      return {
        valid: false,
        reason: "wrong_document",
      };
    }

    if (
      Number(payload.faceVersion) !==
      Number(faceVersion || 1)
    ) {
      return {
        valid: false,
        reason: "stale_face_enrollment",
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      reason:
        error.name === "TokenExpiredError"
          ? "expired"
          : "invalid",
    };
  }
}

module.exports = {
  createBiometricProof,
  verifyBiometricProof,
  BIOMETRIC_PROOF_TTL_SECONDS,
};