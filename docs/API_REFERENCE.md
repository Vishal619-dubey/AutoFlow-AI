# AutoFlow AI API Reference

Base URL for local development:

```text
http://localhost:5000/api
```

Except for registration and login, endpoints require a JWT:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Authentication and Profile

### Register

```http
POST /auth/register
```

```json
{
  "name": "Vishal Dubey",
  "email": "vishal@example.com",
  "password": "minimum-six-characters"
}
```

### Login

```http
POST /auth/login
```

Returns a JWT and the public user profile.

### Read or update profile

```http
GET /auth/profile
PUT /auth/profile
```

Editable fields are `name`, `role` and a validated compressed image data URL in `avatar`.

## Documents

### Upload and process

```http
POST /upload
Content-Type: multipart/form-data
```

Form field:

```text
file=<selected-file>
```

The upload pipeline performs file validation, PDF/TXT extraction, classification, priority detection, action extraction, privacy scanning, notification creation and active automation execution.

### List documents

```http
GET /documents
GET /documents?search=invoice
GET /documents?type=pdf
GET /documents?status=trash
GET /documents?status=favorites
GET /documents?status=pinned
```

### Secure view and download

```http
GET /documents/view/:id
GET /documents/download/:id
```

Both endpoints verify document ownership and file availability.

### Evidence profile

```http
GET /documents/evidence/:id
```

Example response shape:

```json
{
  "success": true,
  "document": {
    "filename": "contract.pdf",
    "classification": "Legal",
    "priority": "high",
    "automationScore": 83,
    "summary": "...",
    "actionItems": []
  },
  "report": {
    "generatedBy": "Vishal Dubey",
    "reportId": "AF-1234ABCD",
    "wordCount": 1240
  },
  "integrity": {
    "algorithm": "SHA-256",
    "fingerprint": "...",
    "status": "verified"
  },
  "privacy": {
    "riskLevel": "medium",
    "riskScore": 18,
    "totalFindings": 2,
    "findings": []
  },
  "insights": {
    "risks": [],
    "deadlines": [],
    "amounts": [],
    "decisions": []
  }
}
```

### Favorite and pin

```http
PUT /documents/favorite/:id
PUT /documents/pin/:id
```

### Trash lifecycle

```http
DELETE /documents/:id
PUT /documents/:id/restore
DELETE /documents/:id/permanent
```

The first call is a soft delete. Permanent deletion removes both MongoDB metadata and the runtime file.

## Automation

### Dashboard

```http
GET /automation/dashboard
```

Returns processed document count, active rules, review count, approvals, estimated time saved and recent documents.

### Natural-language rule parser

```http
POST /automation/parse-rule
```

```json
{
  "description": "When a critical finance document is detected, send it for approval"
}
```

The service tries Groq first and uses a deterministic local parser when Groq is unavailable.

### Rules

```http
GET    /automation/rules
POST   /automation/rules
PUT    /automation/rules/:id/toggle
DELETE /automation/rules/:id
```

Create-rule body:

```json
{
  "name": "Critical Finance Review",
  "trigger": "High priority detected",
  "condition": "Category is Finance",
  "action": "Send for approval"
}
```

### Process and review

```http
POST /automation/process/:id
PUT  /automation/review/:id
```

Review body:

```json
{
  "status": "approved"
}
```

Allowed statuses are `review`, `approved` and `rejected`.

### Audit history

```http
GET /automation/runs
```

Returns the authenticated user's latest automation executions.

## AI Copilot

```http
POST /chat/:documentId
```

```json
{
  "question": "What are the important deadlines?"
}
```

The server sends only selected document content to the configured Groq model. The system prompt restricts answers to the document and requests page citations when indexed page markers exist.

## Sensitive Data Security

```http
GET  /security/dashboard
POST /security/scan/:documentId
```

The scanner detects supported sensitive identifiers, returns only masked samples and calculates a risk score between 0 and 100.

## Notifications

```http
GET /notifications
PUT /notifications/:id/read
PUT /notifications/read-all
```

Notification types:

- `upload`
- `review`
- `approval`
- `security`
- `automation`
- `system`

## Activities and Optional AI Modules

```http
GET  /activity
POST /summary/:documentId
GET  /summary/:documentId
POST /knowledge/:documentId
```

## Common Status Codes

| Code | Meaning |
|---:|---|
| `200` | Request completed successfully |
| `201` | Resource created |
| `400` | Invalid input or unsupported file |
| `401` | Missing, expired or invalid JWT |
| `404` | Owned resource or runtime file not found |
| `500` | Server, database or optional AI error |

## Security Notes

- Never expose `JWT_SECRET` or `GROQ_API_KEY` to the client.
- Do not commit `server/.env` or `client/.env`.
- Every new document endpoint should include an ownership condition using the authenticated user ID.
- Avoid returning unmasked sensitive values in API responses or logs.
