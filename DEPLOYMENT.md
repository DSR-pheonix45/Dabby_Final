# Deployment — Frontend (Vercel) + Backend (Render / Railway)

The app consists of **two main services**: a Vite frontend on Vercel and a FastAPI backend on **Render** (or Railway). The frontend calls `/api/*` on its own origin; Vercel rewrites those requests server-side to your live backend service (so there's no CORS to configure).

```
Browser ──> Vercel (frontend + /api rewrite) ──> Render (FastAPI backend) ──> Supabase / Groq / Gemini
```

Why not the Python backend on Vercel: it runs long-lived task processing / WebSocket logic and doesn't fit Vercel's ephemeral serverless model.

---

## 1. Deploy the backend on Render

1. Log into **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** → **Web Service** (or Blueprint).
3. Connect your GitHub repository `DSR-pheonix45/Dabby_Final`.
4. Configure the Web Service settings:
   - **Name**: `dabby-backend`
   - **Language / Runtime**: `Docker` (or Python 3)
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile` (or `Dockerfile`)
   - **Instance Type**: Free / Starter tier
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add the required keys (same as `.env`):
   - `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `SARVAM_API_KEY` (optional)
6. Click **Create Web Service**.
7. Once deployed, Render gives you a public URL like `https://dabby-backend.onrender.com`.

---

## Alternative: Deploy the backend on Railway

1. Create a new project on [railway.app](https://railway.app) → **Deploy from GitHub repo** → pick `DSR-pheonix45/Dabby_Final`.
2. In the service **Settings → Root Directory**, set it to **`backend`**.
3. **Settings → Networking → Generate Domain** to get a public URL like `https://dabbyfinal-production-95b5.up.railway.app`.
4. Add Environment Variables (`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, etc.).

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
