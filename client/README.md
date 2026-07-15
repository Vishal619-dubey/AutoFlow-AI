# AutoFlow AI Frontend

React and Vite client for the AutoFlow AI intelligent document operations platform.

## Active Entry Points

- `src/main.jsx` — React bootstrap
- `src/App.jsx` — authenticated and public routes
- `src/autoflow/AuthPage.jsx` — login and registration experience
- `src/autoflow/AutoFlowShell.jsx` — navigation, profile, notifications and command palette
- `src/autoflow/WorkspaceViews.jsx` — dashboard and feature pages
- `src/services/api.js` — Axios base URL and JWT interceptor
- `src/index.css` — responsive application design system

## Environment

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run build
```

See the [main project README](../README.md) for architecture, backend setup, screenshots and API documentation.
