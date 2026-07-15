const Document = require("../models/Document");
const { scanSensitiveData } = require("../services/sensitiveDataScanner");
const { createNotification } = require("../services/notificationService");

exports.getSecurityDashboard = async (req, res) => {
  try {
    const documents = await Document.find({
      uploadedBy: req.user._id,
      deleted: false,
    })
      .select("filename fileType classification sensitiveData createdAt")
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

    return res.json({
      success: true,
      metrics: {
        scanned: scannedDocuments.length,
        riskyDocuments,
        criticalDocuments,
        totalFindings,
      },
      documents,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
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
