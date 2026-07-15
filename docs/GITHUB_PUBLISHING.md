# GitHub Publishing Checklist

## 1. Verify secrets are excluded

From the project root:

```powershell
git status
git check-ignore client/.env server/.env server/uploads/test.pdf
```

All three test paths should be reported as ignored. Never run `git add -f` on an environment file or upload directory.

## 2. Validate the application

```powershell
cd client
npm run lint
npm run build
```

Restart and manually test login, upload, Evidence Studio, notifications, Trash and the command palette before publishing.

## 3. Review staged files

```powershell
cd ..
git add .
git status
git diff --cached --stat
```

Confirm that the staged list does not contain:

- `.env`
- `node_modules`
- `server/uploads`
- `client/dist`
- personal PDFs or API keys

If a sensitive file appears, unstage it before committing:

```powershell
git restore --staged path\to\file
```

## 4. Commit and push

```powershell
git commit -m "Build AutoFlow AI document automation platform"
git branch -M main
git remote -v
git push -u origin main
```

If the remote repository already has unrelated commits, inspect the history before pulling or pushing. Do not use a force push unless you intentionally want to replace remote history.

## 5. Configure repository metadata

Suggested description:

```text
AI-powered document workflow automation with grounded PDF intelligence, human approvals, PII scanning and auditable no-code rules.
```

Suggested topics:

```text
mern react nodejs mongodb express document-ai workflow-automation generative-ai groq pdf-processing human-in-the-loop rest-api
```

## 6. Upload the social preview

Use `docs/autoflow-social-preview.png` as the repository social preview image:

1. Open the GitHub repository.
2. Open **Settings**.
3. Find **Social preview**.
4. Upload `docs/autoflow-social-preview.png`.

## 7. Create the portfolio release

Suggested tag and title:

```text
Tag: v1.0.0
Title: AutoFlow AI — Portfolio Release
```

Suggested notes:

```text
First portfolio-ready release of AutoFlow AI, including intelligent document processing, natural-language automations, Evidence Studio, grounded PDF Copilot, sensitive-data scanning, approval workflows, notifications, command palette and executive reports.
```

## 8. Add the project to a resume

Use three or four bullets from `docs/RESUME_POINTS.md`. Add the GitHub repository link and, when deployed, a live demo link. Keep bullets focused on engineering decisions and outcomes rather than listing every screen.
