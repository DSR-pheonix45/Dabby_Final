# Deployment — Frontend (Vercel) + Backend (Railway)

The app is **two services**: a Vite frontend on Vercel and a FastAPI backend on
Railway. The frontend calls `/api/*` on its own origin; Vercel rewrites those
requests server-side to the Railway backend (so there's no CORS to configure).

```
Browser ──> Vercel (frontend + /api rewrite) ──> Railway (FastAPI backend) ──> Supabase / Groq / Gemini
```

Why not the Python backend on Vercel: it runs a long-lived background queue
worker and doesn't fit Vercel's ephemeral serverless model.

---

## 1. Deploy the backend on Railway

1. Create a new project on [railway.app](https://railway.app) → **Deploy from GitHub repo** → pick `DSR-pheonix45/Dabby_Final`, branch `final_main_v1`.
2. In the service **Settings → Root Directory**, set it to **`backend`**.
   (Railway then finds `backend/requirements.txt`, `backend/railway.json`, and starts with `uvicorn main:app --host 0.0.0.0 --port $PORT`.)
3. **Settings → Networking → Generate Domain** to get a public URL like
   `https://dabby-backend-production.up.railway.app`.
4. Add the environment **Variables** (Settings → Variables) — same values as your `.env.local`:

   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | your Supabase URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service-role key |
   | `GROQ_API_KEY` | your Groq key |
   | `GEMINI_API_KEY` | your Gemini key (optional; enables vision OCR) |
   | `VITE_TAVILY_API_KEY` | Tavily key (optional) |
   | `FRONTEND_ORIGIN` | your Vercel URL, e.g. `https://dabby.vercel.app` (optional) |

5. Deploy. Check the logs show `Application startup complete` and hit
   `https://<your-railway-url>/health` → should return `{"status":"healthy"}`.

> Redis is optional — without it the queue uses an in-memory fallback (fine on a
> single always-on Railway instance). To enable Redis later, add a Railway Redis
> plugin and set `REDIS_HOST` / `REDIS_PORT`.

---

## 2. Point Vercel at the Railway backend

1. Edit **`vercel.json`** and replace the placeholder with your Railway domain:
   ```json
   { "rewrites": [
     { "source": "/api/:path*",
       "destination": "https://<your-railway-url>/api/:path*" } ] }
   ```
2. Commit + push (Vercel auto-redeploys).

---

## 3. Deploy the frontend on Vercel

1. Import the repo on [vercel.com](https://vercel.com) (framework auto-detects **Vite**, build `npm run build`, output `dist`).
2. Add the **`VITE_*`** environment variables (Project Settings → Environment Variables):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_GROQ_API_KEY`, `VITE_TAVILY_API_KEY`, `VITE_APP_RECAPTCHA_SITE_KEY`.
3. Deploy. Open the site, log in, and confirm a data screen (e.g. a workbench)
   loads — that proves `/api/*` is reaching Railway.

---

## 4. Apply the plan-limits migration (one-time)

In the Supabase SQL editor, run `backend/migrations/008_plans_usage.sql`
(adds `workbenches.plan`, `workbench_usage`, `ai_usage`). Until then plan limits
read as Free but don't block.

---

## Quick verification
- `GET https://<railway>/health` → `{"status":"healthy"}`
- `GET https://<railway>/api/plans/catalog` → plan tiers JSON
- On the deployed frontend, a guarded call without login → 401 (expected)
- Logged in, workbench data loads → the Vercel→Railway proxy works
