const categoryRules = [
  { category: "Finance", words: ["invoice", "payment", "amount", "gst", "tax", "budget"] },
  { category: "Legal", words: ["agreement", "contract", "clause", "legal", "party", "terms"] },
  { category: "Academic", words: ["research", "student", "university", "chapter", "study", "exam"] },
  { category: "Human Resources", words: ["employee", "leave", "salary", "candidate", "resume", "interview"] },
  { category: "Operations", words: ["shipment", "inventory", "vendor", "purchase", "delivery", "order"] },
];

const priorityWords = {
  critical: ["critical", "immediately", "overdue", "breach"],
  high: ["urgent", "deadline", "required", "pending", "action needed"],
};

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function extractTasks(text) {
  return text
    .split(/[.\n]/)
    .map((line) => line.trim())
    .filter((line) => /\b(must|should|need to|required to|action|submit|review|approve)\b/i.test(line))
    .slice(0, 5);
}

function analyzeDocument({ filename = "", content = "" }) {
  const text = `${filename} ${content}`.toLowerCase();
  const match = categoryRules.find((rule) => includesAny(text, rule.words));
  const classification = match?.category || "General";
  const priority = includesAny(text, priorityWords.critical)
    ? "critical"
    : includesAny(text, priorityWords.high)
      ? "high"
      : "medium";
  const extractedTasks = extractTasks(content);
  const automationScore = Math.min(
    98,
    55 + (match ? 20 : 0) + (extractedTasks.length * 4) + (priority === "critical" ? 8 : 0)
  );

  return {
    classification,
    category: classification,
    priority,
    extractedTasks,
    automationScore,
    workflowStatus: priority === "critical" || priority === "high" ? "review" : "processed",
  };
}

module.exports = { analyzeDocument };
