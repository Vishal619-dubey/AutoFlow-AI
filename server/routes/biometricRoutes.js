const express = require("express");
const multer = require("multer");

const {
  enrollFace,
  verifyFace,
  getFaceStatus,
  removeFace,
} = require("../controllers/biometricController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Only JPEG and PNG face images are allowed."));
    }

    callback(null, true);
  },
});

router.get("/status", protect, getFaceStatus);

router.post("/enroll", protect, upload.single("face"), enrollFace);

router.post("/verify", protect, upload.single("face"), verifyFace);

router.delete("/enroll", protect, removeFace);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Face image must be smaller than 5 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Biometric upload failed.",
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid biometric image.",
    });
  }

  next();
});

module.exports = router;
