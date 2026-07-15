# AutoFlow AI — Resume and Interview Guide

## Recommended Resume Project Entry

### AutoFlow AI — Intelligent Document Workflow Automation Platform

**React, Node.js, Express, MongoDB, Mongoose, JWT, Groq, REST APIs**

- Built a full-stack document operations platform that classifies uploaded files, detects priority, extracts action items and executes configurable trigger–condition–action workflows.
- Designed a human-in-the-loop approval system with persistent audit records, user-isolated data access and MongoDB-backed notifications for high-risk document operations.
- Developed a privacy scanner for Aadhaar, PAN, payment card, phone and email patterns with masked API results and document-level risk scoring.
- Implemented a secure PDF Evidence Studio with authenticated streaming, source-linked insights, SHA-256 integrity verification and grounded document Q&A.
- Added natural-language workflow generation with Groq and a deterministic local fallback so core automation remains available without an external AI API.
- Delivered a responsive SaaS interface with a `Ctrl + K` command palette, professional profile management, Trash recovery and printable executive reports.

Use the strongest three or four bullets that fit the job description. Do not place all bullets in a one-page resume.

## Compact One-Line Description

Built a MERN-based AI document automation platform with grounded PDF intelligence, no-code workflows, human approvals, PII risk scanning, audit trails and secure evidence verification.

## Portfolio Description

AutoFlow AI turns uploaded business documents into auditable operational workflows. It combines deterministic classification and rule execution with optional Groq intelligence, while maintaining human approval for high-risk decisions and user-level data isolation across documents, notifications and automation history.

## Skills Demonstrated

### Frontend

- React component architecture and route-based application design
- Protected routes and JWT session handling
- Responsive dashboard and reusable design system
- Keyboard-accessible command palette
- Blob-based secure PDF rendering and downloading
- Print-specific report layouts

### Backend

- REST API design with Express
- Authentication middleware and ownership authorization
- Multer uploads and filesystem lifecycle management
- Modular services for automation, privacy and evidence
- Error handling and graceful third-party API fallback

### Database

- Mongoose schemas and references
- User-scoped queries
- Soft-delete lifecycle
- Persistent automation audit and notification history
- Compound indexes for timeline queries

### AI and Automation

- Grounded document Q&A
- Natural-language to structured workflow conversion
- Deterministic local classification
- Trigger–condition–action rule execution
- Human-in-the-loop approval design
- Evidence and privacy risk extraction

## Interview Talking Points

### Why did you build a local automation fallback?

The core workflow should not fail because an optional AI provider is unavailable or rate-limited. Classification, priority, PII scanning and rule execution are deterministic local services. Groq is used only where language understanding materially improves the experience.

### How is user data isolated?

JWT middleware loads the authenticated user. Protected queries filter by both the resource ID and the authenticated user ID. A valid object ID alone is therefore insufficient to access another user's document.

### How do automations work?

Rules contain a trigger, condition and action. A document event selects active rules for that trigger, evaluates conditions against document metadata and applies the action. Each attempt creates an automation-run record with its status and details.

### How do you prevent AI hallucination in PDF chat?

Only extracted content from the selected owned PDF is sent as context. The system instruction restricts answers to that content and requires an explicit unavailable-information response when evidence is missing. Page citations are requested only when page markers are present.

### How is sensitive data handled?

PII is detected with validated patterns and weighted by severity. The scanner stores counts and masked samples for security reporting. The API does not return the detected raw values in its findings.

### Why use SHA-256?

SHA-256 provides a stable fingerprint of the stored file. Evidence Studio computes it from the file stream so users can verify that the downloaded or reviewed artifact corresponds to the same stored binary.

### What would you change for production?

Move runtime files to object storage, use signed URLs, introduce role-based team workspaces, add OCR and vector retrieval, configure centralized logs, containerize the services and add automated integration tests with CI/CD.

## Role-Specific Bullet Selection

### Full-Stack Developer

- Emphasize React architecture, REST APIs, MongoDB models, authentication and responsive UI.
- Mention secure file lifecycle, notifications and command palette.

### Backend Developer

- Emphasize ownership authorization, upload pipeline, rule engine, audit records and modular services.
- Mention MongoDB indexes, non-blocking notifications and graceful fallback behavior.

### AI / Automation Developer

- Emphasize grounded Q&A, language-to-rule parsing, deterministic automation and human approval.
- Mention evidence linking, privacy scanning and hallucination controls.

## Suggested Repository Topics

```text
mern
react
nodejs
mongodb
express
document-ai
workflow-automation
generative-ai
groq
pdf-processing
human-in-the-loop
rest-api
```

## Suggested GitHub Description

```text
AI-powered document workflow automation with grounded PDF intelligence, human approvals, PII scanning and auditable no-code rules.
```

## Suggested Release

```text
v1.0.0 — Portfolio Release
```

Release summary:

```text
First portfolio-ready release of AutoFlow AI, including intelligent document processing, natural-language automations, Evidence Studio, grounded PDF Copilot, sensitive-data scanning, approval workflows, notifications, command palette and executive reports.
```
