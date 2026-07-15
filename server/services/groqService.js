const Groq = require("groq-sdk");

let groqClient;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "Optional AI service is not configured. Add GROQ_API_KEY to use summaries and PDF chat."
    );
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
}

/* =====================================================
   Generate AI Summary
===================================================== */

async function generateSummary(text) {
  try {
    if (!text || text.trim() === "") {
      throw new Error("No text provided for summary.");
    }

    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
You are an expert AI assistant.

Summarize documents in:

• Bullet Points
• Simple English
• Important Topics
• Key Takeaways
• Maximum 250 words

Never hallucinate.
`,
        },
        {
          role: "user",
          content: text.substring(0, 12000),
        },
      ],

      temperature: 0.3,
      max_tokens: 700,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq Summary Error:", err.message);
    throw err;
  }
}

/* =====================================================
   Chat with PDF
===================================================== */

async function chatWithPdf(pdfContent, question) {
  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
You are AutoFlow Evidence Copilot.

Rules:

1. Answer ONLY using the uploaded PDF.
2. Never make up information.
3. If answer doesn't exist, say:

"This information is not available in the uploaded PDF."

4. Explain in simple language.
5. Give short but useful answers.
6. The PDF text may contain markers like [PAGE 4]. Cite supporting pages after factual claims using [Page 4].
7. Never invent a page number. If page markers are unavailable, answer without a citation.
`,
        },

        {
          role: "user",
          content: `
PDF:

${pdfContent.substring(0, 12000)}

------------------------

Question:

${question}
`,
        },
      ],

      temperature: 0.2,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq Chat Error:", err.message);
    throw err;
  }
}

/* =====================================================
   Generate Quiz
===================================================== */

async function generateQuiz(text) {
  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
Generate 10 MCQs.

Return ONLY JSON.

Example:

[
 {
   "question":"",
   "options":["","","",""],
   "answer":""
 }
]
`,
        },

        {
          role: "user",
          content: text.substring(0, 12000),
        },
      ],

      temperature: 0.4,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq Quiz Error:", err.message);
    throw err;
  }
}

/* =====================================================
   Flashcards
===================================================== */

async function generateFlashcards(text) {
  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
Generate flashcards.

Return JSON only.

Example:

[
 {
   "front":"What is AI?",
   "back":"Artificial Intelligence"
 }
]
`,
        },

        {
          role: "user",
          content: text.substring(0, 12000),
        },
      ],

      temperature: 0.3,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq Flashcard Error:", err.message);
    throw err;
  }
}

async function parseAutomationInstruction(description) {
  if (!description?.trim()) {
    throw new Error("Automation instruction is required");
  }

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
Convert a document automation instruction into JSON.
Return JSON only, without markdown.

Allowed trigger values:
- Document uploaded
- High priority detected
- Approval completed

Allowed condition values:
- Any document
- Category is Finance
- Priority is Critical

Allowed action values:
- Classify and prioritize
- Send for approval
- Extract action items

Required JSON shape:
{
  "name": "short professional workflow name",
  "trigger": "one allowed trigger",
  "condition": "one allowed condition",
  "action": "one allowed action"
}
`,
      },
      { role: "user", content: description.trim() },
    ],
    temperature: 0.1,
    max_tokens: 250,
  });

  const content = completion.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned);
}

/* =====================================================
   Export
===================================================== */

module.exports = {
  generateSummary,
  chatWithPdf,
  generateQuiz,
  generateFlashcards,
  parseAutomationInstruction,
};
