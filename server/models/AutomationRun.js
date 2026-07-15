const mongoose = require("mongoose");

const automationRunSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutomationRule",
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    trigger: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    details: {
      type: String,
      default: "Automation completed successfully",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutomationRun", automationRunSchema);
