const mongoose = require("mongoose");
const securityEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }, document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", default: null, index: true },
  type: { type: String, required: true, index: true }, outcome: { type: String, enum: ["allowed", "blocked", "warning"], required: true }, severity: { type: String, enum: ["info", "low", "medium", "high", "critical"], default: "info" },
  message: { type: String, required: true, maxlength: 500 }, ipHash: { type: String, default: "" }, metadata: { type: Object, default: () => ({}) },
}, { timestamps: true });
module.exports = mongoose.model("SecurityEvent", securityEventSchema);
