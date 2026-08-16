const Document = require("../models/Document");

const {
  chatWithPdf: askPdf,
} = require("../services/groqService");

const {
  verifyDocumentIntegrity,
  verifyDocumentIntegrityBuffer,
  detectPromptInjection,
} = require("../services/documentSecurityService");

const {
  documentExists,
  getDocumentBuffer,
} = require("../services/s3StorageService");

const {
  recordSecurityEvent,
} = require("../services/securityEventService");

/* =====================================================
   Verify Document Storage + Integrity
   Supports AWS S3 and legacy local files
===================================================== */

async function verifyStoredDocument(document) {
  /* -----------------------------
     AWS S3 document
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
        reason: "Stored S3 file is unavailable",
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
     Legacy local document
  ----------------------------- */

  return verifyDocumentIntegrity(
    document
  );
}

/* =====================================================
   Chat With PDF
===================================================== */

const chatWithPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    /* =================================
       VALIDATE QUESTION
    ================================= */

    if (
      !question ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    /* =================================
       FIND OWNER'S DOCUMENT
    ================================= */

    const document =
      await Document.findOne({
        _id: id,
        uploadedBy: req.user._id,
        deleted: false,
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    /* =================================
       STORAGE + INTEGRITY VERIFICATION
    ================================= */

    const integrity =
      await verifyStoredDocument(
        document
      );

    if (!integrity.valid) {
      document.storageStatus =
        integrity.status === "missing"
          ? "missing"
          : document.storageStatus;

      document.security = {
        ...document.security,

        integrityStatus:
          integrity.status,

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
          "ai-retrieval",

        outcome:
          "blocked",

        severity:
          integrity.status === "missing"
            ? "high"
            : "critical",

        message:
          `AI retrieval blocked: ${integrity.reason}`,

        metadata: {
          storageProvider:
            document.storageProvider ||
            "local",
        },
      });

      if (
        integrity.status ===
        "missing"
      ) {
        return res.status(404).json({
          success: false,

          code:
            "FILE_UNAVAILABLE",

          message:
            "Document file is unavailable. Please re-upload the original file before using AI Copilot.",
        });
      }

      return res.status(409).json({
        success: false,

        code:
          "INTEGRITY_FAILURE",

        message:
          "AI access blocked because document integrity could not be verified.",
      });
    }

    /* =================================
       USER QUERY PROMPT-INJECTION CHECK

       Important:
       Only the USER QUESTION can block
       the request here.

       Prompt-like text inside the PDF is
       treated as untrusted document
       evidence, not executable instruction.
    ================================= */

    const questionInjection =
      detectPromptInjection(
        question.trim()
      );

    const documentInjectionDetected =
      Boolean(
        document.security
          ?.promptInjection
          ?.detected
      );

    if (questionInjection.detected) {
      await recordSecurityEvent({
        req,

        user:
          req.user._id,

        document:
          document._id,

        type:
          "prompt-injection",

        outcome:
          "blocked",

        severity:
          "high",

        message:
          "Potential prompt-injection attempt in user query blocked",

        metadata: {
          source:
            "user-query",

          queryMatchCount:
            questionInjection.matchCount,

          matchedRules:
            questionInjection.rules,
        },
      });

      return res.status(400).json({
        success: false,

        code:
          "CONTEXT_SECURITY_BLOCK",

        message:
          "This request was blocked by the AutoFlow-AI context security policy.",
      });
    }

    /* =================================
       VERIFY EXTRACTED PDF CONTENT
    ================================= */

    if (
      !document.content ||
      document.content.trim() === ""
    ) {
      return res.status(400).json({
        success: false,

        code:
          "CONTENT_UNAVAILABLE",

        message:
          "PDF content is unavailable. Please re-upload the document.",
      });
    }

    /* =================================
       REDUCE TOKEN USAGE
    ================================= */

    let pdfContent =
      document.content;

    const normalizedQuestion =
      question
        .trim()
        .toLowerCase();

    const index =
      pdfContent
        .toLowerCase()
        .indexOf(
          normalizedQuestion
        );

    if (index !== -1) {
      const proposedStart =
        Math.max(
          0,
          index - 2500
        );

      const pageMarker =
        pdfContent.lastIndexOf(
          "[PAGE ",
          proposedStart
        );

      pdfContent =
        pdfContent.substring(
          pageMarker >= 0
            ? pageMarker
            : proposedStart,

          index + 4500
        );
    } else {
      pdfContent =
        pdfContent.substring(
          0,
          12000
        );
    }

    /* =================================
       GROQ / AI REQUEST

       groqService system prompt already
       tells the model to treat PDF content
       as evidence, not instructions.
    ================================= */

    const answer =
      await askPdf(
        pdfContent,
        question.trim()
      );

    /* =================================
       UPDATE SECURITY + ANALYTICS
    ================================= */

    document.aiChats =
      (document.aiChats || 0) + 1;

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
       AUDIT SUCCESSFUL AI RETRIEVAL
    ================================= */

    await recordSecurityEvent({
      req,

      user:
        req.user._id,

      document:
        document._id,

      type:
        "ai-retrieval",

      outcome:
        "allowed",

      severity:
        documentInjectionDetected
          ? "medium"
          : "info",

      message:
        documentInjectionDetected
          ? "Evidence-grounded AI retrieval completed while document prompt-like text remained isolated as untrusted evidence"
          : "Authorized evidence-grounded AI retrieval completed",

      metadata: {
        storageProvider:
          document.storageProvider ||
          "local",

        integrity:
          "verified",

        documentPromptInjectionDetected:
          documentInjectionDetected,

        documentPromptMatchCount:
          document.security
            ?.promptInjection
            ?.matchCount || 0,

        userQueryPromptInjectionDetected:
          false,
      },
    });

    /* =================================
       SUCCESS
    ================================= */

    return res.status(200).json({
      success: true,

      answer,

      security: {
        integrity:
          "verified",

        accessPolicy:
          "owner-only",

        evidenceBound:
          true,

        storage:
          document.storageProvider ||
          "local",

        documentInstructions:
          documentInjectionDetected
            ? "isolated"
            : "clear",

        userQuery:
          "safe",
      },
    });
  } catch (error) {
    console.error(
      "Chat Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "AI Copilot request failed",
    });
  }
};

module.exports = {
  chatWithPdf,
};