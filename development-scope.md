# Dabby / Datalis — Platform Scope & Module Architecture

Professional financial-automation platform: documents flow from ingestion through
an OCR → ruleset → trade-review → double-entry-ledger pipeline, with an AI
consultant, RBAC, and subscription plans layered on top.

**Stack:** React 18 + Vite frontend · FastAPI (Python) backend · Supabase
(Postgres + Auth + Storage, service-role from backend) · Redis document queue ·
Groq + Gemini for AI/OCR.

---

## Module map (data flow)

| # | Module | Status | Key files |
|---|--------|--------|-----------|
| 1 | Auth & OAuth | ✅ | `src/Auth/*`, `context/AuthContext.jsx` |
| 2 | Workbenches & Members | ✅ | `routers/workbenches.py`, `context/WorkbenchContext.jsx` |
| 3 | Doc Vault + OCR ingestion (Redis 3-stage queue) | ✅ | `services/queue_service.py`, `services/document_extraction_service.py` |
| 4 | Ruleset Engine | ✅ | `services/ruleset_service.py`, `pages/Rulesets.jsx`, `pages/RulesetEditor.jsx` |
| 5 | Trade Engine queue + Resolve modal | ✅ | `services/trade_service.py`, `pages/TradeEngine.jsx`, `components/Workbenches/TradeResolveModal.jsx` |
| 6 | Activity Executor (Stage 10) | ✅ | `services/activity_executor.py` |
| 7 | Accounting Compiler (Stage 11/12) | ✅ | `services/accounting_compiler.py` |
| 8 | Supabase Ledger (immutable) | ✅ | `services/ledger_service.py`, migration `006_financial_engine.sql` |
| 9 | Chart of Accounts + live balances | ✅ | `components/Workbenches/detail/COAView.jsx` |
| 10 | Investor View & runway | ✅ | `components/Workbenches/InvestorView.jsx`, `services/investor_service.py` |
| **11** | **RBAC (role enforcement)** | ✅ **NEW** | `backend/auth.py`, `lib/permissions.js`, `hooks/useWorkbenchRole.js` |
| **12** | **Plan limits + AI rate limiting** | ✅ **NEW** | `services/plan_service.py`, `routers/plans.py`, migration `008_plans_usage.sql`, `lib/plans.js` |

---

## Module 11 — RBAC

The FastAPI backend runs on the Supabase **service role** (bypasses RLS), so the
backend — not the DB — is the authorization gate. `backend/auth.py` provides:

- `get_current_user` — verifies the caller's Supabase JWT via `supabase.auth.get_user`.
  Never trusts a body `user_id`.
- `get_workbench_role` — resolves the caller's `workbench_members.role` (falls back
  to `workbenches.owner_user_id`).
- `require_permission(P.X)` / `require_membership()` — route dependencies that
  resolve the workbench from the path/query/body and enforce the matrix below.

**Role → permission matrix** (`ROLE_PERMISSIONS`):

| Permission | Owner | Accountant | Auditor/Investor | Member |
|-----------|:---:|:---:|:---:|:---:|
| View | ✓ | ✓ | ✓ | ✓ |
| View all documents | ✓ | ✓ | ✓ | — |
| Upload document | ✓ | ✓ | — | ✓ |
| Edit draft / trade | ✓ | ✓ | — | — |
| Configure COA | ✓ | ✓ | — | — |
| Write ruleset | ✓ | ✓ | — | — |
| Approve / Execute trade | ✓ | ✓ | — | — |
| Delete transaction | ✓ | — | — | — |
| Invite / manage members | ✓ | — | — | — |
| Manage billing | ✓ | — | — | — |
| Delete workbench | ✓ | — | — | — |

**Guarded endpoints:** all write/execute routes in `trades.py` and `rulesets.py`,
`ops.py` document processing, plus GET reads require membership. The frontend mirror
(`lib/permissions.js` + `useWorkbenchRole`) hides/disables controls the role can't use
(TradeEngine action bar, Rulesets create/edit/delete). UI gating is UX only — the
backend independently returns 403.

**Token flow:** all `/api/*` calls now go through `src/lib/apiClient.js` (`apiFetch`),
which attaches `Authorization: Bearer <supabase access_token>`. Any new call to a
guarded endpoint MUST use `apiFetch`, or it will 401.

---

## Module 12 — Plan limits & AI rate limiting

Per-workbench `plan` column + two usage tables (`workbench_usage` monthly counters,
`ai_usage` daily per-user counters). `services/plan_service.py` is the source of truth:

| | Free | Go (Seed) | Pro (Growth) | Enterprise (Scale) |
|--|:--:|:--:|:--:|:--:|
| OCR uploads / month | 0 | 50 | 500 | ∞ |
| Seats | 1 | 2 | 5 | ∞ |
| AI messages / day (per user) | 10 | 100 | 500 | ∞ |
| Custom rulesets | — | — | ✓ | ✓ |
| Auto-approvals / multibank | — | — | ✓ | ✓ |
| Multi-currency | — | — | — | ✓ |

**Enforcement:**
- Upload quota — `ops.process_document` calls `check_and_increment_upload` (HTTP 402 when hit).
- Custom rulesets — `rulesets.create_ruleset` calls `require_feature(..., "custom_rulesets")`.
- AI messages — chat calls `POST /api/plans/ai-usage/consume` before hitting the LLM
  (`MainApp.handleSendMessage`); a soft block shows an upgrade toast. Meters **fail open**
  on infra errors so the assistant never hard-breaks.
- Seats — `check_seat_available` helper (wire into whatever invite path is used).

**UI:** `hooks/usePlan.js` + `components/Workbenches/PlanUsageBadge.jsx` show the tier and
live upload/seat/AI meters in the workbench sidebar. Plan changes via
`POST /api/plans/set/{workbench_id}` (owner-only).

---

## Deploying these changes

1. **Apply the migration** `backend/migrations/008_plans_usage.sql` to Supabase
   (adds `workbenches.plan` default `'free'`, `workbench_usage`, `ai_usage`).
2. Ensure `.env.local` has `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (backend)
   and the `VITE_*` keys (frontend); backend also needs `GROQ_API_KEY` / `GEMINI_API_KEY`.
3. Existing workbenches default to the **Free** plan — set higher tiers via the
   `/api/plans/set/{id}` endpoint (owner) as needed.

## Verification status

- Backend: `python -m py_compile` clean across all modules.
- Frontend: `vite build` succeeds; new files lint-clean.
- **Not** runtime-verified end-to-end here (needs live Supabase + Redis + API keys).

## Known pipeline limitations (Phase C static review — pre-existing, not regressions)

- **Settlement is a no-op operationally:** `activity_executor` logs
  `REMOVE_RECEIVABLE` / `REMOVE_PAYABLE` / `SUBTRACT_BANK` but does not reduce the
  linked invoice/bill `balance_due` (the ledger posting via the compiler is still
  correct). Paying an invoice won't lower its outstanding balance in the ops tables.
- **Suspense routing can mispost:** when no Suspense/Clearing account exists, the
  compiler routes an imbalance to an arbitrary liability/any account to avoid crashing.
  Add a dedicated "Suspense" COA label per workbench for clean routing.
- **Ruleset nested-field fallback:** `evaluate_conditions` checks an
  `extracted_invoice.{field}` key against a flattened dict; the prefixed key never
  matches. Low impact (fields are already flattened before evaluation).
