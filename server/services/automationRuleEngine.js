const AutomationRule = require("../models/AutomationRule");
const AutomationRun = require("../models/AutomationRun");
const Activity = require("../models/Activity");
const { createNotification } = require("./notificationService");

function conditionMatches(rule, document) {
  switch (rule.condition) {
    case "Category is Finance":
      return document.classification === "Finance";
    case "Priority is Critical":
      return document.priority === "critical";
    case "Any document":
    default:
      return true;
  }
}

function applyAction(rule, document) {
  switch (rule.action) {
    case "Send for approval":
      document.workflowStatus = "review";
      return "Document routed to the approval queue";
    case "Extract action items":
      return `${document.extractedTasks?.length || 0} action items extracted`;
    case "Classify and prioritize":
    default:
      return `Classified as ${document.classification} with ${document.priority} priority`;
  }
}

async function runAutomationRules({ document, userId, trigger }) {
  const rules = await AutomationRule.find({
    createdBy: userId,
    enabled: true,
    trigger,
  });

  const matchedRules = rules.filter((rule) => conditionMatches(rule, document));

  for (const rule of matchedRules) {
    try {
      const details = applyAction(rule, document);

      rule.runs += 1;
      await rule.save();

      await AutomationRun.create({
        user: userId,
        rule: rule._id,
        ruleName: rule.name,
        document: document._id,
        documentName: document.filename,
        trigger,
        action: rule.action,
        status: "success",
        details,
      });

      await Activity.create({
        uploadedBy: userId,
        action: `Automation: ${rule.name}`,
        fileName: document.filename,
        icon: "workflow",
        color: "indigo",
      });

      await createNotification({
        user: userId,
        type: "automation",
        title: `Automation executed: ${rule.name}`,
        message: `${details} for ${document.filename}.`,
        document: document._id,
        actionPath: "/audit",
      });
    } catch (error) {
      await AutomationRun.create({
        user: userId,
        rule: rule._id,
        ruleName: rule.name,
        document: document._id,
        documentName: document.filename,
        trigger,
        action: rule.action,
        status: "failed",
        details: error.message,
      });
      await createNotification({
        user: userId,
        type: "automation",
        title: `Automation failed: ${rule.name}`,
        message: `${document.filename}: ${error.message}`,
        document: document._id,
        actionPath: "/audit",
      });
    }
  }

  if (matchedRules.length > 0) {
    await document.save();
  }

  return matchedRules.length;
}

module.exports = { runAutomationRules };
