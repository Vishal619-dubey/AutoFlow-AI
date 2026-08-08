const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Document = require("../models/Document");
const { protect } = require("../middleware/authMiddleware");
const { addActivity } = require("../controllers/activityController");
const { analyzeDocument } = require("../services/documentAutomationService");
const { runAutomationRules } = require("../services/automationRuleEngine");
const { scanSensitiveData } = require("../services/sensitiveDataScanner");
const { extractPageAwarePdf } = require("../services/pdfEvidenceService");
const { createNotification } = require("../services/notificationService");
const { encryptFile, detectPromptInjection, calculateTrustScore } = require("../services/documentSecurityService");
const { recordSecurityEvent } = require("../services/securityEventService");

const router = express.Router();

/* =====================================
   Upload Directory
===================================== */

const uploadDirectory = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/* =====================================
   Storage
===================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const uniqueName = `${Date.now()}-${safeOriginalName}`;

    cb(null, uniqueName);
  },
});

/* =====================================
   Allowed File Types
===================================== */

const allowedTypes = [
  "application/pdf",

  "image/png",
  "image/jpeg",
  "image/webp",

  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",

  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "text/plain",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error("Unsupported file type"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

/* =====================================
   Detect File Type
===================================== */

function getFileType(mimetype = "") {
  if (mimetype.includes("pdf")) return "pdf";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.includes("wordprocessingml")) return "docx";
  if (mimetype.includes("spreadsheetml")) return "xlsx";
  if (mimetype.includes("presentationml")) return "pptx";
  if (mimetype.includes("text")) return "txt";

  return "other";
}

/* =====================================
   Upload Route
===================================== */

router.post("/", protect, (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Multer Error:", uploadError.message);

      return res.status(400).json({
        success: false,
        message: uploadError.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const fileType = getFileType(req.file.mimetype);

      let extractedContent = "";
      let pageCount = 0;

      if (fileType === "pdf") {
        const parsedPdf = await extractPageAwarePdf(req.file.path);
        extractedContent = parsedPdf.content;
        pageCount = parsedPdf.pages;
      }

      if (fileType === "txt") {
        extractedContent = fs.readFileSync(req.file.path, "utf8");
      }

      const automation = analyzeDocument({
        filename: req.file.originalname,
        content: extractedContent,
        pages: pageCount,
      });

      const sensitiveData = scanSensitiveData(extractedContent);
      const promptInjection = detectPromptInjection(extractedContent);
      const encrypted = encryptFile(req.file.path);
      req.encryptedUploadPath = encrypted.encryptedPath;
      const trust = calculateTrustScore({
        integrityStatus: "verified",
        encrypted: true,
        ownerBound: true,
        injectionDetected: promptInjection.detected,
        sensitiveRisk: sensitiveData.riskLevel,
      });

      const document = await Document.create({
        filename: req.file.originalname,
        filepath: encrypted.encryptedPath,
        filesize: req.file.size,
        mimeType: req.file.mimetype,
        fileType,
        content: extractedContent,
        pages: pageCount,
        summary: "",
        favorite: false,
        pinned: false,
        uploadedBy: req.user._id,
        ...automation,
        sensitiveData,
        security: {
          encryption: "AES-256-GCM",
          encryptedAt: new Date(),
          plaintextHash: encrypted.plaintextHash,
          encryptedHash: encrypted.encryptedHash,
          iv: encrypted.iv,
          integrityStatus: "verified",
          lastVerifiedAt: new Date(),
          promptInjection,
          trustScore: trust.score,
          trustGrade: trust.grade,
          trustDimensions: trust.dimensions,
        },
      });

      await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "secure-upload", outcome: promptInjection.detected ? "warning" : "allowed", severity: promptInjection.detected ? "high" : "info", message: promptInjection.detected ? "Encrypted upload quarantined for prompt-injection review" : "Document encrypted and integrity fingerprint recorded", metadata: { trustScore: trust.score } });

      await addActivity("Uploaded Document", document.filename, "upload", "indigo", req.user._id);

      await createNotification({
        user: req.user._id,
        type: "upload",
        title: "Document processed",
        message: `${document.filename} was classified as ${document.classification} with ${document.priority} priority.`,
        document: document._id,
        actionPath: document.fileType === "pdf" ? `/evidence/${document._id}` : "/documents",
      });

      if (document.workflowStatus === "review") {
        await createNotification({
          user: req.user._id,
          type: "review",
          title: "Approval required",
          message: `${document.filename} needs a human decision before the workflow can continue.`,
          document: document._id,
          actionPath: "/approvals",
        });
      }

      if (sensitiveData.totalFindings > 0) {
        await createNotification({
          user: req.user._id,
          type: "security",
          title: `${sensitiveData.riskLevel} privacy risk detected`,
          message: `${sensitiveData.totalFindings} sensitive data finding(s) were masked in ${document.filename}.`,
          document: document._id,
          actionPath: "/security",
        });
      }

      await runAutomationRules({
        document,
        userId: req.user._id,
        trigger: "Document uploaded",
      });

      if (["high", "critical"].includes(document.priority)) {
        await runAutomationRules({
          document,
          userId: req.user._id,
          trigger: "High priority detected",
        });
      }

      return res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        document,
      });
    } catch (error) {
      console.error("Upload Error:", error);

      if (req.encryptedUploadPath && fs.existsSync(req.encryptedUploadPath)) {
        fs.unlinkSync(req.encryptedUploadPath);
      } else if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: error.message || "File upload failed",
      });
    }
  });
});

module.exports = router;
