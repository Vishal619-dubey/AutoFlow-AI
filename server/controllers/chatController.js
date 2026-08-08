const Document = require("../models/Document");
const { chatWithPdf: askPdf } = require("../services/groqService");
const { verifyDocumentIntegrity, detectPromptInjection } = require("../services/documentSecurityService");
const { recordSecurityEvent } = require("../services/securityEventService");

const chatWithPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: "Question is required" });
    }

    const document = await Document.findOne({
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

    const integrity = verifyDocumentIntegrity(document);
    if (!integrity.valid) {
      document.security = { ...document.security, integrityStatus: integrity.status, lastVerifiedAt: new Date(), trustScore: 0, trustGrade: "restricted" };
      await document.save();
      await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "ai-retrieval", outcome: "blocked", severity: "critical", message: `AI retrieval blocked: ${integrity.reason}` });
      return res.status(409).json({ success: false, message: "AI access blocked because document integrity could not be verified." });
    }

    const questionInjection = detectPromptInjection(question);
    if (document.security?.promptInjection?.detected || questionInjection.detected) {
      await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "prompt-injection", outcome: "blocked", severity: "high", message: "Potential prompt-injection attempt blocked", metadata: { queryMatchCount: questionInjection.matchCount } });
      return res.status(400).json({ success: false, message: "This request was blocked by the AutoFlow-AI context security policy." });
    }

    if (!document.content || document.content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "PDF content not found. Please generate summary again.",
      });
    }

    // ===== Reduce token usage =====
    let pdfContent = document.content;

    // Try to find the question inside the PDF
    const index = pdfContent
      .toLowerCase()
      .indexOf(question.toLowerCase());

    if (index !== -1) {
      // Send only nearby text
      const proposedStart = Math.max(0, index - 2500);
      const pageMarker = pdfContent.lastIndexOf("[PAGE ", proposedStart);
      pdfContent = pdfContent.substring(
        pageMarker >= 0 ? pageMarker : proposedStart,
        index + 4500
      );
    } else {
      // Otherwise send the first page-aware section.
      pdfContent = pdfContent.substring(0, 12000);
    }

    const answer = await askPdf(pdfContent, question.trim());
    document.aiChats += 1;
    document.security = { ...document.security, integrityStatus: "verified", lastVerifiedAt: new Date() };
    await document.save();

    await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "ai-retrieval", outcome: "allowed", severity: "info", message: "Authorized evidence-grounded AI retrieval completed" });

    res.status(200).json({
      success: true,
      answer,
      security: { integrity: "verified", accessPolicy: "owner-only", evidenceBound: true },
    });

  } catch (error) {
    console.error("Chat Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  chatWithPdf,
};
