const User = require("../models/User");

const {
  validateFaceImage,
  compareFaces,
} = require("../services/rekognitionService");

const {
  saveFaceReference,
  getFaceReference,
  deleteFaceReference,
} = require("../services/biometricStorageService");

const { createBiometricProof } = require("../services/biometricProofService");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 10 * 60 * 1000;

/* =====================================================
   Enroll Face
===================================================== */

const enrollFace = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Face image is required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /* -----------------------------------------
       Validate enrollment image
    ----------------------------------------- */

    const validation = await validateFaceImage(
      req.file.buffer
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    if (
      validation.sharpness !== undefined &&
      validation.sharpness < 20
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Face image is too blurry. Capture a clearer photo.",
      });
    }

    /* -----------------------------------------
       Encrypt + Store reference in private S3
    ----------------------------------------- */

    const { s3Key, referenceHash } =
      await saveFaceReference({
        userId: user._id.toString(),
        imageBuffer: req.file.buffer,
      });

    const previousVersion = Number(
      user.faceAuth?.version || 0
    );

    user.faceAuth = {
      enabled: true,
      enrolled: true,

      referenceS3Key: s3Key,
      referenceHash,

      enrolledAt: new Date(),
      lastVerifiedAt: null,

      failedAttempts: 0,
      lockedUntil: null,

      verificationCount: 0,

      version: previousVersion + 1,
    };

    user.markModified("faceAuth");
    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "BioTrust face enrollment completed successfully.",

      faceAuth: {
        enabled: true,
        enrolled: true,
        enrolledAt: user.faceAuth.enrolledAt,
        version: user.faceAuth.version,
      },
    });
  } catch (error) {
    console.error(
      "BioTrust Enrollment Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to complete biometric enrollment.",
    });
  }
};

/* =====================================================
   Verify Live Face
===================================================== */

const verifyFace = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Live face image is required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /* -----------------------------------------
       Enrollment required
    ----------------------------------------- */

    if (
      !user.faceAuth?.enabled ||
      !user.faceAuth?.enrolled
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        code: "FACE_NOT_ENROLLED",
        message:
          "Face verification has not been enrolled.",
      });
    }

    /* -----------------------------------------
       Handle biometric lock
    ----------------------------------------- */

    const lockedUntil =
      user.faceAuth?.lockedUntil
        ? new Date(user.faceAuth.lockedUntil)
        : null;

    if (
      lockedUntil &&
      lockedUntil > new Date()
    ) {
      return res.status(423).json({
        success: false,
        verified: false,
        code: "BIOMETRIC_LOCKED",

        message:
          "Biometric verification is temporarily locked due to repeated failed attempts.",

        lockedUntil,
      });
    }

    /*
      Previous lock has expired.
      Clear stale lock before continuing.
    */

    if (
      lockedUntil &&
      lockedUntil <= new Date()
    ) {
      user.faceAuth.lockedUntil = null;
      user.faceAuth.failedAttempts = 0;

      user.markModified("faceAuth");
      await user.save();
    }

    /* -----------------------------------------
       Load encrypted enrolled face from S3
    ----------------------------------------- */

    const enrolledImageBuffer =
      await getFaceReference({
        s3Key:
          user.faceAuth.referenceS3Key,

        referenceHash:
          user.faceAuth.referenceHash,
      });

    /* -----------------------------------------
       Compare enrolled vs live face
    ----------------------------------------- */

    const result = await compareFaces({
      enrolledImageBuffer,
      liveImageBuffer: req.file.buffer,
    });

    /* -----------------------------------------
       Verification Failed
    ----------------------------------------- */

    if (!result.verified) {
      const failedAttempts =
        Number(
          user.faceAuth.failedAttempts || 0
        ) + 1;

      user.faceAuth.failedAttempts =
        failedAttempts;

      let accountLocked = false;

      if (
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        user.faceAuth.lockedUntil =
          new Date(
            Date.now() + LOCK_TIME_MS
          );

        user.faceAuth.failedAttempts = 0;

        accountLocked = true;
      }

      user.markModified("faceAuth");
      await user.save();

      /*
        IMPORTANT:
        403 is intentional.

        401 would make frontend treat the JWT
        as invalid and logout the user.
      */

      return res.status(403).json({
        success: false,
        verified: false,

        code: accountLocked
          ? "BIOMETRIC_LOCKED"
          : "FACE_VERIFICATION_FAILED",

        message: accountLocked
          ? "Too many failed biometric attempts. Verification has been temporarily locked."
          : "Face verification failed.",

        remainingAttempts:
          accountLocked
            ? 0
            : Math.max(
                0,
                MAX_FAILED_ATTEMPTS -
                  failedAttempts
              ),

        lockedUntil:
          accountLocked
            ? user.faceAuth.lockedUntil
            : null,
      });
    }

    /* -----------------------------------------
       Verification Success
    ----------------------------------------- */

    user.faceAuth.failedAttempts = 0;
    user.faceAuth.lockedUntil = null;

    user.faceAuth.lastVerifiedAt =
      new Date();

    user.faceAuth.verificationCount =
      Number(
        user.faceAuth.verificationCount ||
          0
      ) + 1;

    user.markModified("faceAuth");
    await user.save();

    let biometricProof = null;

    const requestedDocumentId =
      String(req.body?.documentId || "").trim();

    if (requestedDocumentId) {
      const proof = createBiometricProof({
        userId: user._id,
        documentId: requestedDocumentId,
        faceVersion:
          Number(user.faceAuth?.version || 1),
      });

      biometricProof = {
        token: proof.token,
        expiresIn: proof.expiresIn,
        documentId: requestedDocumentId,
      };
    }
    return res.status(200).json({
      success: true,
      verified: true,

      message:
        "BioTrust identity verification successful.",

      biometricProof,

      verification: {
        similarity:
          result.similarity,

        threshold:
          result.threshold,

        verifiedAt:
          user.faceAuth.lastVerifiedAt,
      },
    });
  } catch (error) {
    console.error(
      "BioTrust Verification Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      verified: false,

      message:
        "Unable to complete biometric verification.",
    });
  }
};

/* =====================================================
   Get Face Status
===================================================== */

const getFaceStatus = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    ).select("faceAuth");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const currentlyLocked =
      Boolean(
        user.faceAuth?.lockedUntil &&
          new Date(
            user.faceAuth.lockedUntil
          ) > new Date()
      );

    return res.status(200).json({
      success: true,

      faceAuth: {
        enabled: Boolean(
          user.faceAuth?.enabled
        ),

        enrolled: Boolean(
          user.faceAuth?.enrolled
        ),

        enrolledAt:
          user.faceAuth?.enrolledAt ||
          null,

        lastVerifiedAt:
          user.faceAuth?.lastVerifiedAt ||
          null,

        verificationCount:
          Number(
            user.faceAuth
              ?.verificationCount || 0
          ),

        locked: currentlyLocked,

        lockedUntil:
          currentlyLocked
            ? user.faceAuth.lockedUntil
            : null,

        version:
          Number(
            user.faceAuth?.version || 1
          ),
      },
    });
  } catch (error) {
    console.error(
      "BioTrust Status Error:",
      error.message
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to read biometric status.",
    });
  }
};

/* =====================================================
   Remove Face Enrollment
===================================================== */

const removeFace = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existingS3Key =
      user.faceAuth?.referenceS3Key ||
      "";

    /* -----------------------------------------
       Remove encrypted biometric from S3
    ----------------------------------------- */

    if (existingS3Key) {
      await deleteFaceReference(
        existingS3Key
      );
    }

    const previousVersion = Number(
      user.faceAuth?.version || 0
    );

    user.faceAuth = {
      enabled: false,
      enrolled: false,

      referenceS3Key: "",
      referenceHash: "",

      enrolledAt: null,
      lastVerifiedAt: null,

      failedAttempts: 0,
      lockedUntil: null,

      verificationCount: 0,

      version: previousVersion + 1,
    };

    user.markModified("faceAuth");
    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "BioTrust face enrollment removed successfully.",
    });
  } catch (error) {
    console.error(
      "BioTrust Remove Error:",
      error.message
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to remove biometric enrollment.",
    });
  }
};

module.exports = {
  enrollFace,
  verifyFace,
  getFaceStatus,
  removeFace,
};
