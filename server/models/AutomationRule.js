const mongoose = require("mongoose");

const automationRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    trigger: { type: String, required: true, trim: true },
    condition: { type: String, default: "Any document" },
    action: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    runs: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutomationRule", automationRuleSchema);
