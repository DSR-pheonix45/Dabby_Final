# Dabby / Datalis — Change Log (2026-06-08)

Branch: `feature/fintech-enhancements` · Commit: `dc777aa`

This document summarizes everything changed in this session: an end‑to‑end audit
with bug fixes, financial‑correctness hardening, and a large batch of new
fintech features. Everything below is **build‑verified** (frontend `vite build`
exit 0, all backend `*.py` compile, ESLint **0 errors**). Pure business logic
(GST/TDS, money rounding, bank matching, imports) is **unit‑tested**. The
DB‑touching endpoints are compile‑verified but were **not run live** — they need
the backend running + the migrations below applied.

---

## 1. How to run & verify

```bash
# Frontend
npm install
npm run dev            # http://localhost:5174

# Backend
cd backend
python -m venv venv && ./venv/Scripts/activate      # (Windows) or source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Apply the SQL migrations in `backend/migrations/` via the Supabase SQL editor
(all idempotent — safe to re‑run). Suggested order:

1. `rls_membership_fix.sql` — tighten RLS to real membership checks (**high value, safe**)
2. `documents_reconcile.sql` — fix the `workbench_documents` column drift
3. `gst_tds_migration.sql` — GST/TDS columns + `view_gst_summary`
4. `record_transaction_atomic.sql` — atomic double‑entry RPC
5. `compliance_schema.sql`, `recurring_schema.sql`, `recurring_invoices_schema.sql`
6. `pgvector_rag.sql` — semantic search (needs the `vector` extension)
7. `approvals_schema.sql` — bill approval workflow

---

## 2. Environment variables

`.env.local` (gitignored) holds secrets, split into **frontend‑safe** (`VITE_*`,
inlined into the browser bundle) and **backend‑only** (never `VITE_`‑prefixed).
A committed `.env.example` documents the shape.

| Var | Side | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | frontend | Supabase client |
| `VITE_API_BASE_URL` | frontend | FastAPI base URL (replaces hardcoded localhost) |
| `VITE_APP_RECAPTCHA_SITE_KEY` | frontend | reCAPTCHA on auth forms |
| `VITE_GROQ_API_KEY` / `VITE_TAVILY_API_KEY` | frontend | chat LLM / web search (see security note) |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **required** for the backend to boot |
| `GEMINI_API_KEY` | backend | enables pgvector semantic RAG embeddings |
| `RESEND_API_KEY` or `SMTP_*` + `EMAIL_FROM` | backend | payment reminders / report emails |
| `EINV_BASE_URL` / `EINV_USER` / `EINV_PASSWORD` | backend | real GST e‑invoice IRN generation |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | backend | subscriptions (unchanged) |
| `FRONTEND_ORIGIN` | backend | production CORS origin (leave blank for local dev) |

Every optional feature **degrades gracefully** if its key is missing.

> **Security:** `VITE_GROQ_API_KEY` / `VITE_TAVILY_API_KEY` are shipped in the
> browser bundle. For production, proxy them through the backend `/api/ai`.
> Rotate the Razorpay live keys + Google OAuth secret that were shared during setup.

---

## 3. Bug fixes (from the audit)

### Runtime crashers (green build couldn't catch these — they throw at runtime)
- **`ColumnMapper`** — added the missing `handleSelect` (mapping dropdowns were `ReferenceError`).
- **`MainApp`** — imported `toast` (chat‑persistence error handler self‑crashed).
- **`LiquidityCenter`** — imported `supabase`.
- **`ErrorBoundary`** — `process.env.NODE_ENV` → `import.meta.env.DEV` (undefined in browser).
- **`ops.py`** — `record_transaction(bill_id=…)` crash + undefined `tx_res` in `create_bill`.
- **`requirements.txt`** — added missing `google-generativeai` (backend wouldn't boot in Docker).
- **Seeder** — revenue type `"income"` → `"revenue"` (DB CHECK rejected `income`; revenue accounts never seeded).

### Wiring / correctness
- Replaced **41 hardcoded `http://localhost:8000`** across 15 files with env‑driven `API_BASE_URL` (`src/lib/api.js`).
- Added the missing **`/reset-password`** route + `ResetPassword` page (password reset flow was dead).
- Fixed the login **`returnUrl`** key mismatch (`from.pathname` vs `returnUrl`).
- **`Templates`** marketplace now honors `path` (dedicated generators reachable).
- **Vendor PDF** report: added the missing column (5 data cells vs 4 headers).
- **Delivery Challan PDF**: `setTextColor([…])` array bug → invisible header text.
- **Budgeting/Compliance** refresh event mismatch (`refresh-workbench-data` → `refresh-ledger-data`).
- Wired **`createBudget`** + mounted `CreateBudgetModal` (budget creation crashed).
- Made the **Audit Trail (LogsView)** reachable via a workbench nav tab.
- **Blog** "Read story" dead button → honest "coming soon".

### Security
- `.env` split (frontend vs backend secrets) + committable `.env.example`.
- **reCAPTCHA** added to Login + Signup; password min 6 → 8.
- `rls_membership_fix.sql` — replaces "row exists" RLS with real `auth.uid()` membership/role checks.
- `backend/auth.py` — ready‑to‑adopt JWT‑verification + workbench‑membership FastAPI dependencies (documented, **not enabled** — needs coordinated frontend token propagation).
- Removed the API‑key prefix `console.log` leak.

### Quality / performance
- **Tailwind safelist** — fixes dynamic `bg-${color}-500/10` classes that rendered unstyled in prod.
- **Vendor bundle 3.9 MB → 1.8 MB** (gzip 1,159 → 532 kB) — PDF/Excel/DOCX/chart libs now load on demand.
- Env‑driven backend **CORS** (`FRONTEND_ORIGIN`).
- Lint: **92 errors → 0** (empty blocks, useless escapes, case‑declarations fixed; unused vars removed/renamed; `scratch/` Node scripts ignored). 30 advisory `exhaustive-deps` warnings remain.

---

## 4. Financial‑correctness fixes
- **`COAView` Net Profit** was computing revenue as "leftover cash". Removed the override + the liability clamp; per‑label and per‑pillar sign conventions now agree (natural‑balance: asset/expense debit‑natural, liability/equity/revenue credit‑natural). *Unit‑sanity reasoned.*
- **AP/AR label selection** now prefers the actual "Accounts Payable" / expense sub‑account instead of the first label of a type.
- **Money precision** — ledger uses `Decimal` quantization (`q2`/`money`); the two legs of a transaction are exactly equal‑and‑opposite (no `0.1+0.2` drift). **Unit‑tested**.
- **Rollback** — compensating delete if entries fail mid‑write + a deployable atomic RPC (`record_transaction_atomic.sql`).
- **Inventory** — backend FIFO COGS was already correct; relabeled the frontend "Stock Value" → "(Sale Price)" so it isn't mistaken for cost basis.
- **Over‑payment / NaN** guards on payment modals; `roundMoney` helper applied to transaction/payment inputs.

---

## 5. New features

### Compliance & filing  (`backend/services/{gst_returns,tds,einvoice}_service.py`, `routers/filing.py`)
- **GSTR‑1 / GSTR‑3B** export — portal‑ready JSON (B2B/B2C/HSN split; outward tax vs ITC → net payable). **Unit‑tested**. Download buttons in the Compliance tab.
- **GST e‑invoice (IRN/QR)** — IRP schema‑1.1 payload generator + pluggable `IRPClient` (wire GSP creds via `EINV_*`).
- **TDS Form 26Q** — deductee‑wise export from captured TDS. **Unit‑tested**. Download button.

### GST/TDS engine  (`services/tax_service.py`)
- CGST/SGST/IGST split (intra vs inter‑state, GSTIN‑derived state codes) + TDS by section (194C/J/I/H/Q/A). **Unit‑tested**.
- **3‑leg ledger split** so GST doesn't inflate revenue: invoices post Dr AR / Cr Revenue / Cr GST Output Payable; bills post Dr Expense / Dr GST Input Credit / Cr AP. Balanced legs **unit‑tested**.
- GST/TDS summary panel + `view_gst_summary`.

### Money operations
- **Tally / Zoho import** (`services/importService.js`, `components/Workbenches/ImportWizard.jsx`) — auto‑detects Tally XML/Daybook + Zoho Journal/Invoice/Contacts/COA → canonical rows. **Unit‑tested**. `/import` route + CTA on Data Ingestion.
- **Bank statement auto‑reconcile** (`services/bank_recon_service.py`, `routers/bank.py`) — matches statement lines to ledger by amount + date proximity + description similarity. **Unit‑tested**. New "Bank Reconcile" tab.
- **Reconciliation engine** (`routers/reconciliation.py`) — AR/AP vs ledger, missing months, health score. "Books Health" panel.
- **Recurring transactions** + **recurring invoices** (`routers/recurring.py`, schemas) — schedule + auto‑post when due (3‑leg GST aware). "Recurring" tab.
- **Payment reminders / dunning** + **scheduler** (`routers/scheduler.py`) — `/api/scheduler/tick/{id}` runs recurring txns + recurring invoices + dunning in one cron‑friendly call. Pluggable **email** (`services/email_service.py`: Resend or SMTP).
- **Cash‑flow forecast** (`routers/forecast.py`) — projects cash from current bank/cash + AR/AP due dates + recurring, with a runway estimate. "Cash Flow" tab (recharts).

### Platform & trust
- **Approval workflows** (`approvals_schema.sql`, `routers/ops.py`) — over‑threshold bills are created `pending` and **not posted** until approved; `approve`/`reject` endpoints + a "Pending Approval" panel in AP.
- **Streaming AI responses** — SSE streaming with model fallback + 429 backoff; tokens render live with graceful fallback to non‑streaming.
- **pgvector semantic RAG** (`services/embedding_service.py`, `routers/rag.py`, `pgvector_rag.sql`) — Gemini embeddings, cosine match; wired into chat context.
- **Local OCR** (`services/ocr_service.py`, `routers/ocr.py`) — pdfplumber/pypdf for digital PDFs (no key), optional Tesseract for scanned; auto‑indexes into RAG. DocVault "OCR" button.

---

## 6. New backend API surface (prefix `/api`)

| Router | Endpoints (selected) |
| --- | --- |
| `filing` | `gstr1/{wb}`, `gstr3b/{wb}`, `tds26q/{wb}`, `POST einvoice/{invoice}` |
| `bank` | `POST reconcile/{wb}` |
| `reconciliation` | `GET {wb}` |
| `recurring` | `POST /`, `GET {wb}`, `POST run-due/{wb}`, `POST invoices`, `GET invoices/{wb}` |
| `compliance` | `POST generate/{wb}`, `POST {id}/file` |
| `scheduler` | `POST tick/{wb}`, `POST reminders/{wb}` |
| `forecast` | `GET {wb}` |
| `rag` | `GET status`, `POST index/{wb}`, `POST search/{wb}` |
| `ocr` | `GET status`, `POST extract/{wb}` |
| `ops` (new) | `POST bills/{id}/approve`, `POST bills/{id}/reject`, `GET gst/summary/{wb}` |

New `backendService.js` methods mirror all of the above.

---

## 7. New UI surfaces
- Workbench tabs: **Recurring**, **Bank Reconcile**, **Cash Flow**, **Audit Trail**.
- Compliance tab: **GST & TDS panel**, **Books Health / reconciliation**, **Generate Calendar**, **GSTR‑1 / GSTR‑3B / TDS 26Q** downloads, **Send Reminders**.
- AP tab: **Pending Approval** panel.
- **Import** wizard at `/import` + CTA on Data Ingestion.
- **ResetPassword** at `/reset-password`.
- DocVault **OCR & Index** action.

---

## 8. Remaining / not done
- **Auth enablement (skipped by request)** — `auth.py` + RLS are written but not switched on. Enabling means attaching `Authorization: Bearer <token>` in `backendService` and testing every endpoint, or the app 401s.
- **3‑leg GST** depends on a `GST Output Payable` / `GST Input Credit` label (lazily seeded) — verify against real postings.
- **No automated test suite / CI yet** — pure logic is unit‑tested ad‑hoc; recommend pytest + vitest + a GitHub Action.
- **Live click‑through testing** of the DB endpoints (needs the stack running + migrations applied).

Recommended live smoke test: GST invoice → download GSTR‑3B · bill over the
approval threshold → approve · upload a bank statement → reconcile · OCR a
scanned bill → ask the consultant (RAG).
