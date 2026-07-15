const express = require("express");

const router = express.Router();

const {
  generateKnowledgeGraph,
} = require("../controllers/knowledgeController");

router.post("/:id", generateKnowledgeGraph);

module.exports = router;