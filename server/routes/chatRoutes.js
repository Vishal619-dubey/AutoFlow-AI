const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { chatWithPdf } = require("../controllers/chatController");

const router = express.Router();
router.post("/:id", protect, chatWithPdf);
module.exports = router;
