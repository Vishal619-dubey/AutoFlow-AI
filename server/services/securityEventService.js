const crypto = require("crypto");
const SecurityEvent = require("../models/SecurityEvent");
const recordSecurityEvent = async ({ req, user, document, type, outcome, severity = "info", message, metadata = {} }) => {
  try { const ip = req?.ip || req?.socket?.remoteAddress || "unknown"; const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16); return await SecurityEvent.create({ user: user || null, document: document || null, type, outcome, severity, message, ipHash, metadata }); }
  catch (error) { console.error("Security event logging failed:", error.message); return null; }
};
module.exports = { recordSecurityEvent };
