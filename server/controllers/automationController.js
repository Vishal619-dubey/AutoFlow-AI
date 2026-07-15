const Document = require("../models/Document");
const AutomationRule = require("../models/AutomationRule");
const { analyzeDocument } = require("../services/documentAutomationService");
const AutomationRun = require("../models/AutomationRun");
const { runAutomationRules } = require("../services/automationRuleEngine");
const { parseAutomationInstruction } = require("../services/groqService");
const { createNotification } = require("../services/notificationService");

function localRuleParser(description = "") {
  const text = description.toLowerCase();

  const trigger = text.includes("approval completed") || text.includes("after approval")
    ? "Approval completed"
    : text.includes("urgent") || text.includes("critical") || text.includes("high priority")
      ? "High priority detected"
      : "Document uploaded";

  const condition = text.includes("finance") || text.includes("invoice") || text.includes("payment")
    ? "Category is Finance"
    : text.includes("critical")
      ? "Priority is Critical"
      : "Any document";

  const action = text.includes("approv") || text.includes("review")
    ? "Send for approval"
    : text.includes("task") || text.includes("action item")
      ? "Extract action items"
      : "Classify and prioritize";

  return {
    name: text.includes("invoice") ? "Smart Invoice Workflow" : "AI Generated Workflow",
    trigger,
    condition,
    action,
  };
}

exports.parseNaturalLanguageRule = async (req, res) => {
  const { description } = req.body;

  if (!description?.trim()) {
    return res.status(400).json({ success: false, message: "Describe the automation you want to create" });
  }

  try {
    let rule;
    let source = "groq";

    try {
      rule = await parseAutomationInstruction(description);
    } catch (error) {
      console.warn("AI Rule Parser Fallback:", error.message);
      rule = localRuleParser(description);
      source = "local";
    }

    const allowed = {
      trigger: ["Document uploaded", "High priority detected", "Approval completed"],
      condition: ["Any document", "Category is Finance", "Priority is Critical"],
      action: ["Classify and prioritize", "Send for approval", "Extract action items"],
    };

    if (!allowed.trigger.includes(rule.trigger)) rule.trigger = "Document uploaded";
    if (!allowed.condition.includes(rule.condition)) rule.condition = "Any document";
    if (!allowed.action.includes(rule.action)) rule.action = "Classify and prioritize";

    return res.json({ success: true, source, rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const owner = { uploadedBy: req.user._id, deleted: false };
    const [documents, rules] = await Promise.all([
      Document.find(owner).sort({ createdAt: -1 }),
      AutomationRule.find({ createdBy: req.user._id }).sort({ createdAt: -1 }),
    ]);

    const processed = documents.filter((doc) => doc.automationScore > 0).length;
    const needsReview = documents.filter((doc) => doc.workflowStatus === "review").length;
    const approved = documents.filter((doc) => doc.workflowStatus === "approved").length;
    const timeSavedMinutes = processed * 12;

    return res.json({
      success: true,
      metrics: {
        documents: documents.length,
        processed,
        needsReview,
        approved,
        activeRules: rules.filter((rule) => rule.enabled).length,
        timeSavedMinutes,
      },
      recentDocuments: documents.slice(0, 6),
      rules: rules.slice(0, 5),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.reprocessDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      deleted: false,
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    Object.assign(document, analyzeDocument(document));
    await document.save();
    await createNotification({ user: req.user._id, type: "automation", title: "Document automation completed", message: `${document.filename} was reclassified and prioritized successfully.`, document: document._id, actionPath: "/documents" });
    return res.json({ success: true, message: "Automation completed", document });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const allowed = ["review", "approved", "rejected"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid review status" });
    }
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user._id, deleted: false },
      { workflowStatus: req.body.status },
      { new: true }
    );
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });

    if (req.body.status === "approved") {
      await runAutomationRules({
        document,
        userId: req.user._id,
        trigger: "Approval completed",
      });
    }

    await createNotification({
      user: req.user._id,
      type: "approval",
      title: `Document ${req.body.status}`,
      message: `${document.filename} was ${req.body.status} by ${req.user.name}.`,
      document: document._id,
      actionPath: "/approvals",
    });

    return res.json({ success: true, document });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listRuns = async (req, res) => {
  try {
    const runs = await AutomationRun.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json(runs);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listRules = async (req, res) => {
  const rules = await AutomationRule.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  return res.json(rules);
};

exports.createRule = async (req, res) => {
  try {
    const { name, trigger, condition, action } = req.body;
    if (!name || !trigger || !action) {
      return res.status(400).json({ success: false, message: "Name, trigger and action are required" });
    }
    const rule = await AutomationRule.create({ name, trigger, condition, action, createdBy: req.user._id });
    return res.status(201).json({ success: true, rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleRule = async (req, res) => {
  const rule = await AutomationRule.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
  rule.enabled = !rule.enabled;
  await rule.save();
  return res.json({ success: true, rule });
};

exports.deleteRule = async (req, res) => {
  const rule = await AutomationRule.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });
  return res.json({ success: true, message: "Rule deleted" });
};
