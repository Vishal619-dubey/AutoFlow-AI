const express = require("express");
const fs = require("fs");
const Document = require("../models/Document");
const { protect } = require("../middleware/authMiddleware");
const { addActivity } = require("../controllers/activityController");
const { getEvidenceProfile } = require("../controllers/evidenceController");
const { decryptFile, verifyDocumentIntegrity } = require("../services/documentSecurityService");
const { recordSecurityEvent } = require("../services/securityEventService");

const router = express.Router();
router.use(protect);

const owned = (req, extra = {}) => ({ _id: req.params.id, uploadedBy: req.user._id, ...extra });

router.get("/", async (req, res) => {
  try {
    const { status = "active", search = "", type = "" } = req.query;
    const query = { uploadedBy: req.user._id, deleted: status === "trash" };
    if (status === "favorites") query.favorite = true;
    if (status === "pinned") query.pinned = true;
    if (type) query.fileType = type.toLowerCase();
    if (search.trim()) query.$or = [
      { filename: { $regex: search.trim(), $options: "i" } },
      { tags: { $regex: search.trim(), $options: "i" } },
      { content: { $regex: search.trim(), $options: "i" } },
    ];
    return res.json(await Document.find(query)
      .select("-content -filepath -security.plaintextHash -security.encryptedHash -security.iv")
      .sort({ createdAt: -1 }));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/evidence/:id", getEvidenceProfile);

router.get("/view/:id", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: false }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (!document.filepath || !fs.existsSync(document.filepath)) return res.status(404).json({ success: false, message: "Document file is unavailable" });
    const verification = verifyDocumentIntegrity(document);
    if (!verification.valid) {
      document.security = { ...document.security, integrityStatus: verification.status, lastVerifiedAt: new Date(), trustScore: 0, trustGrade: "restricted" };
      await document.save();
      await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "integrity", outcome: "blocked", severity: "critical", message: verification.reason });
      return res.status(409).json({ success: false, message: "Document integrity verification failed. Access blocked." });
    }
    document.views += 1;
    document.lastOpened = new Date();
    await document.save();
    res.type(document.mimeType || "application/octet-stream");
    return res.send(decryptFile(document.filepath));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/download/:id", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: false }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (!document.filepath || !fs.existsSync(document.filepath)) return res.status(404).json({ success: false, message: "Document file is unavailable" });
    const verification = verifyDocumentIntegrity(document);
    if (!verification.valid) {
      document.security = { ...document.security, integrityStatus: verification.status, lastVerifiedAt: new Date(), trustScore: 0, trustGrade: "restricted" };
      await document.save();
      await recordSecurityEvent({ req, user: req.user._id, document: document._id, type: "integrity", outcome: "blocked", severity: "critical", message: verification.reason });
      return res.status(409).json({ success: false, message: "Document integrity verification failed. Download blocked." });
    }
    document.downloads += 1;
    await document.save();
    res.setHeader("X-Document-Name", document.filename);
    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
    return res.send(decryptFile(document.filepath));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/favorite/:id", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: false }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    document.favorite = !document.favorite;
    await document.save();
    await addActivity(document.favorite ? "Added to Favorites" : "Removed from Favorites", document.filename, "star", "yellow", req.user._id);
    return res.json({ success: true, favorite: document.favorite });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/pin/:id", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: false }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    document.pinned = !document.pinned;
    await document.save();
    await addActivity(document.pinned ? "Pinned Document" : "Unpinned Document", document.filename, "pin", "indigo", req.user._id);
    return res.json({ success: true, pinned: document.pinned });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: false }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    document.deleted = true;
    document.favorite = false;
    document.pinned = false;
    await document.save();
    await addActivity("Moved to Trash", document.filename, "trash", "red", req.user._id);
    return res.json({ success: true, message: "Document moved to Trash" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id/restore", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: true }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found in Trash" });
    document.deleted = false;
    await document.save();
    await addActivity("Restored Document", document.filename, "restore", "green", req.user._id);
    return res.json({ success: true, message: "Document restored" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id/permanent", async (req, res) => {
  try {
    const document = await Document.findOne(owned(req, { deleted: true }));
    if (!document) return res.status(404).json({ success: false, message: "Document not found in Trash" });
    if (document.filepath && fs.existsSync(document.filepath)) fs.unlinkSync(document.filepath);
    await document.deleteOne();
    await addActivity("Permanently Deleted", document.filename, "trash", "red", req.user._id);
    return res.json({ success: true, message: "Document permanently deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
