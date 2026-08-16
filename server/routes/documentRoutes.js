const express = require("express");
const fs = require("fs");

const Document = require("../models/Document");
const { protect } = require("../middleware/authMiddleware");
const { addActivity } = require("../controllers/activityController");
const { getEvidenceProfile } = require("../controllers/evidenceController");

const {
  decryptFile,
  decryptBuffer,
  verifyDocumentIntegrity,
  verifyDocumentIntegrityBuffer,
} = require("../services/documentSecurityService");

const {
  getDocumentBuffer,
  deleteDocument,
  documentExists,
} = require("../services/s3StorageService");

const {
  recordSecurityEvent,
} = require("../services/securityEventService");

const router = express.Router();

router.use(protect);

/* =====================================
   Ownership helper
===================================== */

const owned = (req, extra = {}) => ({
  _id: req.params.id,
  uploadedBy: req.user._id,
  ...extra,
});

/* =====================================
   Mark missing document
===================================== */

async function markDocumentMissing(document) {
  document.storageStatus = "missing";

  document.security = {
    ...document.security,
    integrityStatus: "missing",
    lastVerifiedAt: new Date(),
    trustScore: 0,
    trustGrade: "restricted",
  };

  await document.save();
}

/* =====================================
   Load encrypted file
   Supports S3 + legacy local storage
===================================== */

async function loadEncryptedDocument(document) {
  /* -----------------------------
     New AWS S3 documents
  ----------------------------- */

  if (document.storageProvider === "s3") {
    if (!document.s3Key) {
      await markDocumentMissing(document);

      return {
        available: false,
        reason: "S3 storage key is missing",
      };
    }

    const exists = await documentExists(
      document.s3Key
    );

    if (!exists) {
      await markDocumentMissing(document);

      return {
        available: false,
        reason:
          "Stored S3 file is unavailable",
      };
    }

    const encryptedBuffer =
      await getDocumentBuffer(
        document.s3Key
      );

    return {
      available: true,
      provider: "s3",
      encryptedBuffer,
    };
  }

  /* -----------------------------
     Legacy Render/local documents
  ----------------------------- */

  if (
    !document.filepath ||
    !fs.existsSync(document.filepath)
  ) {
    await markDocumentMissing(document);

    return {
      available: false,
      reason:
        "Legacy local file is unavailable",
    };
  }

  return {
    available: true,
    provider: "local",
    filepath: document.filepath,
  };
}

/* =====================================
   Integrity verification
===================================== */

function verifyLoadedDocument(
  document,
  loaded
) {
  if (loaded.provider === "s3") {
    return verifyDocumentIntegrityBuffer(
      document,
      loaded.encryptedBuffer
    );
  }

  return verifyDocumentIntegrity(
    document
  );
}

/* =====================================
   Decrypt loaded document
===================================== */

function decryptLoadedDocument(loaded) {
  if (loaded.provider === "s3") {
    return decryptBuffer(
      loaded.encryptedBuffer
    );
  }

  return decryptFile(
    loaded.filepath
  );
}

/* =====================================
   Document List
===================================== */

router.get("/", async (req, res) => {
  try {
    const {
      status = "active",
      search = "",
      type = "",
    } = req.query;

    const query = {
      uploadedBy: req.user._id,
      deleted: status === "trash",
    };

    if (status === "favorites") {
      query.favorite = true;
    }

    if (status === "pinned") {
      query.pinned = true;
    }

    if (type) {
      query.fileType =
        type.toLowerCase();
    }

    if (search.trim()) {
      query.$or = [
        {
          filename: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          tags: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          content: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const documents =
      await Document.find(query)
        .select(
          "-content -filepath -s3Key -security.plaintextHash -security.encryptedHash -security.iv"
        )
        .sort({
          createdAt: -1,
        });

    return res.json(documents);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =====================================
   Evidence
===================================== */

router.get(
  "/evidence/:id",
  getEvidenceProfile
);

/* =====================================
   Secure View
===================================== */

router.get(
  "/view/:id",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: false,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      const loaded =
        await loadEncryptedDocument(
          document
        );

      if (!loaded.available) {
        await recordSecurityEvent({
          req,
          user: req.user._id,
          document: document._id,
          type: "integrity",
          outcome: "blocked",
          severity: "high",
          message:
            "Document file unavailable. Re-upload required.",
        });

        return res.status(404).json({
          success: false,
          code: "FILE_UNAVAILABLE",
          message:
            "Document file is unavailable. Please re-upload the original file.",
        });
      }

      const verification =
        verifyLoadedDocument(
          document,
          loaded
        );

      if (!verification.valid) {
        document.security = {
          ...document.security,
          integrityStatus:
            verification.status,
          lastVerifiedAt:
            new Date(),
          trustScore: 0,
          trustGrade:
            "restricted",
        };

        await document.save();

        await recordSecurityEvent({
          req,
          user: req.user._id,
          document: document._id,
          type: "integrity",
          outcome: "blocked",
          severity: "critical",
          message:
            verification.reason,
        });

        return res.status(409).json({
          success: false,
          message:
            "Document integrity verification failed. Access blocked.",
        });
      }

      const plaintext =
        decryptLoadedDocument(
          loaded
        );

      document.views += 1;
      document.lastOpened =
        new Date();

      document.storageStatus =
        "available";

      document.security = {
        ...document.security,
        integrityStatus:
          "verified",
        lastVerifiedAt:
          new Date(),
      };

      await document.save();

      res.setHeader(
        "Content-Type",
        document.mimeType ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Length",
        plaintext.length
      );

      return res.send(
        plaintext
      );
    } catch (error) {
      console.error(
        "Document view error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Secure Download
===================================== */

router.get(
  "/download/:id",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: false,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      const loaded =
        await loadEncryptedDocument(
          document
        );

      if (!loaded.available) {
        await recordSecurityEvent({
          req,
          user: req.user._id,
          document: document._id,
          type: "integrity",
          outcome: "blocked",
          severity: "high",
          message:
            "Download failed because stored file is unavailable",
        });

        return res.status(404).json({
          success: false,
          code: "FILE_UNAVAILABLE",
          message:
            "Document file is unavailable. Please re-upload the original file.",
        });
      }

      const verification =
        verifyLoadedDocument(
          document,
          loaded
        );

      if (!verification.valid) {
        document.security = {
          ...document.security,
          integrityStatus:
            verification.status,
          lastVerifiedAt:
            new Date(),
          trustScore: 0,
          trustGrade:
            "restricted",
        };

        await document.save();

        await recordSecurityEvent({
          req,
          user: req.user._id,
          document: document._id,
          type: "integrity",
          outcome: "blocked",
          severity: "critical",
          message:
            verification.reason,
        });

        return res.status(409).json({
          success: false,
          message:
            "Document integrity verification failed. Download blocked.",
        });
      }

      const plaintext =
        decryptLoadedDocument(
          loaded
        );

      document.downloads += 1;

      document.storageStatus =
        "available";

      document.security = {
        ...document.security,
        integrityStatus:
          "verified",
        lastVerifiedAt:
          new Date(),
      };

      await document.save();

      res.setHeader(
        "X-Document-Name",
        document.filename
      );

      res.setHeader(
        "Content-Type",
        document.mimeType ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Length",
        plaintext.length
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(
          document.filename
        )}`
      );

      return res.send(
        plaintext
      );
    } catch (error) {
      console.error(
        "Document download error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Favorite
===================================== */

router.put(
  "/favorite/:id",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: false,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      document.favorite =
        !document.favorite;

      await document.save();

      await addActivity(
        document.favorite
          ? "Added to Favorites"
          : "Removed from Favorites",
        document.filename,
        "star",
        "yellow",
        req.user._id
      );

      return res.json({
        success: true,
        favorite:
          document.favorite,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Pin
===================================== */

router.put(
  "/pin/:id",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: false,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      document.pinned =
        !document.pinned;

      await document.save();

      await addActivity(
        document.pinned
          ? "Pinned Document"
          : "Unpinned Document",
        document.filename,
        "pin",
        "indigo",
        req.user._id
      );

      return res.json({
        success: true,
        pinned:
          document.pinned,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Move To Trash
===================================== */

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: false,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      document.deleted = true;
      document.favorite = false;
      document.pinned = false;

      await document.save();

      await addActivity(
        "Moved to Trash",
        document.filename,
        "trash",
        "red",
        req.user._id
      );

      return res.json({
        success: true,
        message:
          "Document moved to Trash",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Restore
===================================== */

router.put(
  "/:id/restore",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: true,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found in Trash",
        });
      }

      document.deleted = false;

      await document.save();

      await addActivity(
        "Restored Document",
        document.filename,
        "restore",
        "green",
        req.user._id
      );

      return res.json({
        success: true,
        message:
          "Document restored",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =====================================
   Permanent Delete

   S3 object is removed here.
===================================== */

router.delete(
  "/:id/permanent",
  async (req, res) => {
    try {
      const document =
        await Document.findOne(
          owned(req, {
            deleted: true,
          })
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found in Trash",
        });
      }

      /* -----------------------------
         AWS S3 delete
      ----------------------------- */

      if (
        document.storageProvider ===
          "s3" &&
        document.s3Key
      ) {
        try {
          await deleteDocument(
            document.s3Key
          );
        } catch (error) {
          console.error(
            "S3 permanent delete error:",
            error.message
          );

          return res.status(502).json({
            success: false,
            message:
              "Unable to remove the stored S3 document. Database record was preserved.",
          });
        }
      }

      /* -----------------------------
         Legacy local delete
      ----------------------------- */

      if (
        document.storageProvider !==
          "s3" &&
        document.filepath &&
        fs.existsSync(
          document.filepath
        )
      ) {
        fs.unlinkSync(
          document.filepath
        );
      }

      await document.deleteOne();

      await addActivity(
        "Permanently Deleted",
        document.filename,
        "trash",
        "red",
        req.user._id
      );

      return res.json({
        success: true,
        message:
          "Document permanently deleted",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;