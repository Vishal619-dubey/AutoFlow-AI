const fs = require("fs");
const pdfParse = require("pdf-parse");

const Document = require("../models/Document");
const { generateSummary } = require("../services/groqService");

const generatePdfSummary = async (req, res) => {
  try {
    const { id } = req.params;

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

    if (document.fileType && document.fileType !== "pdf") {
      return res.status(400).json({
        success: false,
        message: "AI summary is currently available only for PDF files",
      });
    }

    let text = document.content?.trim() || "";

    // Fallback: extract again only when database content is empty
    if (!text) {
      if (!document.filepath || !fs.existsSync(document.filepath)) {
        return res.status(400).json({
          success: false,
          message:
            "The PDF file is no longer available on the server. Please upload it again.",
        });
      }

      const buffer = fs.readFileSync(document.filepath);
      const parsedPdf = await pdfParse(buffer);

      text = parsedPdf.text?.trim() || "";

      if (text) {
        document.content = text;
      }
    }

    // Scanned or image-based PDF
    if (text.length < 50) {
      return res.status(400).json({
        success: false,
        message:
          "No readable text was found. This PDF may be scanned or image-based.",
      });
    }

    // Prevent very large AI requests
    const summaryInput = text.slice(0, 12000);

    const summary = await generateSummary(summaryInput);

    if (!summary || !summary.trim()) {
      return res.status(502).json({
        success: false,
        message: "AI returned an empty summary. Please try again.",
      });
    }

    document.summary = summary.trim();
    document.summaryGenerated = true;
    await document.save();

    return res.status(200).json({
      success: true,
      message: "Summary generated successfully",
      summary: document.summary,
      truncated: text.length > summaryInput.length,
    });
  } catch (error) {
    console.error("Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Summary generation failed",
    });
  }
};

const getPdfSummary = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      deleted: false,
    }).select("summary summaryGenerated");

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, summary: document.summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generatePdfSummary,
  getPdfSummary,
};
