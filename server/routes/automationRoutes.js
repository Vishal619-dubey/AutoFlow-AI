const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/automationController");

const router = express.Router();
router.use(protect);
router.get("/dashboard", controller.getDashboard);
router.post("/parse-rule", controller.parseNaturalLanguageRule);
router.post("/process/:id", controller.reprocessDocument);
router.put("/review/:id", controller.updateReviewStatus);
router.get("/rules", controller.listRules);
router.get("/runs", controller.listRuns);
router.post("/rules", controller.createRule);
router.put("/rules/:id/toggle", controller.toggleRule);
router.delete("/rules/:id", controller.deleteRule);

module.exports = router;
