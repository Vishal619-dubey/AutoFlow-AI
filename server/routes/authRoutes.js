const express = require("express");
const router = express.Router();

const {
  getProfile,
  registerUser,
  loginUser,
  googleLogin,
  updateProfile,
  logoutUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/logout", protect, logoutUser);

module.exports = router;

