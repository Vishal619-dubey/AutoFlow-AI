const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    /* ==========================
       Basic Information
    ========================== */

    filename: {
      type: String,
      required: true,
    },

    filepath: {
  type: String,
  default: "",
},

storageProvider: {
  type: String,
  enum: ["local", "s3"],
  default: "local",
},

s3Key: {
  type: String,
  default: "",
},

storageStatus: {
  type: String,
  enum: ["available", "missing"],
  default: "available",
},

    filesize: {
      type: Number,
      required: true,
    },

    mimeType: {
      type: String,
      default: "",
    },

    fileType: {
      type: String,
      enum: [
        "pdf",
        "image",
        "audio",
        "video",
        "docx",
        "xlsx",
        "pptx",
        "txt",
        "other",
      ],
      default: "other",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ==========================
       AI Data
    ========================== */

    content: {
      type: String,
      default: "",
    },

    summary: {
      type: String,
      default: "",
    },

    knowledgeGraph: {
  type: Array,
  default: [],
},

    language: {
      type: String,
      default: "English",
    },

    aiProcessing: {
      type: Boolean,
      default: false,
    },

    summaryGenerated: {
      type: Boolean,
      default: false,
    },

    /* ==========================
       Organization
    ========================== */

    category: {
      type: String,
      default: "General",
    },

    folder: {
      type: String,
      default: "My Workspace",
    },

    tags: {
      type: [String],
      default: [],
    },

    classification: {
      type: String,
      default: "General",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    workflowStatus: {
      type: String,
      enum: ["processed", "review", "approved", "rejected"],
      default: "processed",
    },

    extractedTasks: {
      type: [String],
      default: [],
    },

    automationScore: {
      type: Number,
      default: 0,
    },

    sensitiveData: {
      type: Object,
      default: () => ({
        scannedAt: null,
        riskLevel: "safe",
        riskScore: 0,
        totalFindings: 0,
        findings: [],
      }),
    },

    security: {
      type: Object,
      default: () => ({
        encryption: "none",
        encryptedAt: null,
        plaintextHash: "",
        encryptedHash: "",
        iv: "",
        integrityStatus: "pending",
        lastVerifiedAt: null,
        promptInjection: { detected: false, matchCount: 0, rules: [] },
        trustScore: 0,
        trustGrade: "restricted",
        trustDimensions: {},
      }),
    },

    /* ==========================
       Media Information
    ========================== */

    thumbnail: {
      type: String,
      default: "",
    },

    pages: {
      type: Number,
      default: 0,
    },

    duration: {
      type: Number,
      default: 0,
    },

    resolution: {
      type: String,
      default: "",
    },

    /* ==========================
       Status
    ========================== */

    favorite: {
      type: Boolean,
      default: false,
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    archived: {
      type: Boolean,
      default: false,
    },

    deleted: {
      type: Boolean,
      default: false,
    },

    /* ==========================
       Analytics
    ========================== */

    views: {
      type: Number,
      default: 0,
    },

    downloads: {
      type: Number,
      default: 0,
    },

    shares: {
      type: Number,
      default: 0,
    },

    aiChats: {
      type: Number,
      default: 0,
    },

    lastOpened: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
