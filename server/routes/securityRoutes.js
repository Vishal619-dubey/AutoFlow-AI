const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getSecurityDashboard, scanDocument, verifyIntegrity, protectLegacyDocument } = require("../controllers/securityController");

const router = express.Router();
router.use(protect);
router.get("/dashboard", getSecurityDashboard);
router.post("/scan/:id", scanDocument);
router.post("/verify/:id", verifyIntegrity);
router.post("/protect/:id", protectLegacyDocument);

module.exports = router;
