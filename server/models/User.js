const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      default: "AI Automation Engineer",
      trim: true,
      maxlength: 60,
    },

    avatar: {
      type: String,
      default: "",
    },

    /* ==========================
       Login Security
    ========================== */

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIpHash: {
      type: String,
      default: "",
    },

    /* ==========================
       BioTrust Face Security
    ========================== */

    faceAuth: {
      enabled: {
        type: Boolean,
        default: false,
      },

      enrolled: {
        type: Boolean,
        default: false,
      },

      referenceS3Key: {
        type: String,
        default: "",
      },

      referenceHash: {
        type: String,
        default: "",
      },

      enrolledAt: {
        type: Date,
        default: null,
      },

      lastVerifiedAt: {
        type: Date,
        default: null,
      },

      failedAttempts: {
        type: Number,
        default: 0,
      },

      lockedUntil: {
        type: Date,
        default: null,
      },

      verificationCount: {
        type: Number,
        default: 0,
      },

      version: {
        type: Number,
        default: 1,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);