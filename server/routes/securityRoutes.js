const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getSecurityDashboard, scanDocument } = require("../controllers/securityController");

const router = express.Router();
router.use(protect);
router.get("/dashboard", getSecurityDashboard);
router.post("/scan/:id", scanDocument);

module.exports = router;
