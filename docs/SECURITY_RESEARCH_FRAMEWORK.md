# AutoFlow-AI Security Research Framework

## Research position

AutoFlow-AI studies whether a lightweight zero-trust control plane can protect an AI document workflow without making evidence-grounded question answering unusably slow. The contribution is the integration and evaluation of multiple controls, not the claim that AES, SHA-256, JWT or prompt filtering are individually new.

## Implemented controls

| Property | Working control | Evidence produced |
|---|---|---|
| Confidentiality | AES-256-GCM file encryption and owner-scoped retrieval | encryption metadata, allowed/blocked access events |
| Authentication | bcrypt passwords, login lockout, two-hour signed JWT, token-version revocation | login and logout security events |
| Integrity | plaintext and encrypted-payload SHA-256 fingerprints; authenticated decryption | verification status, timestamps and tamper blocks |
| Availability | bounded API/authentication request rates and health endpoint | HTTP 429 response and health status |
| AI context safety | upload/query prompt-injection checks before generation | blocked injection events |
| Explainability | weighted Document Trust Score and dimensions | score, grade and dimension values |

## Trust Score

The score is diagnostic evidence, not an authorization mechanism. Ownership policy is enforced first.

- Integrity: 35 points
- Confidentiality: 25 points
- Authentication: 20 points
- Content safety: 20 points

A document is `trusted` only when it is encrypted, integrity-verified and scores at least 85. A failed integrity check forces restricted access.

## Proposed experiments

1. Upload the same test corpus to the baseline and secured configurations.
2. Attempt cross-user view, download and AI retrieval.
3. Flip one byte in encrypted storage and measure tamper-detection rate.
4. Insert indirect prompt instructions in test PDFs and measure attack success.
5. Run repeated membership-probing questions and inspect audit evidence.
6. Measure median and p95 latency for upload, view and AI retrieval.
7. Report correctness, false-positive rate, blocked-disclosure rate and storage overhead.

## Limitations

- The in-memory rate limiter is suitable for a single server; distributed deployment should use a shared store such as Redis.
- Master-key rotation and managed KMS integration are future production work.
- Prompt-injection rules are a defensive layer, not a proof of complete attack prevention.
- Existing plaintext documents must be migrated with the Trust Center protection action.
- Publication novelty must be established through literature comparison and experimental results.
