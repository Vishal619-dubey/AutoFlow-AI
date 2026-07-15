const Document = require("../models/Document");
const { chatWithPdf: askPdf } = require("../services/groqService");

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
    await document.save();

    res.status(200).json({
      success: true,
      answer,
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
