const fs = require("fs");
const Document = require("../models/Document");
const { addActivity } = require("./activityController");

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from uploads folder
    if (fs.existsSync(document.filepath)) {
      fs.unlinkSync(document.filepath);
    }

    // Delete document from MongoDB
    await Document.findByIdAndDelete(id);

    // Save Activity
    await addActivity(
      "Deleted Document",
      document.filename,
      "trash",
      "red"
    );

    return res.json({
      success: true,
      message: "Document deleted successfully",
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  deleteDocument,
};