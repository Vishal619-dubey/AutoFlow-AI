const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { generatePdfSummary, getPdfSummary } = require("../controllers/summaryController");

const router = express.Router();
router.post("/:id", protect, generatePdfSummary);
router.get("/:id", protect, getPdfSummary);
module.exports = router;
