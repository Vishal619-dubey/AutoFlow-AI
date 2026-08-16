AutoFlow AI

<p align="center">
  <img src="docs/autoflow-social-preview.png" alt="AutoFlow AI — Intelligent Document Operations" width="100%" />
</p>

<p align="center">
  <strong>AI-powered document workflow automation with zero-trust access, encrypted AWS S3 storage, tamper evidence and grounded intelligence.</strong>
</p>

<p align="center">
  <a href="https://autoflow-ai-vishal.netlify.app">
    <strong>🚀 Open Live Demo</strong>
  </a>
  &nbsp;•&nbsp;
  <a href="https://autoflow-ai-api.onrender.com">API Status</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/Vishal619-dubey/AutoFlow-AI">Source Code</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" />
  <img alt="AWS S3" src="https://img.shields.io/badge/AWS-S3-FF9900?logo=amazonaws&logoColor=white" />
  <img alt="Groq" src="https://img.shields.io/badge/AI-Groq-F55036" />
  <img alt="Status" src="https://img.shields.io/badge/Status-Production_Ready-7C5CFF" />
</p>

Overview

AutoFlow AI is a full-stack intelligent document operations platform. It transforms uploaded PDFs and business files into secure, auditable workflows by automatically extracting text, classifying content, detecting priority, finding action items, scanning sensitive data and routing important documents for human approval.

New production uploads are protected with AES-256-GCM application-layer encryption and stored as encrypted .afenc objects in a private AWS S3 bucket. MongoDB stores document metadata, workflow state and security information, while SHA-256 fingerprints are used to verify document integrity before protected access.

The platform combines a reliable local automation engine with Groq-powered language intelligence. Core document processing can continue even when an external AI API is unavailable, while AI Copilot and natural-language workflow generation use Groq when configured.

Why AutoFlow AI?

Most document applications only upload, store and search files. AutoFlow AI treats every document as an operational and security event:

flowchart LR
    A[Upload] --> B[Extract & Classify]
    B --> C[Privacy Scan]
    C --> D[Encrypt & Hash]
    D --> E[(Private AWS S3)]
    E --> F{Priority / Rule Match}
    F -->|Routine| G[Auto-process]
    F -->|High risk| H[Human Approval]
    G --> I[Audit & Notify]
    H --> I

Automation decisions are explainable and recorded.

High-risk work remains under human control.

PDF answers are grounded in uploaded document content.

Sensitive identifiers are masked before being shown in security results.

Every user can access only their own documents and workflow data.

Newly uploaded files are encrypted with AES-256-GCM before permanent S3 storage.

SHA-256 plaintext and encrypted-payload fingerprints protect document integrity.

Integrity is verified before secure download, Evidence Studio and AI retrieval.

Prompt-injection screening protects the AI retrieval path.

Prompt-like text inside a PDF is treated as untrusted evidence instead of executable instruction.

Key Features

Intelligent Document Hub

Upload PDF, TXT, DOCX, XLSX, PPTX and supported media files.

Automatic text extraction for PDF and TXT documents.

Local classification into Finance, Legal, Academic, HR, Operations or General.

Priority detection, confidence scoring and action-item extraction.

Secure view, verified download, soft delete, Trash, restore and permanent deletion.

Mobile-safe secure download flow.

Secure AWS S3 Storage

Private AWS S3 storage for new production document uploads.

AES-256-GCM authenticated encryption before permanent cloud storage.

Encrypted .afenc object format.

MongoDB-backed storage metadata using storageProvider, s3Key and storage status.

S3 object verification before protected document access.

Permanent deletion removes the corresponding S3 object.

Legacy local-file fallback remains for migration compatibility.

No-Code Automation Engine

Trigger–condition–action workflow builder.

Natural-language workflow generation with Groq and a local fallback parser.

Automatic rule execution on upload, priority detection and approval completion.

Enable, pause and delete rules.

Persistent run counts and a complete Audit Trail.

Human-in-the-Loop Approval

High and critical priority documents can be paused for review.

Approve or reject documents from a dedicated queue.

Approval decisions can trigger downstream automation rules.

Every decision remains isolated to the authenticated workspace.

Evidence Studio

Protected in-browser PDF viewer with fullscreen support.

Secure original-file download.

SHA-256 document fingerprint and integrity verification.

S3-aware encrypted document retrieval and authenticated decryption.

Decision Radar for risks, deadlines, amounts and recommended actions.

Clickable evidence items linked to source pages when page indexing is available.

Integrated privacy findings and AI confidence.

Grounded AI Copilot

Select a processed PDF as the knowledge source.

Ask questions about risks, deadlines, decisions and document content.

Answers are restricted to the selected PDF.

Page citations are generated when page markers are available.

Clear refusal when information is absent from the document.

S3 storage and cryptographic integrity are verified before AI retrieval.

User prompt-injection attempts can be blocked by the context security policy.

Prompt-like text inside the document remains isolated as untrusted evidence.

Current default Groq model: openai/gpt-oss-120b.

Sensitive Data Scanner

Detects email addresses, Indian phone numbers, Aadhaar, PAN and payment cards.

Masks samples returned by the API.

Calculates document-level privacy risk score and severity.

Provides automatic scanning for new PDF/TXT uploads and manual rescanning.

AutoFlow Trust Center

AES-256-GCM authenticated encryption for newly uploaded files.

SHA-256 plaintext and encrypted-payload fingerprints with on-demand verification.

Owner-scoped zero-trust policy enforcement before view, download and AI retrieval.

Prompt-injection screening for uploaded text and user questions.

Explainable 100-point Document Trust Score across integrity, confidentiality, authentication and content safety.

Security event trail for login, upload, verification, blocked retrieval and logout decisions.

Login lockout, two-hour signed sessions, server-side session revocation and API rate limiting.

Executive Report Generator

One-click A4 executive intelligence report.

Includes summary, risks, deadlines, actions, privacy score and AI confidence.

Embeds report ID, generated-by identity and SHA-256 fingerprint.

Browser-native Print / Save as PDF workflow.

Production-Style Workspace Experience

Responsive dark SaaS interface.

MongoDB-backed smart notifications with unread badge and mark-as-read actions.

Professional user profile, persistent photo and editable role.

Ctrl + K command palette for documents, pages and quick actions.

Operational dashboard, analytics, audit history and automation health.

Screenshots

Automation Command Center



Intelligent Document Hub



Grounded AI Copilot



Technology Stack

Layer

Technologies

Frontend

React 19, Vite, React Router, Axios, Lucide React, Tailwind CSS, custom responsive CSS

Backend

Node.js, Express.js, Multer, JWT, bcrypt

Database

MongoDB, Mongoose

Cloud Storage

Private AWS S3 using AWS SDK for JavaScript v3

Document Processing

pdf-parse, local text analysis and evidence extraction

Automation

Custom trigger–condition–action rule engine

AI

Groq SDK with openai/gpt-oss-120b for grounded Q&A and language-to-workflow parsing

Security

AES-256-GCM, SHA-256, secure JWT, ownership policy, login lockout, rate limiting, injection screening and masked PII results

Deployment

Netlify frontend, Render backend, MongoDB database and AWS S3 document storage

System Architecture

flowchart TB
    subgraph Client[React Client]
        UI[Workspace UI]
        CP[Command Palette]
        EV[Evidence Studio]
        CHAT[AI Copilot]
    end

    subgraph API[Express API]
        AUTH[JWT Middleware]
        DOC[Document Services]
        RULE[Automation Engine]
        SEC[Trust & Integrity Engine]
        NOTIFY[Notification Service]
    end

    subgraph Data[Persistent Services]
        DB[(MongoDB)]
        S3[(Private AWS S3)]
        GROQ[Groq API]
    end

    Client --> AUTH
    AUTH --> DOC
    AUTH --> RULE
    AUTH --> SEC
    AUTH --> NOTIFY

    DOC --> DB
    DOC --> S3

    RULE --> DB

    SEC --> DB
    SEC --> S3

    CHAT --> SEC
    SEC --> GROQ

Security Flow

For an S3-backed document, protected access follows this flow:

JWT Authentication
        |
        v
Owner Verification
        |
        v
Load Encrypted Object from S3
        |
        v
Verify Encrypted SHA-256
        |
        v
AES-256-GCM Authenticated Decryption
        |
        v
Verify Plaintext SHA-256
        |
        v
Allow View / Download / Evidence / AI Retrieval

If the object is missing or integrity verification fails, AutoFlow AI blocks protected access instead of silently continuing.

Project Structure

AutoFlow-AI/
├── client/
│   ├── src/
│   │   ├── autoflow/          # Active workspace, auth and feature views
│   │   ├── components/        # Protected route and reusable UI
│   │   ├── services/api.js    # Axios client and JWT interceptor
│   │   ├── App.jsx            # Application routes
│   │   └── index.css          # Complete responsive design system
│   └── .env.example
├── server/
│   ├── config/                # MongoDB connection
│   ├── controllers/           # Auth, automation, chat, security and evidence
│   ├── middleware/            # JWT and rate-limit protection
│   ├── models/                # Mongoose data models
│   ├── routes/                # REST API routes
│   ├── services/
│   │   ├── s3StorageService.js
│   │   ├── documentSecurityService.js
│   │   ├── pdfEvidenceService.js
│   │   ├── groqService.js
│   │   └── securityEventService.js
│   ├── tests/                 # Security tests
│   ├── server.js              # Active backend entry point
│   └── .env.example
├── docs/                      # Screenshots, research and engineering guides
└── README.md

The research controls, score definition, proposed experiments and limitations are documented in docs/SECURITY_RESEARCH_FRAMEWORK.md.

Local Installation

Prerequisites

Node.js compatible with the current Vite toolchain

npm

MongoDB Community Server or MongoDB Atlas

AWS account with a private S3 bucket

IAM credentials with least-privilege S3 access

Groq API key if AI Copilot and AI language parsing are required

1. Clone the repository

git clone https://github.com/Vishal619-dubey/AutoFlow-AI.git
cd AutoFlow-AI

2. Configure and run the backend

Generate the document master key once and keep it private:

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Paste that 64-character value into DOCUMENT_MASTER_KEY in server/.env.

Changing this key later without a proper migration can make existing encrypted files unreadable.

Windows PowerShell:

cd server
Copy-Item .env.example .env
npm install
npm run dev

macOS/Linux:

cd server
cp .env.example .env
npm install
npm run dev

Example server/.env:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/autoflow_ai
JWT_SECRET=replace_with_a_long_random_secret
DOCUMENT_MASTER_KEY=replace_with_64_character_hex_key
CLIENT_URL=http://localhost:5173

AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_private_s3_bucket_name
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

GROQ_API_KEY=your_groq_api_key

# Optional model override
GROQ_MODEL=openai/gpt-oss-120b

3. Configure and run the frontend

Open a second terminal:

cd client
Copy-Item .env.example .env
npm install
npm run dev

Frontend environment:

VITE_API_URL=http://localhost:5000/api

Open http://localhost:5173, create an account and upload a PDF.

Environment Variables

Variable

Required

Description

PORT

No

Express server port; defaults to 5000

MONGO_URI

Yes

MongoDB connection string

JWT_SECRET

Yes

Secret used to sign authentication tokens

DOCUMENT_MASTER_KEY

Yes in production

64-character hexadecimal AES-256 document master key

CLIENT_URL

Yes in production

Allowed frontend origin

AWS_REGION

Yes for S3

AWS region containing the S3 bucket

AWS_S3_BUCKET

Yes for S3

Private document storage bucket

AWS_ACCESS_KEY_ID

Yes for current deployment

Backend IAM access key

AWS_SECRET_ACCESS_KEY

Yes for current deployment

Backend IAM secret key

GROQ_API_KEY

No for core local processing

Enables Copilot and Groq language features

GROQ_MODEL

No

Optional model override; defaults to openai/gpt-oss-120b

VITE_API_URL

Yes

Frontend API base URL

Never commit real .env files, AWS credentials, API keys, JWT secrets or document master keys.

AWS S3 Security Notes

Keep Block Public Access enabled.

Keep ACL-based public access disabled.

Use a private bucket.

Give the backend IAM identity only the S3 permissions required by AutoFlow AI.

Never expose AWS credentials to the React frontend.

Keep DOCUMENT_MASTER_KEY in backend secret storage only.

Encrypted .afenc objects are the persistent document representation for new production uploads.

AutoFlow AI uses both private AWS storage and application-layer AES-256-GCM encryption for defense in depth.

REST API Summary

All protected endpoints require:

Authorization: Bearer <jwt-token>

Module

Method and endpoint

Purpose

Authentication

POST /api/auth/register

Create a workspace user

Authentication

POST /api/auth/login

Sign in and receive JWT

Profile

GET /api/auth/profile

Get authenticated profile

Profile

PUT /api/auth/profile

Update name, role or profile photo

Documents

POST /api/upload

Upload, process, encrypt and store a file

Documents

GET /api/documents

List owned documents

Documents

GET /api/documents/view/:id

Verify, decrypt and securely stream a document

Documents

GET /api/documents/download/:id

Verify, decrypt and download an owned document

Evidence

GET /api/documents/evidence/:id

Get integrity, privacy and evidence profile

Trash

DELETE /api/documents/:id

Move a document to Trash

Trash

PUT /api/documents/:id/restore

Restore a document

Automation

GET /api/automation/dashboard

Load operational metrics

Automation

POST /api/automation/parse-rule

Convert language into a workflow rule

Automation

GET /api/automation/rules

List no-code rules

Automation

GET /api/automation/runs

Load the audit trail

Approval

PUT /api/automation/review/:id

Approve or reject a document

Security

GET /api/security/dashboard

Load privacy and security metrics

Security

POST /api/security/scan/:id

Rescan a document for sensitive data

Copilot

POST /api/chat/:id

Ask a grounded PDF question

Notifications

GET /api/notifications

List workspace notifications

Notifications

PUT /api/notifications/read-all

Mark all notifications as read

See API Reference for detailed request and response examples.

Security Design

Passwords are hashed with bcrypt.

JWT middleware protects private API routes.

Every protected document query includes the authenticated user ID.

Uploads use file type and size restrictions.

New production uploads are encrypted with AES-256-GCM.

Encrypted document payloads are stored privately in AWS S3.

SHA-256 fingerprints verify both encrypted and decrypted content.

Viewer, download, Evidence Studio and AI retrieval verify ownership and document integrity.

Prompt-injection detection protects suspicious user queries.

Prompt-like document text is isolated as untrusted evidence instead of being executed as instruction.

Privacy scan samples are masked before API responses.

Security events record important access and retrieval decisions.

.env, runtime uploads, build output and dependency folders are ignored by Git.

Testing and Validation

Frontend quality checks:

cd client
npm run build

Backend security tests:

cd server
npm test

Current backend security tests cover:

AES-256-GCM encryption and decryption

Document integrity verification

Prompt-injection detection rules

Document Trust Score behavior

Recommended manual production flow:

Register and log in.

Upload a new PDF.

Confirm an encrypted .afenc object appears in the private S3 bucket.

Verify classification, priority and privacy scan.

Securely download the same PDF.

Open Evidence Studio and confirm document integrity.

Ask the Copilot a normal question answered by the PDF.

Ask a question not answered by the PDF and confirm grounded behavior.

Test a malicious prompt-injection query and confirm it is blocked.

Create an automation using natural language.

Approve a high-priority document.

Inspect the Audit Trail, security events and notifications.

Generate an Executive Report.

Production Deployment

Frontend

Netlify:

https://autoflow-ai-vishal.netlify.app

Backend

Render:

https://autoflow-ai-api.onrender.com

Persistent Documents

Private AWS S3:

Encrypted .afenc objects

Metadata

MongoDB:

Users, documents, security state, automation and audit metadata

Documentation

Security Research Framework

Complete API Reference

Engineering Case Study

Resume and Interview Points

GitHub Publishing Checklist

Resume Summary

Built AutoFlow AI, a secure full-stack intelligent document workflow platform featuring private AWS S3 storage, AES-256-GCM document encryption, SHA-256 integrity verification, JWT-based owner-scoped access, natural-language workflow generation, human-in-the-loop approvals, evidence-grounded PDF Q&A, prompt-injection controls, page-linked evidence intelligence, PII risk scanning, real-time notifications and auditable workflow execution.

Research Direction

AutoFlow AI is being developed as an implementation base for research around:

Context-Aware Zero-Trust Security for AI-Assisted Document Workflows with Encrypted Cloud Storage and Verifiable Evidence Retrieval

The system maps its security controls to:

Confidentiality: AES-256-GCM, private AWS S3 and owner-only access

Authentication / Authorization: JWT, bcrypt, user isolation and protected routes

Integrity: SHA-256 fingerprints and authenticated verification before protected retrieval

Future Scope

AWS temporary credentials or workload identity instead of long-lived application access keys

Encryption key rotation and secure document re-keying

S3 versioning and controlled recovery policies

OCR for scanned image-only PDFs

Team workspaces and richer role-based access control

Email and Slack workflow connectors

Vector search across multiple verified documents

Multi-document RAG with evidence isolation

Advanced adversarial prompt-injection evaluation

Automated integration, security and end-to-end test suites

Author

Vishal Dubey<br />
Full-Stack Developer · AI Automation Engineer<br />
GitHub Profile

If this project helps you understand secure intelligent document automation, consider starring the repository.