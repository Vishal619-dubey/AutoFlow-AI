const Document = require("../models/Document");
const { scanSensitiveData } = require("../services/sensitiveDataScanner");
const { createNotification } = require("../services/notificationService");
const SecurityEvent = require("../models/SecurityEvent");
const { verifyDocumentIntegrity, calculateTrustScore, encryptFile, detectPromptInjection } = require("../services/documentSecurityService");
const { recordSecurityEvent } = require("../services/securityEventService");

exports.getSecurityDashboard = async (req, res) => {
  try {
    const documents = await Document.find({
      uploadedBy: req.user._id,
      deleted: false,
    })
      .select("filename fileType classification sensitiveData security createdAt")
      .sort({ createdAt: -1 });

    const scannedDocuments = documents.filter(
      (document) => Boolean(document.sensitiveData?.scannedAt)
    );
    const totalFindings = scannedDocuments.reduce(
      (sum, document) => sum + (document.sensitiveData?.totalFindings || 0),
      0
    );
    const riskyDocuments = scannedDocuments.filter(
      (document) => document.sensitiveData?.riskLevel && document.sensitiveData.riskLevel !== "safe"
    ).length;
    const criticalDocuments = scannedDocuments.filter(
      (document) => document.sensitiveData?.riskLevel === "critical"
    ).length;
    const encryptedDocuments = documents.filter((document) => document.security?.encryption === "AES-256-GCM").length;
    const verifiedDocuments = documents.filter((document) => document.security?.integrityStatus === "verified").length;
    const restrictedDocuments = documents.filter((document) => document.security?.trustGrade === "restricted").length;
    const recentEvents = await SecurityEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();

    return res.json({
      success: true,
      metrics: {
        scanned: scannedDocuments.length,
        riskyDocuments,
        criticalDocuments,
        totalFindings,
        encryptedDocuments,
        verifiedDocuments,
        restrictedDocuments,
      },
      documents,
      recentEvents,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyIntegrity = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, uploadedBy: req.user._id, deleted: false });
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    const verification = verifyDocumentIntegrity(document);
    const trust = calculateTrustScore({ integrityStatus: verification.status, encrypted: document.security?.encryption === "AES-256-GCM", ownerBound: true, injectionDetected: document.security?.promptInjection?.detected, sensitiveRisk: document.sensitiveData?.riskLevel });
    document.security = { ...document.security, integrityStatus: verification.status, lastVerifiedAt: new Date(), trustScore: trust.score, trustGrade: trust.grade, trustDimensions: trust.dimensions };
    await document.save();
    await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "integrity", outcome: verification.valid ? "allowed" : "blocked", severity: verification.valid ? "info" : "critical", message: verification.reason, metadata: { trustScore: trust.score } });
    return res.status(verification.valid ? 200 : 409).json({ success: verification.valid, verification, trust, security: document.security });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.protectLegacyDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, uploadedBy: req.user._id, deleted: false });
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (document.security?.encryption === "AES-256-GCM") return exports.verifyIntegrity(req, res);
    const encrypted = encryptFile(document.filepath);
    const promptInjection = detectPromptInjection(document.content || "");
    const trust = calculateTrustScore({ integrityStatus: "verified", encrypted: true, ownerBound: true, injectionDetected: promptInjection.detected, sensitiveRisk: document.sensitiveData?.riskLevel });
    document.filepath = encrypted.encryptedPath;
    document.security = { encryption: "AES-256-GCM", encryptedAt: new Date(), plaintextHash: encrypted.plaintextHash, encryptedHash: encrypted.encryptedHash, iv: encrypted.iv, integrityStatus: "verified", lastVerifiedAt: new Date(), promptInjection, trustScore: trust.score, trustGrade: trust.grade, trustDimensions: trust.dimensions };
    await document.save();
    await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "security-migration", outcome: promptInjection.detected ? "warning" : "allowed", severity: promptInjection.detected ? "high" : "info", message: "Legacy document migrated to encrypted tamper-evident storage", metadata: { trustScore: trust.score } });
    return res.json({ success: true, message: "Document encrypted and verified", security: document.security, trust });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.scanDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      deleted: false,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.sensitiveData = scanSensitiveData(document.content || "");
    await document.save();

    await createNotification({
      user: req.user._id,
      type: "security",
      title: document.sensitiveData.totalFindings ? `${document.sensitiveData.riskLevel} privacy risk detected` : "Privacy scan completed",
      message: document.sensitiveData.totalFindings
        ? `${document.sensitiveData.totalFindings} sensitive finding(s) were detected in ${document.filename}.`
        : `${document.filename} passed the sensitive data scan.`,
      document: document._id,
      actionPath: "/security",
    });

    return res.json({
      success: true,
      message: "Privacy scan completed",
      sensitiveData: document.sensitiveData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
