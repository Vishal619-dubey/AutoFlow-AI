const fs = require("fs");

const Document = require("../models/Document");
const SecurityEvent = require("../models/SecurityEvent");

const {
  scanSensitiveData,
} = require("../services/sensitiveDataScanner");

const {
  createNotification,
} = require("../services/notificationService");

const {
  verifyDocumentIntegrity,
  verifyDocumentIntegrityBuffer,
  calculateTrustScore,
  encryptBuffer,
  detectPromptInjection,
} = require("../services/documentSecurityService");

const {
  createDocumentKey,
  uploadDocument,
  deleteDocument,
  documentExists,
  getDocumentBuffer,
} = require("../services/s3StorageService");

const {
  recordSecurityEvent,
} = require("../services/securityEventService");

/* =====================================================
   Load document for integrity verification
   Supports S3 + legacy local storage
===================================================== */

async function verifyStoredDocument(document) {
  /* -----------------------------
     AWS S3
  ----------------------------- */

  if (document.storageProvider === "s3") {
    if (!document.s3Key) {
      return {
        valid: false,
        status: "missing",
        reason: "S3 storage key is missing",
      };
    }

    const exists = await documentExists(
      document.s3Key
    );

    if (!exists) {
      return {
        valid: false,
        status: "missing",
        reason:
          "Stored S3 file is unavailable",
      };
    }

    const encryptedBuffer =
      await getDocumentBuffer(
        document.s3Key
      );

    return verifyDocumentIntegrityBuffer(
      document,
      encryptedBuffer
    );
  }

  /* -----------------------------
     Legacy Render/local file
  ----------------------------- */

  return verifyDocumentIntegrity(
    document
  );
}

/* =====================================================
   Security Dashboard
===================================================== */

exports.getSecurityDashboard =
  async (req, res) => {
    try {
      const documents =
        await Document.find({
          uploadedBy:
            req.user._id,

          deleted: false,
        })
          .select(
            "filename fileType classification sensitiveData security storageProvider storageStatus createdAt"
          )
          .sort({
            createdAt: -1,
          });

      const scannedDocuments =
        documents.filter(
          (document) =>
            Boolean(
              document
                .sensitiveData
                ?.scannedAt
            )
        );

      const totalFindings =
        scannedDocuments.reduce(
          (sum, document) =>
            sum +
            (document
              .sensitiveData
              ?.totalFindings ||
              0),
          0
        );

      const riskyDocuments =
        scannedDocuments.filter(
          (document) =>
            document
              .sensitiveData
              ?.riskLevel &&
            document
              .sensitiveData
              ?.riskLevel !==
              "safe"
        ).length;

      const criticalDocuments =
        scannedDocuments.filter(
          (document) =>
            document
              .sensitiveData
              ?.riskLevel ===
            "critical"
        ).length;

      const encryptedDocuments =
        documents.filter(
          (document) =>
            document.security
              ?.encryption ===
            "AES-256-GCM"
        ).length;

      const verifiedDocuments =
        documents.filter(
          (document) =>
            document.security
              ?.integrityStatus ===
            "verified"
        ).length;

      const restrictedDocuments =
        documents.filter(
          (document) =>
            document.security
              ?.trustGrade ===
            "restricted"
        ).length;

      const s3Documents =
        documents.filter(
          (document) =>
            document.storageProvider ===
            "s3"
        ).length;

      const missingDocuments =
        documents.filter(
          (document) =>
            document.storageStatus ===
              "missing" ||
            document.security
              ?.integrityStatus ===
              "missing"
        ).length;

      const recentEvents =
        await SecurityEvent.find({
          user: req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .limit(20)
          .lean();

      return res.json({
        success: true,

        metrics: {
          scanned:
            scannedDocuments.length,

          riskyDocuments,

          criticalDocuments,

          totalFindings,

          encryptedDocuments,

          verifiedDocuments,

          restrictedDocuments,

          s3Documents,

          missingDocuments,
        },

        documents,

        recentEvents,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

/* =====================================================
   Verify Document Integrity
===================================================== */

exports.verifyIntegrity =
  async (req, res) => {
    try {
      const document =
        await Document.findOne({
          _id: req.params.id,

          uploadedBy:
            req.user._id,

          deleted: false,
        });

      if (!document) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Document not found",
          });
      }

      const verification =
        await verifyStoredDocument(
          document
        );

      const trust =
        calculateTrustScore({
          integrityStatus:
            verification.status,

          encrypted:
            document.security
              ?.encryption ===
            "AES-256-GCM",

          ownerBound: true,

          injectionDetected:
            document.security
              ?.promptInjection
              ?.detected,

          sensitiveRisk:
            document
              .sensitiveData
              ?.riskLevel,
        });

      if (
        verification.status ===
        "missing"
      ) {
        document.storageStatus =
          "missing";
      } else if (
        verification.valid
      ) {
        document.storageStatus =
          "available";
      }

      document.security = {
        ...document.security,

        integrityStatus:
          verification.status,

        lastVerifiedAt:
          new Date(),

        trustScore:
          trust.score,

        trustGrade:
          trust.grade,

        trustDimensions:
          trust.dimensions,
      };

      await document.save();

      await recordSecurityEvent({
        req,

        user:
          req.user._id,

        document:
          document._id,

        type:
          "integrity",

        outcome:
          verification.valid
            ? "allowed"
            : "blocked",

        severity:
          verification.valid
            ? "info"
            : verification.status ===
              "missing"
            ? "high"
            : "critical",

        message:
          verification.reason,

        metadata: {
          trustScore:
            trust.score,

          storageProvider:
            document.storageProvider ||
            "local",
        },
      });

      if (
        verification.status ===
        "missing"
      ) {
        return res
          .status(404)
          .json({
            success: false,

            code:
              "FILE_UNAVAILABLE",

            message:
              "Document file is unavailable. Please re-upload the original file.",

            verification,

            trust,

            security:
              document.security,
          });
      }

      return res
        .status(
          verification.valid
            ? 200
            : 409
        )
        .json({
          success:
            verification.valid,

          verification,

          trust,

          security:
            document.security,
        });
    } catch (error) {
      console.error(
        "Integrity verification error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =====================================================
   Protect / Migrate Legacy Document

   Legacy Render file -> AES-256-GCM -> AWS S3
===================================================== */

exports.protectLegacyDocument =
  async (req, res) => {
    let uploadedS3Key = "";

    try {
      const document =
        await Document.findOne({
          _id: req.params.id,

          uploadedBy:
            req.user._id,

          deleted: false,
        });

      if (!document) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Document not found",
          });
      }

      /* -----------------------------
         Already stored in S3
      ----------------------------- */

      if (
        document.storageProvider ===
        "s3"
      ) {
        return exports.verifyIntegrity(
          req,
          res
        );
      }

      /* -----------------------------
         Legacy local file missing
      ----------------------------- */

      if (
        !document.filepath ||
        !fs.existsSync(
          document.filepath
        )
      ) {
        document.storageStatus =
          "missing";

        document.security = {
          ...document.security,

          integrityStatus:
            "missing",

          lastVerifiedAt:
            new Date(),

          trustScore: 0,

          trustGrade:
            "restricted",
        };

        await document.save();

        await recordSecurityEvent({
          req,

          user:
            req.user._id,

          document:
            document._id,

          type:
            "security-migration",

          outcome:
            "blocked",

          severity:
            "high",

          message:
            "Legacy file unavailable. S3 migration requires original document re-upload.",
        });

        return res
          .status(404)
          .json({
            success: false,

            code:
              "FILE_UNAVAILABLE",

            message:
              "Legacy document file is unavailable. Please re-upload the original file.",
          });
      }

      /* =================================
         READ LEGACY FILE
      ================================= */

      let encryptedBuffer;
      let plaintextHash;
      let encryptedHash;
      let iv;

      /* -----------------------------
         Already AES encrypted locally
      ----------------------------- */

      if (
        document.security
          ?.encryption ===
        "AES-256-GCM"
      ) {
        const verification =
          verifyDocumentIntegrity(
            document
          );

        if (!verification.valid) {
          return res
            .status(409)
            .json({
              success: false,

              message:
                "Legacy document integrity verification failed. Migration blocked.",
            });
        }

        encryptedBuffer =
          fs.readFileSync(
            document.filepath
          );

        plaintextHash =
          document.security
            ?.plaintextHash;

        encryptedHash =
          document.security
            ?.encryptedHash;

        iv =
          document.security
            ?.iv;
      } else {
        /* -----------------------------
           Plain legacy file
        ----------------------------- */

        const plaintextBuffer =
          fs.readFileSync(
            document.filepath
          );

        const encrypted =
          encryptBuffer(
            plaintextBuffer
          );

        encryptedBuffer =
          encrypted.encryptedBuffer;

        plaintextHash =
          encrypted.plaintextHash;

        encryptedHash =
          encrypted.encryptedHash;

        iv =
          encrypted.iv;
      }

      /* =================================
         PRIVATE S3 KEY
      ================================= */

      const s3Key =
        createDocumentKey({
          userId:
            req.user._id.toString(),

          filename:
            document.filename,
        });

      /* =================================
         UPLOAD TO AWS S3
      ================================= */

      await uploadDocument({
        key: s3Key,

        buffer:
          encryptedBuffer,
      });

      uploadedS3Key =
        s3Key;

      /* =================================
         SECURITY ANALYSIS
      ================================= */

      const promptInjection =
        detectPromptInjection(
          document.content || ""
        );

      const trust =
        calculateTrustScore({
          integrityStatus:
            "verified",

          encrypted: true,

          ownerBound: true,

          injectionDetected:
            promptInjection.detected,

          sensitiveRisk:
            document
              .sensitiveData
              ?.riskLevel,
        });

      /* =================================
         UPDATE DATABASE TO S3
      ================================= */

      const oldFilepath =
        document.filepath;

      document.filepath = "";

      document.storageProvider =
        "s3";

      document.s3Key =
        s3Key;

      document.storageStatus =
        "available";

      document.security = {
        encryption:
          "AES-256-GCM",

        encryptedAt:
          document.security
            ?.encryptedAt ||
          new Date(),

        plaintextHash,

        encryptedHash,

        iv,

        integrityStatus:
          "verified",

        lastVerifiedAt:
          new Date(),

        promptInjection,

        trustScore:
          trust.score,

        trustGrade:
          trust.grade,

        trustDimensions:
          trust.dimensions,
      };

      await document.save();

      /*
        Database now safely points to S3.
        Remove old Render file.
      */

      try {
        if (
          oldFilepath &&
          fs.existsSync(
            oldFilepath
          )
        ) {
          fs.unlinkSync(
            oldFilepath
          );
        }
      } catch (cleanupError) {
        console.error(
          "Legacy local cleanup warning:",
          cleanupError.message
        );
      }

      uploadedS3Key = "";

      await recordSecurityEvent({
        req,

        user:
          req.user._id,

        document:
          document._id,

        type:
          "security-migration",

        outcome:
          promptInjection.detected
            ? "warning"
            : "allowed",

        severity:
          promptInjection.detected
            ? "high"
            : "info",

        message:
          "Legacy document migrated to encrypted private AWS S3 storage",

        metadata: {
          trustScore:
            trust.score,

          storageProvider:
            "s3",
        },
      });

      return res.json({
        success: true,

        message:
          "Document encrypted, migrated to AWS S3 and verified",

        security:
          document.security,

        storage: {
          provider: "s3",
          status:
            "available",
        },

        trust,
      });
    } catch (error) {
      /*
        If S3 upload succeeded but DB
        migration failed, remove orphan.
      */

      if (uploadedS3Key) {
        try {
          await deleteDocument(
            uploadedS3Key
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "S3 migration rollback failed:",
            cleanupError.message
          );
        }
      }

      console.error(
        "Security migration error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =====================================================
   Sensitive Data Scan
===================================================== */

exports.scanDocument =
  async (req, res) => {
    try {
      const document =
        await Document.findOne({
          _id: req.params.id,

          uploadedBy:
            req.user._id,

          deleted: false,
        });

      if (!document) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Document not found",
          });
      }

      document.sensitiveData =
        scanSensitiveData(
          document.content || ""
        );

      await document.save();

      await createNotification({
        user:
          req.user._id,

        type:
          "security",

        title:
          document
            .sensitiveData
            .totalFindings
            ? `${document.sensitiveData.riskLevel} privacy risk detected`
            : "Privacy scan completed",

        message:
          document
            .sensitiveData
            .totalFindings
            ? `${document.sensitiveData.totalFindings} sensitive finding(s) were detected in ${document.filename}.`
            : `${document.filename} passed the sensitive data scan.`,

        document:
          document._id,

        actionPath:
          "/security",
      });

      return res.json({
        success: true,

        message:
          "Privacy scan completed",

        sensitiveData:
          document.sensitiveData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };