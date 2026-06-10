# Today’s Implementation Tasklist

## Goal
Align the landing page and auth experience to the Dabby MVP scope, then begin implementing secure onboarding and product-first flows step-by-step.

## Status
- Core landing page exists as a marketing site with AI template messaging.
- Auth is built on Supabase with signup/login/OAuth and protected dashboard routing.
- Onboarding saves profile state, but product experience is not yet aligned to the accounting MVP.
- Landing page copy and CTA messaging have been updated to reflect Dabby’s accounting workflows.

### Recent Progress (Completed Fixes & Hardening)
- **Auth Hardening (Email Filtering)**: Restricted user registrations and logins in `Login.jsx` and `Signup.jsx` to `@gmail.com`, `@yahoo.com`, and `@outlook.com` domains (removed the previous generic `@company.com` default).
- **CORS & Edge Functions Bypass**: Modified `backendService.js` to bypass the undeployed Supabase Edge Functions (`save-chat-message` and `create-chat-session`) in favor of direct database inserts, eliminating console CORS errors.
- **Groq Model Upgrades**: Replaced decommissioned Groq models in `llmService.js` with active, supported ones (`llama-3.3-70b-versatile` as flagship, and `llama-3.1-8b-instant` as fallback) to restore the chat assistant features.
- **Syntax / Lexical Scoping Fix**: Wrapped `case 3` in `CreateWorkbenchModal.jsx` with curly braces to scope the `const` declarations and avoid compiler/linter errors.
- **Vite Port Configuration**: Locked ports configuration in `vite.config.js` to align with the allowed origins of the FastAPI backend.
- **Invitation & API Auth Injection**: Resolved `401 Unauthorized`/`500` errors on the member invitation flow by implementing a global fetch interceptor in `main.jsx` to automatically append active Supabase session JWT tokens to all backend API requests, and proactively secured direct modal calls (`InviteMemberModal.jsx`, `ShareSnapshotModal.jsx`, `PartyModal.jsx`, `LabelModal.jsx`, `TransactionModal.jsx`).
- **Edge Functions → FastAPI Migration**: Removed all 6 remaining `supabase.functions.invoke()` calls from `backendService.js` and replaced them with local FastAPI endpoints (`/api/records/*` and `/api/subscriptions/*`). Created `records.py` (5 endpoints) and `subscriptions.py` (Razorpay). The frontend now has **zero** Supabase Edge Function dependencies — all backend calls go through `localhost:8000`.

## Tasks

### 1. Landing page & public experience
- [ ] Align homepage copy with Dabby MVP: COA, AR/AP, bank reconciliation, cash flow.
- [ ] Update CTA flows so signup/login drive actual onboarding and dashboard access.
- [ ] Add visible product messaging for Indian finance teams and GST-ready workflows.
- [ ] Replace generic template marketing with business accounting use cases.

### 2. Auth hardening
- [ ] Strengthen password validation in signup.
- [ ] Add explicit session expiration handling and auth error paths.
- [ ] Remove debugging output from auth utilities.
- [ ] Verify OAuth callback flow and safe redirect handling.

### 3. Protected route / onboarding flow
- [ ] Confirm `/dashboard/*` and core app pages are protected.
- [ ] Harden `ProtectedRoute` to prevent partial-profile access to dashboard.
- [ ] Add workspace role scaffolding in onboarding.
- [ ] Validate invite and shared snapshot access permissions.

### 4. Backend security
- [ ] Add auth dependencies and workspace membership checks to backend API routers.
- [ ] Externalize CORS origins for production use.
- [ ] Ensure API routes verify Supabase UID and deny unauthorized access.
- [ ] Audit backend routes for data exposure.

### 5. Product feature foundation
- [ ] Scaffold dashboard modules for COA, GL, AR, AP, bank reconciliation, and cash flow.
- [ ] Add onboarding steps for workspace setup and RBAC roles.
- [ ] Ensure data ingestion supports bank and invoice import flows.

### 6. Security & patching
- [ ] Audit `package.json` and `backend/requirements.txt` for outdated/vulnerable packages.
- [ ] Run lint and fix issues in landing/auth code.
- [ ] Confirm `.env` secrets are excluded and env loading is secure.

## First focus
1. Update landing page messaging and CTAs.
2. Secure auth onboarding flow.
3. Add MVP-aligned public copy in hero, feature sections, and final CTA.
