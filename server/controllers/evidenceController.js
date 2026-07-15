const fs = require("fs");
const Document = require("../models/Document");
const {
  buildEvidenceInsights,
  ensurePageAwareContent,
  hashFile,
} = require("../services/pdfEvidenceService");

function createExecutiveSummary(document, content = "") {
  if (document.summary?.trim()) return document.summary.trim().slice(0, 1200);
  const plainText = content.replace(/\[PAGE \d+\]/g, " ").replace(/\s+/g, " ").trim();
  const sentences = plainText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, 3);

  if (sentences.length) return sentences.join(" ").slice(0, 900);
  return `This ${document.classification || "general"} document was processed by AutoFlow AI with ${document.automationScore || 0}% automation confidence.`;
}

exports.getEvidenceProfile = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      deleted: false,
    });

    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (!document.filepath || !fs.existsSync(document.filepath)) {
      return res.status(404).json({ success: false, message: "Document file is unavailable" });
    }

    const [content, fingerprint] = await Promise.all([
      ensurePageAwareContent(document),
      hashFile(document.filepath),
    ]);

    const insights = buildEvidenceInsights(content);
    const findingTypes = document.sensitiveData?.findings?.map((finding) => ({
      type: finding.type,
      count: finding.count,
      samples: finding.samples,
    })) || [];

    return res.json({
      success: true,
      document: {
        _id: document._id,
        filename: document.filename,
        filesize: document.filesize,
        fileType: document.fileType,
        mimeType: document.mimeType,
        pages: document.pages,
        classification: document.classification,
        priority: document.priority,
        workflowStatus: document.workflowStatus,
        automationScore: document.automationScore,
        summary: createExecutiveSummary(document, content),
        actionItems: document.extractedTasks || [],
        createdAt: document.createdAt,
      },
      report: {
        generatedBy: req.user.name,
        generatedAt: new Date(),
        reportId: `AF-${String(document._id).slice(-8).toUpperCase()}`,
        wordCount: content.replace(/\[PAGE \d+\]/g, " ").trim().split(/\s+/).filter(Boolean).length,
      },
      integrity: {
        algorithm: "SHA-256",
        fingerprint,
        status: "verified",
        verifiedAt: new Date(),
      },
      privacy: {
        riskLevel: document.sensitiveData?.riskLevel || "safe",
        riskScore: document.sensitiveData?.riskScore || 0,
        totalFindings: document.sensitiveData?.totalFindings || 0,
        findings: findingTypes,
      },
      insights,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
