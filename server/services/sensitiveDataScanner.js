const patterns = [
  {
    type: "Email Address",
    weight: 8,
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "Indian Phone Number",
    weight: 10,
    regex: /(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
  },
  {
    type: "Aadhaar Number",
    weight: 30,
    regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  },
  {
    type: "PAN Number",
    weight: 25,
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  },
  {
    type: "Payment Card Number",
    weight: 35,
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
  },
];

function maskValue(value = "") {
  const clean = value.trim();
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, 2)}${"*".repeat(Math.min(10, clean.length - 4))}${clean.slice(-2)}`;
}

function scanSensitiveData(text = "") {
  const findings = [];
  let riskScore = 0;

  for (const pattern of patterns) {
    const matches = [...new Set(text.match(pattern.regex) || [])];
    if (!matches.length) continue;

    findings.push({
      type: pattern.type,
      count: matches.length,
      samples: matches.slice(0, 3).map(maskValue),
    });

    riskScore += pattern.weight + Math.min(15, (matches.length - 1) * 3);
  }

  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 60 ? "critical" : riskScore >= 30 ? "high" : riskScore > 0 ? "medium" : "safe";

  return {
    scannedAt: new Date(),
    riskLevel,
    riskScore,
    totalFindings: findings.reduce((sum, finding) => sum + finding.count, 0),
    findings,
  };
}

module.exports = { scanSensitiveData };
