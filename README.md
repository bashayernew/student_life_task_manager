# Student Life Task Manager

Vite + React frontend with an Express API deployed as Vercel serverless functions (`/api/*`) and Neon Postgres.

**Local and production use the same code path** — only environment variables differ. Both run the Vite app and `/api` serverless handler from one origin.

## Prerequisites

- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli) — log in once: `npx vercel login` (or `npm i -g vercel` then `vercel login`)
- A [Neon](https://neon.tech) Postgres database (production DB or a separate dev branch)

## Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string (`?sslmode=require`) |
| `JWT_SECRET` | Yes | Long random string for auth tokens |
| `SUPERADMIN_EMAIL` | No | Default `superadmin@admin.com` |
| `SUPERADMIN_PASSWORD` | No | Default `Adm!n@123` |
| `VITE_API_URL` | No | Leave **empty** for same-origin `/api` (recommended) |

`.env` is gitignored. Set the same variables in the Vercel project dashboard for production.

## Local development (recommended)

Uses **`vercel dev`** so the frontend and API share one origin — identical to production routing.

`npm run dev` runs a small wrapper (`scripts/dev.mjs`) that invokes the Vercel CLI. The `dev` script cannot call `vercel dev` directly — the CLI treats that as recursive invocation and exits.

```bash
npm install
npm run dev
```

Open the URL printed by the CLI (usually **http://localhost:3000**).

- Frontend: Vite dev server (via `vercel dev`)
- API: serverless functions in `/api` (same as deploy)
- Login: super-admin is created on first API request if missing

Quick API smoke test (same Express app as Vercel, without the CLI):

```bash
npm run verify:api
```

Requires `DATABASE_URL` and `JWT_SECRET` in root `.env` (not `backend/.env`).

## Alternative local modes (optional)

| Command | Use case |
|---------|----------|
| `npm run dev:vite` | Frontend only on `:5173` (proxies `/api` → `:4000`; requires `npm run dev:express`) |
| `npm run dev:express` | Legacy standalone Express server (reference / debugging) |

## Production deploy

Push to the connected Git branch. Vercel runs `npm run build` and serves `build/` with `/api` serverless functions.

```bash
git push origin main
```

Ensure `DATABASE_URL`, `JWT_SECRET`, and super-admin vars are set in Vercel → Project → Settings → Environment Variables.

If `/api/*` returns `FUNCTION_INVOCATION_FAILED` or a 503 with `"Server misconfigured"`, the deployment is missing one of those variables — `.env` is never uploaded to Vercel.

## API routes

All routes are under `/api`:

- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, …
- `/api/tasks`, `/api/staff`, `/api/departments`

## Project structure

```
├── api/index.js          # Vercel serverless entry (Express app export)
├── backend/src/          # Express app, routes, Neon db layer
├── src/                  # React frontend
├── vercel.json           # Build output, SPA + API rewrites
└── .env.example          # Required env vars (copy to .env)
```
