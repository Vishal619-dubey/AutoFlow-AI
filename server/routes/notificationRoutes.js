const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);
router.get("/", controller.listNotifications);
router.put("/read-all", controller.markAllRead);
router.put("/:id/read", controller.markRead);

module.exports = router;
