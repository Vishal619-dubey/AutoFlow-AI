const crypto = require("crypto");
const fs = require("fs");
const pdfParse = require("pdf-parse");

/* =====================================================
   Extract PDF From Buffer
===================================================== */

async function extractPageAwarePdfFromBuffer(buffer) {
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const textContent =
        await pageData.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });

      const text = textContent.items
        .map((item) => item.str)
        .join(" ");

      return `[PAGE ${pageData.pageNumber}]\n${text}`;
    },
  });

  return {
    content: parsed.text || "",
    pages: parsed.numpages || 0,
  };
}

/* =====================================================
   Legacy Local PDF Extraction
===================================================== */

async function extractPageAwarePdf(filepath) {
  const buffer = fs.readFileSync(filepath);

  return extractPageAwarePdfFromBuffer(
    buffer
  );
}

/* =====================================================
   Ensure Page-Aware Content

   plaintextBuffer is supplied for S3 PDFs.
===================================================== */

async function ensurePageAwareContent(
  document,
  plaintextBuffer = null
) {
  if (
    document.fileType === "pdf" &&
    !/\[PAGE \d+\]/.test(
      document.content || ""
    )
  ) {
    try {
      let parsed;

      if (
        plaintextBuffer &&
        Buffer.isBuffer(plaintextBuffer)
      ) {
        parsed =
          await extractPageAwarePdfFromBuffer(
            plaintextBuffer
          );
      } else if (
        document.filepath &&
        fs.existsSync(document.filepath)
      ) {
        parsed =
          await extractPageAwarePdf(
            document.filepath
          );
      }

      if (parsed) {
        document.content =
          parsed.content;

        document.pages =
          parsed.pages;

        await document.save();
      }
    } catch (error) {
      console.warn(
        "Evidence page indexing skipped:",
        error.message
      );
    }
  }

  if (
    document.fileType === "txt" &&
    !/\[PAGE \d+\]/.test(
      document.content || ""
    )
  ) {
    document.content =
      `[PAGE 1]\n${document.content || ""}`;

    document.pages = 1;

    await document.save();
  }

  return document.content || "";
}

/* =====================================================
   SHA-256
===================================================== */

function hashBuffer(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function hashFile(filepath) {
  return new Promise(
    (resolve, reject) => {
      const hash =
        crypto.createHash("sha256");

      const stream =
        fs.createReadStream(filepath);

      stream.on(
        "data",
        (chunk) => hash.update(chunk)
      );

      stream.on(
        "error",
        reject
      );

      stream.on("end", () =>
        resolve(
          hash.digest("hex")
        )
      );
    }
  );
}

/* =====================================================
   Evidence Helpers
===================================================== */

function splitPages(content = "") {
  const matches = [
    ...content.matchAll(
      /\[PAGE (\d+)\]\s*([\s\S]*?)(?=\[PAGE \d+\]|$)/g
    ),
  ];

  if (!matches.length) {
    return [
      {
        page: null,
        text: content,
      },
    ];
  }

  return matches.map(
    (match) => ({
      page: Number(match[1]),
      text:
        match[2].trim(),
    })
  );
}

function clean(value = "") {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function unique(
  items,
  limit = 6
) {
  const seen = new Set();

  return items
    .filter((item) => {
      const key =
        item.text.toLowerCase();

      if (
        !key ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/* =====================================================
   Build Evidence Insights
===================================================== */

function buildEvidenceInsights(
  content = ""
) {
  const pages =
    splitPages(content);

  const risks = [];
  const deadlines = [];
  const amounts = [];
  const decisions = [];

  const riskPattern =
    /\b(risk|penalty|breach|overdue|urgent|critical|warning|liability|terminate|failure)\b/i;

  const decisionPattern =
    /\b(must|shall|required|approve|decision|recommend|action|submit|complete|review)\b/i;

  const datePattern =
    /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4})\b/gi;

  const amountPattern =
    /(?:₹|INR\s?|Rs\.?\s?)\d[\d,]*(?:\.\d{1,2})?/gi;

  for (const page of pages) {
    const sentences =
      page.text
        .split(
          /(?<=[.!?])\s+|\n+/
        )
        .map(clean)
        .filter(
          (line) =>
            line.length > 12
        );

    for (
      const sentence of
      sentences
    ) {
      if (
        riskPattern.test(
          sentence
        )
      ) {
        risks.push({
          text: sentence,
          page: page.page,
        });
      }

      if (
        decisionPattern.test(
          sentence
        )
      ) {
        decisions.push({
          text: sentence,
          page: page.page,
        });
      }
    }

    for (
      const match of
      page.text.match(
        datePattern
      ) || []
    ) {
      deadlines.push({
        text: match,
        page: page.page,
      });
    }

    for (
      const match of
      page.text.match(
        amountPattern
      ) || []
    ) {
      amounts.push({
        text: match,
        page: page.page,
      });
    }
  }

  return {
    risks:
      unique(risks),

    deadlines:
      unique(deadlines),

    amounts:
      unique(amounts),

    decisions:
      unique(decisions),
  };
}

module.exports = {
  buildEvidenceInsights,
  ensurePageAwareContent,
  extractPageAwarePdf,
  extractPageAwarePdfFromBuffer,
  hashFile,
  hashBuffer,
};