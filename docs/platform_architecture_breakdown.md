# 🏗️ Dabby Platform — Architectural & Component Breakdown

> **Branch**: `fintech-overhaul`  
> **Target Audience**: Core Development Team & System Architects  
> **Last Updated**: September 2026

---

## 📌 Executive Architecture Summary

Dabby is a **document-first, deterministic financial operating platform**. It converts unstructured operational documents (invoices, receipts, shipping manifests, bank statements) into structured business intent (Universal Financial Objects), categorizes them into immutable business events, and automatically compiles balanced double-entry accounting transactions.

```mermaid
flowchart LR
    subgraph Frontend [React SPA (Vite)]
        AuthUI[Auth & Onboarding]
        DocUI[DocVault & Uploader]
        OpsUI[Parties & Trade Engine]
        LedgerUI[COA & Double-Entry Ledger]
    end

    subgraph Gateway [Vercel & FastAPI]
        Vercel[Vercel Rewrites /api/*]
        FastAPI[FastAPI Backend - Railway]
        Worker[Redis Async Task Queue]
    end

    subgraph AI Pipeline [Multi-LLM]
        Groq[Groq Pool - Fast JSON Parsing]
        Gemini[Gemini Flash - Vision OCR]
    end

    subgraph Persistence [Supabase PostgreSQL]
        DB[(PostgreSQL + RLS)]
        Storage[(Document Storage Bucket)]
        SQLViews[Financial Intelligence Views]
    end

    Frontend --> Gateway
    FastAPI --> AI Pipeline
    FastAPI --> Persistence
```

---

## 🔐 1. Authentication & Identity Module

### **1.1 Login Setup**
- **UI Component**: [`src/Auth/Login.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/Auth/Login.jsx)
- **State & Form Fields**:
  - `email` *(string, required)*: User email address.
  - `password` *(string, required)*: User authentication password.
  - `showPassword` *(boolean toggle)*: Toggles password visibility.
  - `consentChecked` *(boolean checkbox)*: Mandatory security & terms agreement.
  - `captchaPassed` *(boolean)*: Dynamic shape-selection bot verification.
  - `captchaTarget` / `captchaOptions` *(array)*: Interactive challenge target (`▲`, `■`, `●`, `♥`, `★`).
- **Backend Service & Route**:
  - `Supabase Auth`: `supabase.auth.signInWithPassword({ email, password })`
  - `OAuth`: `supabase.auth.signInWithOAuth({ provider: 'google' })`

### **1.2 Signup & User Provisioning**
- **UI Component**: [`src/Auth/Signup.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/Auth/Signup.jsx)
- **State & Form Fields**:
  - `email` *(string, required)*
  - `password` *(string, min 8 chars)*
  - `showPassword` *(boolean toggle)*
  - `consentChecked` *(boolean)*
  - `captchaPassed` *(boolean)*
- **Backend Service & Database Action**:
  - `supabase.auth.signUp()`
  - Auto-inserts profile record into `users` table: `(id, email, created_at, plan='go')`.

### **1.3 Session & Route Guarding**
- **UI Components**: [`src/Auth/ProtectedRoute.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/Auth/ProtectedRoute.jsx), [`src/Auth/OAuthCallback.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/Auth/OAuthCallback.jsx)
- **Session State**: `user`, `profile`, `session`, `loading`, `redirectPath`.

---

## 🚀 2. Onboarding & Initial Workspace Provisioning

### **2.1 Multi-Step Onboarding Wizard**
- **UI Components**: [`src/pages/Onboarding.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/Onboarding.jsx), [`src/components/Onboarding/StepIndicator.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/Onboarding/StepIndicator.jsx)
- **Form Fields by Step**:
  - **Step 1 — Personal Details**:
    - `fullName` *(string)*: User display name.
    - `phone` *(string)*: Contact phone number.
    - `dateOfBirth` *(date string)*: Date of birth.
    - `gender` *('male' | 'female' | 'other')*: Profile demographic.
  - **Step 2 — Business Context**:
    - `userRole` *('founder' | 'ca' | 'analyst' | 'investor')*: Platform access tier.
    - `companyName` *(string)*: Organization name.
    - `industry` *(string)*: Business domain.
    - `historyMonths` *(number, range: 1–36)*: Historical ledger import window.
  - **Step 3 — Chart of Accounts Template**:
    - `coaTemplate` *('standard_indian_accounting' | 'saas' | 'trade_logistics' | 'custom')*
- **Backend Seeding Logic**:
  - [`backend/services/coa_seeder.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/coa_seeder.py)
  - Endpoint: `POST /api/context/bootstrap`

---

## 🏢 3. Workbench & Multi-Tenant Management Module

### **3.1 Workbench Selection & Creation**
- **UI Components**: [`src/pages/Workbenches.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/Workbenches.jsx), [`src/components/Workbenches/CreateWorkbenchModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/Workbenches/CreateWorkbenchModal.jsx)
- **Form Fields**:
  - `name` *(string)*: Workbench workspace name.
  - `history_window_months` *(integer, default 12)*
  - `industry_template` *(dropdown selection)*
- **Backend Endpoints**:
  - `GET /api/context/workbenches`: List user workbenches.
  - `POST /api/context/workbenches`: Provision new workbench tenant workspace.

### **3.2 Collaboration & Team Access Control**
- **UI Components**: [`src/pages/workbench/Members.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/Members.jsx), [`src/pages/workbench/AddMemberModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/AddMemberModal.jsx), [`src/pages/workbench/RoleChangeModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/RoleChangeModal.jsx)
- **Form Fields**:
  - `email` *(string)*: Target invitee email.
  - `role` *('founder' | 'ca' | 'analyst' | 'investor')*: Permission scoping.
- **Backend Endpoint**:
  - [`backend/routers/collaboration.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/collaboration.py): `GET /api/collaboration/members`, `POST /api/collaboration/members`, `DELETE /api/collaboration/members/{user_id}`

---

## 📂 4. Document Ingestion & Vault Module (DocVault)

### **4.1 Document Uploader & Processing Trigger**
- **UI Components**: [`src/components/FileUploader.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/FileUploader.jsx), [`src/components/DocVault/DocVaultUploadModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/DocVault/DocVaultUploadModal.jsx)
- **Upload Parameters**:
  - `files` *(File[])*: Uploaded raw documents (PDF, JPG, PNG).
  - `document_type` *('invoice' | 'receipt' | 'bank_statement' | 'tax_form' | 'auto_detect')*
  - `workbench_id` *(uuid)*: Active workspace ID.
- **Backend Ingestion Pipeline**:
  - [`backend/routers/di_documents.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/di_documents.py): `POST /api/di/documents/upload`

### **4.2 Processing State Machine & Document Explorer**
- **UI Pages**: [`src/pages/workbench/DocVault/DocVault.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/DocVault/DocVault.jsx), [`src/pages/DataIngestion.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/DataIngestion.jsx)
- **Document Model**:
  - `id` *(uuid)*: Unique document record ID.
  - `file_name` *(string)*: Original file title.
  - `file_path` *(string)*: Private bucket storage key.
  - `processing_status` *('UPLOADED' | 'OCR_COMPLETE' | 'AI_PARSED' | 'RECORD_CREATED' | 'PROCESSED')*
  - `confidence_score` *(float 0.0 – 1.0)*: Extraction certainty rating.
- **Backend Services**:
  - [`backend/services/ai_service.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/ai_service.py): Vision OCR & Extraction using Gemini Flash & Groq Pool.
  - [`backend/services/bank_statement_parser.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/bank_statement_parser.py): Structured CSV/PDF statement parser.

---

## 🤝 5. Party Management Module (Vendors & Customers)

### **5.1 Party Directory & Setup Wizard**
- **UI Components**: [`src/pages/workbench/Parties.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/Parties.jsx), [`src/pages/workbench/AddPartyModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/AddPartyModal.jsx)
- **Form Fields**:
  - `name` *(string, required)*: Business entity name.
  - `party_type` *('customer' | 'vendor' | 'both')*: Party classification.
  - `gstin` *(string, 15-char alpha-numeric)*: Indian GST Identification Number.
  - `pan` *(string, 10-char, auto-derived from GSTIN characters 3..12)*: Permanent Account Number.
  - `email` *(string)*: Primary billing contact email.
  - `phone` *(string)*: Contact phone number.
  - `bank_account_number` *(string)*: Settlement account number.
  - `ifsc_code` *(string)*: Indian Financial System Code.
- **Backend Service & Route**:
  - [`backend/routers/ops.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/ops.py): `GET /api/ops/parties`, `POST /api/ops/parties`

### **5.2 Party Financial Analytics Modal**
- **UI Component**: [`src/pages/workbench/PartyAnalyticsModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/PartyAnalyticsModal.jsx)
- **Analytics Metrics**:
  - `dso` *(Days Sales Outstanding)*: Average days to collect customer payments.
  - `dpo` *(Days Payable Outstanding)*: Average days to clear vendor invoices.
  - `ltv` *(Lifetime Value)*: Total cumulative transaction volume.
  - `outstanding_balance` *(numeric)*: Net pending balance.
  - `aging_buckets` *(object)*: `{ '0_30': amount, '31_60': amount, '61_90': amount, '90_plus': amount }`.

---

## 📊 6. Semantic Base & Chart of Accounts (COA) Module

### **6.1 Chart of Accounts Hierarchy**
- **UI Component**: [`src/pages/workbench/COA.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/COA.jsx)
- **COA Account Structure**:
  - `account_code` *(string)*: Ledger identification code (e.g. `1000`, `2100`).
  - `name` *(string)*: Account title (e.g. "HDFC Operating Bank", "Trade Accounts Payable").
  - `account_type` *('asset' | 'liability' | 'equity' | 'revenue' | 'expense')*
  - `category` *('cash_and_bank' | 'accounts_receivable' | 'accounts_payable' | 'opex' | 'cogs' | 'tax_payable')*
  - `cash_impact` *(boolean)*: True if account directly affects cash reserves.
  - `current_balance` *(numeric)*: Real-time aggregated balance.
- **Backend Services**:
  - [`backend/routers/di_coa.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/di_coa.py): `GET /api/di/coa`, `POST /api/di/coa`

### **6.2 AI Account Translation & Auto-Mapping**
- **Backend Schema & Service**:
  - [`backend/schemas/coa_translation.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/schemas/coa_translation.py)
  - [`backend/routers/coa_translation.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/coa_translation.py)
- **Payload & Attributes**: `raw_account_name`, `suggested_coa_account_id`, `translation_confidence`, `mapping_rule`.

---

## ⚡ 7. Business Event & Record Verification Pipeline

### **7.1 Record Inspection & Kanban Board**
- **UI Components**: [`src/pages/TradeEngine.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/TradeEngine.jsx), [`src/pages/workbench/ops/OpsDashboard.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/ops/OpsDashboard.jsx)
- **Record Schema**:
  - `record_id` *(uuid)*
  - `document_id` *(uuid)*
  - `record_type` *('INVOICE' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL_ENTRY')*
  - `party_id` *(uuid)*
  - `gross_amount` *(numeric)*, `tax_amount` *(numeric)*, `net_amount` *(numeric)*
  - `issue_date` *(date)*, `due_date` *(date)*
  - `status` *('DRAFT' | 'REVIEW_REQUIRED' | 'CONFIRMED')*
- **Backend Service**:
  - [`backend/services/business_event_registry.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/business_event_registry.py)
  - Endpoint: `POST /api/business-events`

---

## 📖 8. Universal Double-Entry Ledger & Day Book Module

### **8.1 Ledger Viewer & Double-Entry Journal Inspector**
- **UI Component**: [`src/pages/workbench/LedgerView.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/LedgerView.jsx)
- **Journal Entry Data Model**:
  - `transaction_id` *(uuid)*
  - `transaction_date` *(date)*
  - `reference_doc_id` *(uuid)*
  - `narration` *(text description)*
  - `entries` *(array of balanced debit/credit lines)*:
    - `entry_id` *(uuid)*
    - `account_id` *(uuid)*
    - `account_name` *(string)*
    - `debit_amount` *(numeric)*
    - `credit_amount` *(numeric)*
- **Backend Services**:
  - [`backend/services/ledger_compiler.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/ledger_compiler.py)
  - [`backend/services/ledger_service.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/ledger_service.py)
  - Endpoint: `GET /api/di/ledger/transactions`

### **8.2 OPEX & Petty Cash Logger Modal**
- **UI Component**: [`src/pages/workbench/PettyCashModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/PettyCashModal.jsx)
- **Form Fields**:
  - `expense_title` *(string)*: Expense title.
  - `amount` *(numeric)*: Spend amount.
  - `payment_source_account_id` *(Cash/Bank COA account ID)*
  - `target_expense_account_id` *(OPEX COA account ID)*
  - `date` *(date string)*
  - `receipt_file` *(optional attached document)*
  - `narration` *(narrative string for Day Book log)*
- **Backend Router**: [`backend/routers/petty_cash.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/petty_cash.py)

---

## 🚢 9. Trade & Logistics Operations Engine

### **9.1 Vessel Operations & Trade Modal**
- **UI Components**: [`src/pages/TradeEngine.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/TradeEngine.jsx), [`src/pages/workbench/AddVesselModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/AddVesselModal.jsx)
- **Form Fields**:
  - `vessel_name` *(string)*: Name of cargo vessel.
  - `imo_number` *(string)*: International Maritime Organization identifier.
  - `port_of_loading` *(string)*: Departure port.
  - `port_of_discharge` *(string)*: Destination port.
  - `bl_number` *(string)*: Bill of Lading reference.
  - `lc_number` *(string)*: Letter of Credit reference.
- **Backend Services**:
  - [`backend/services/inventory_service.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/inventory_service.py)
  - [`backend/services/settlement_engine.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/settlement_engine.py)

---

## 💼 10. Employee Expense Portal & Claims Engine

### **10.1 Employee Reimbursement Portal**
- **UI Components**: [`src/pages/EmployeeExpensePortal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/EmployeeExpensePortal.jsx), [`src/pages/workbench/EmployeeClaimsModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/EmployeeClaimsModal.jsx)
- **Form Fields**:
  - `claim_title` *(string)*
  - `employee_id` *(uuid)*
  - `expense_category` *('travel' | 'meals' | 'software' | 'office_supplies' | 'other')*
  - `amount` *(numeric)*
  - `receipt_upload` *(file object)*
  - `reimbursement_status` *('PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED')*
- **Backend Router**: [`backend/routers/ops.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/ops.py) (`/api/ops/claims`)

---

## 📑 11. Reports, Generator & Investor Intelligence

### **11.1 Financial Statement Generator**
- **UI Components**: [`src/pages/workbench/ReportsModal.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/ReportsModal.jsx), [`src/pages/workbench/GeneratorPage.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/pages/workbench/GeneratorPage.jsx)
- **Generated Output Formats**:
  - Profit & Loss Statement (P&L)
  - Balance Sheet
  - Cash Flow Statement
  - Trial Balance
  - GST Summary Reports (GSTR-1, GSTR-3B)

### **11.2 Investor Metrics & Dashboard**
- **Backend Service**: [`backend/services/investor_service.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/services/investor_service.py)
- **Real-Time SQL View Metrics**: `MRR`, `Net Burn Rate`, `Runway (Months)`, `Gross Margin %`, `Accounts Receivable Aging`.

---

## 🤖 12. AI Copilot & Voice Interface

### **12.1 Conversational Financial Assistant**
- **UI Components**: [`src/components/ChatArea/ChatArea.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/ChatArea/ChatArea.jsx), [`src/components/ChatInput/ChatInput.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/ChatInput/ChatInput.jsx), [`src/components/VoiceInput/VoiceInput.jsx`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/src/components/VoiceInput/VoiceInput.jsx)
- **State & Data Payload**:
  - `messages` *(Array of { id, role, content, metadata })*
  - `isListening` *(boolean SpeechRecognition state)*
  - `transcript` *(live voice-to-text string)*
- **Backend Services & Routes**:
  - [`backend/routers/ai.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/ai.py): `POST /api/ai/chat`
  - [`backend/routers/tasks.py`](file:///c:/Users/Medhansh%20Pc/Desktop/Dabby_Final/backend/routers/tasks.py): `POST /api/tasks`

---

## 🗃️ Appendix: Database Table Summary

| Table Name | Primary Key | Description & RLS Scope |
| :--- | :--- | :--- |
| `users` | `id (uuid)` | Core user profile data. User self-access RLS. |
| `workbenches` | `id (uuid)` | Multi-tenant organization workspace container. |
| `workbench_members` | `(workbench_id, user_id)` | Tenant role permissions (`founder`, `ca`, `analyst`, `investor`). |
| `workbench_accounts` | `id (uuid)` | Chart of Accounts records per workbench. |
| `workbench_parties` | `id (uuid)` | Customer and Vendor master records. |
| `workbench_documents` | `id (uuid)` | Document metadata and storage bucket pointers. |
| `workbench_records` | `id (uuid)` | AI-extracted UFO record interpretations. |
| `transactions` | `id (uuid)` | Immutable double-entry transaction headers. |
| `transaction_entries` | `id (uuid)` | Debit/Credit balance lines linked to COA accounts. |

