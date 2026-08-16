const fs = require("fs");

const Document =
  require("../models/Document");

const {
  buildEvidenceInsights,
  ensurePageAwareContent,
  hashFile,
  hashBuffer,
} = require("../services/pdfEvidenceService");

const {
  decryptBuffer,
  decryptFile,
  verifyDocumentIntegrity,
  verifyDocumentIntegrityBuffer,
} = require("../services/documentSecurityService");

const {
  documentExists,
  getDocumentBuffer,
} = require("../services/s3StorageService");

/* =====================================================
   Executive Summary
===================================================== */

function createExecutiveSummary(
  document,
  content = ""
) {
  if (
    document.summary?.trim()
  ) {
    return document.summary
      .trim()
      .slice(0, 1200);
  }

  const plainText =
    content
      .replace(
        /\[PAGE \d+\]/g,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

  const sentences =
    plainText
      .split(
        /(?<=[.!?])\s+/
      )
      .map(
        (sentence) =>
          sentence.trim()
      )
      .filter(
        (sentence) =>
          sentence.length > 35
      )
      .slice(0, 3);

  if (sentences.length) {
    return sentences
      .join(" ")
      .slice(0, 900);
  }

  return `This ${
    document.classification ||
    "general"
  } document was processed by AutoFlow AI with ${
    document.automationScore || 0
  }% automation confidence.`;
}

/* =====================================================
   Load Evidence File
===================================================== */

async function loadEvidenceFile(
  document
) {
  /* AWS S3 */

  if (
    document.storageProvider ===
    "s3"
  ) {
    if (!document.s3Key) {
      return {
        available: false,
        status: "missing",
        reason:
          "S3 storage key is missing",
      };
    }

    const exists =
      await documentExists(
        document.s3Key
      );

    if (!exists) {
      return {
        available: false,
        status: "missing",
        reason:
          "Stored S3 file is unavailable",
      };
    }

    const encryptedBuffer =
      await getDocumentBuffer(
        document.s3Key
      );

    const verification =
      verifyDocumentIntegrityBuffer(
        document,
        encryptedBuffer
      );

    if (!verification.valid) {
      return {
        available: false,
        status:
          verification.status,
        reason:
          verification.reason,
      };
    }

    const plaintextBuffer =
      decryptBuffer(
        encryptedBuffer
      );

    return {
      available: true,
      provider: "s3",
      encryptedBuffer,
      plaintextBuffer,
      fingerprint:
        hashBuffer(
          encryptedBuffer
        ),
    };
  }

  /* Legacy local file */

  if (
    !document.filepath ||
    !fs.existsSync(
      document.filepath
    )
  ) {
    return {
      available: false,
      status: "missing",
      reason:
        "Legacy local file is unavailable",
    };
  }

  const verification =
    verifyDocumentIntegrity(
      document
    );

  if (!verification.valid) {
    return {
      available: false,
      status:
        verification.status,
      reason:
        verification.reason,
    };
  }

  const plaintextBuffer =
    decryptFile(
      document.filepath
    );

  return {
    available: true,
    provider: "local",
    plaintextBuffer,
    fingerprint:
      await hashFile(
        document.filepath
      ),
  };
}

/* =====================================================
   Evidence Profile
===================================================== */

exports.getEvidenceProfile =
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

      const stored =
        await loadEvidenceFile(
          document
        );

      if (!stored.available) {
        document.storageStatus =
          stored.status ===
          "missing"
            ? "missing"
            : document.storageStatus;

        document.security = {
          ...document.security,

          integrityStatus:
            stored.status,

          lastVerifiedAt:
            new Date(),

          trustScore: 0,

          trustGrade:
            "restricted",
        };

        await document.save();

        return res
          .status(
            stored.status ===
              "missing"
              ? 404
              : 409
          )
          .json({
            success: false,

            code:
              stored.status ===
              "missing"
                ? "FILE_UNAVAILABLE"
                : "INTEGRITY_FAILURE",

            message:
              stored.status ===
              "missing"
                ? "Document file is unavailable. Please re-upload the original file."
                : "Document integrity verification failed. Evidence access blocked.",
          });
      }

      /* =================================
         Page-aware PDF content
      ================================= */

      const content =
        await ensurePageAwareContent(
          document,
          stored.plaintextBuffer
        );

      const insights =
        buildEvidenceInsights(
          content
        );

      const findingTypes =
        document.sensitiveData
          ?.findings?.map(
            (finding) => ({
              type:
                finding.type,

              count:
                finding.count,

              samples:
                finding.samples,
            })
          ) || [];

      /* =================================
         Update storage/security health
      ================================= */

      document.storageStatus =
        "available";

      document.security = {
        ...document.security,

        integrityStatus:
          "verified",

        lastVerifiedAt:
          new Date(),
      };

      await document.save();

      /* =================================
         Response
      ================================= */

      return res.json({
        success: true,

        document: {
          _id:
            document._id,

          filename:
            document.filename,

          filesize:
            document.filesize,

          fileType:
            document.fileType,

          mimeType:
            document.mimeType,

          pages:
            document.pages,

          classification:
            document.classification,

          priority:
            document.priority,

          workflowStatus:
            document.workflowStatus,

          automationScore:
            document.automationScore,

          summary:
            createExecutiveSummary(
              document,
              content
            ),

          actionItems:
            document.extractedTasks ||
            [],

          createdAt:
            document.createdAt,

          storageProvider:
            document.storageProvider ||
            "local",
        },

        report: {
          generatedBy:
            req.user.name,

          generatedAt:
            new Date(),

          reportId:
            `AF-${String(
              document._id
            )
              .slice(-8)
              .toUpperCase()}`,

          wordCount:
            content
              .replace(
                /\[PAGE \d+\]/g,
                " "
              )
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .length,
        },

        integrity: {
          algorithm:
            "SHA-256",

          fingerprint:
            stored.fingerprint,

          status:
            "verified",

          verifiedAt:
            new Date(),
        },

        privacy: {
          riskLevel:
            document
              .sensitiveData
              ?.riskLevel ||
            "safe",

          riskScore:
            document
              .sensitiveData
              ?.riskScore ||
            0,

          totalFindings:
            document
              .sensitiveData
              ?.totalFindings ||
            0,

          findings:
            findingTypes,
        },

        insights,
      });
    } catch (error) {
      console.error(
        "Evidence profile error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to load Evidence Studio",
        });
    }
  };