const test = require("node:test");
const assert = require("node:assert/strict");

const {
  chunkDocument,
  sampleDocumentContent,
  selectRelevantContext,
} = require("../services/groqService");

/* =====================================================
   Chunking
===================================================== */

test("chunkDocument splits long documents with overlap", () => {
  const text = "A".repeat(10000);

  const chunks = chunkDocument(
    text,
    3500,
    500
  );

  assert.ok(chunks.length > 1);

  assert.equal(
    chunks[0].text.length,
    3500
  );

  assert.equal(
    chunks[0].index,
    0
  );

  assert.equal(
    chunks[1].index,
    1
  );
});

/* =====================================================
   Representative document sampling
===================================================== */

test("sampleDocumentContent covers more than document beginning", () => {
  const beginning =
    "BEGINNING_SECTION ".repeat(1000);

  const middle =
    "MIDDLE_SECTION ".repeat(1000);

  const ending =
    "ENDING_SECTION ".repeat(1000);

  const text =
    beginning + middle + ending;

  const sampled =
    sampleDocumentContent(
      text,
      12000
    );

  assert.ok(
    sampled.includes(
      "BEGINNING_SECTION"
    )
  );

  assert.ok(
    sampled.includes(
      "MIDDLE_SECTION"
    ) ||
      sampled.includes(
        "ENDING_SECTION"
      )
  );

  assert.ok(sampled.length <= 12500);
});

/* =====================================================
   Question-aware retrieval
===================================================== */

test("selectRelevantContext finds information near end of long document", () => {
  const filler =
    "General administrative information. "
      .repeat(1000);

  const important =
    `
[PAGE 42]

The final project submission deadline is
15 December 2026.

Students must submit the project before
the stated deadline.
`;

  const text =
    filler + important;

  const context =
    selectRelevantContext(
      text,
      "What is the final project submission deadline?"
    );

  assert.ok(
    context.includes(
      "15 December 2026"
    )
  );

  assert.ok(
    context.includes("[PAGE 42]")
  );
});

/* =====================================================
   Safe fallback
===================================================== */

test("selectRelevantContext returns representative context when no keywords match", () => {
  const text =
    "First section ".repeat(1000) +
    "Middle section ".repeat(1000) +
    "Final section ".repeat(1000);

  const context =
    selectRelevantContext(
      text,
      "xyzunrelatedterm"
    );

  assert.ok(context.length > 0);

  assert.ok(
    context.includes(
      "[DOCUMENT SECTION]"
    )
  );
});
