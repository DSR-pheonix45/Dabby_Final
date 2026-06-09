# Dabby MVP (Final_main_V1) - Development Scope
**Target Launch:** 2 Days
**Target Market:** 1-10Cr Indian Companies
**Version:** 1.0.0-MVP

---

## EXECUTIVE SUMMARY

Dabby MVP is a **focused, production-ready accounting SaaS** targeting mid-market Indian companies (₹1-10 Cr annual revenue). We deliberately exclude 13 features to ship **7 critical features** that solve the core financial workflows in 2 days.

**Tagline:** *"Simple, compliant accounting for growing Indian businesses"*

### Key Metrics
- **Core Features:** 7 (not 20)
- **RBAC Roles:** 5
- **Target Companies:** ₹1-10Cr ARR
- **Deployment Timeline:** 48 hours
- **Initial Data Import:** CRM (Zoho, Salesforce), Bank Statements (PDF)

---

## PART 1: TARGET MARKET & USER PERSONAS

### Primary Buyer (Decision Maker)
**CFO / Finance Head**
- ₹1-10Cr company
- Uses Zoho CRM or Salesforce for customer/vendor management
- Receives bank statements via email (PDF)
- Currently uses Excel + manual reconciliation OR legacy software (Tally, Zoho Books)
- Pain: Multiple spreadsheets, compliance complexity, no real-time visibility

### End Users (by Role)

| Role | Usage | Access Level | Key Workflows |
|------|-------|--------------|----------------|
| **Admin** | System setup, user management, COA configuration | Full | All features, user invites, workspace settings |
| **CFO** | Strategic decisions, approvals, dashboard viewing | High | Dashboards, approvals, reports (read-heavy + approve GL entries) |
| **Accountant** | Daily GL, AP/AR operations, reconciliation | High | GL entries, create bills/invoices, bank recon, GSTR1 export |
| **Finance Analyst** | Reporting, forecasting, metrics | Medium | Dashboards, cash flow reports (read-only + filters) |
| **Operator** | AR/AP entry-level, data input | Low | Create invoices, record bills, basic GL posting |

### Geographic & Compliance Scope
- **Countries:** India (GST-registered businesses)
- **Company Size:** ₹1Cr - ₹10Cr turnover (Small & Medium Enterprises)
- **Industries:** General manufacturing, trading, services
- **Compliance:** GST (CGST/SGST/IGST) - TDS, e-invoicing, inventory to come in V2

---

## PART 2: 7 CORE MVP FEATURES

### Feature 1: Chart of Accounts (COA) & GL
**Purpose:** Foundation of all accounting
**User:** Admin (setup), Accountant (daily use)
**Input Sources:** Admin configuration, auto-population from feature templates
**Output Sources:** GL listing, trial balance, P&L draft
**Restrictions:** Accountant can view but not edit COA; Admin controls structure

---

### Feature 2: CRM Party Import (Leads → Accounts Receivable)
**Purpose:** Eliminate manual customer/vendor entry from Zoho CRM or Salesforce
**User:** Admin (setup), Accountant (trigger import)
**Input Sources:** Zoho CRM API, Salesforce API, CSV fallback
**Output Sources:** Party master in GL (linked to Debtors for AR, Creditors for AP)
**Restrictions:** Admin configures CRM connection; no real-time two-way sync

---

### Feature 3: Accounts Receivable (AR) - Invoicing & Payment Tracking
**Purpose:** Record customer invoices, track payments, aging reports
**User:** Accountant (create), Operator (support), CFO (approvals)
**Input Sources:** Party selection, line items, dates
**Output Sources:** Invoice PDF, AR aging report, GL impact
**Restrictions:** Operator cannot create invoices >₹5L (CFO approval required)

---

### Feature 4: Accounts Payable (AP) - Bill Management & Payments
**Purpose:** Record vendor bills, track due dates, payment workflows
**User:** Operator (record), Accountant (approve), CFO (strategic approvals)
**Input Sources:** Vendor selection, bill details, dates
**Output Sources:** Bill register, AP aging report, GL impact
**Restrictions:** Bills > ₹50K require CFO approval before payment

---

### Feature 5: Bank Reconciliation (PDF Bank Statement Upload)
**Purpose:** Match GL entries to bank statements, identify discrepancies
**User:** Accountant (primary), Finance Analyst (view)
**Input Sources:** Bank statement PDF, manual CSV fallback
**Output Sources:** Reconciliation report (PDF/Excel), GL adjustments if needed
**Restrictions:** Only PDF or CSV format; no real-time bank feeds in MVP

---

### Feature 6: COA Admin Dashboard (Setup + RBAC)
**Purpose:** Configure GL structure and assign roles before operations begin
**User:** Admin (first-time setup)
**Input Sources:** Industry template selection, team email, role assignment
**Output Sources:** COA configured, team set up with RBAC
**Restrictions:** One-time setup per workspace; requires admin role

---

### Feature 7: Cash Flow Dashboard (Simple Real-Time View)
**Purpose:** CFO sees cash position, upcoming needs, payables/receivables
**User:** CFO (primary), Accountant (view)
**Input Sources:** GL, AR aging, AP aging (auto-generated from Features 3-5)
**Output Sources:** Dashboard cards, PDF/Excel export
**Restrictions:** Read-only for non-CFO roles; exports for external stakeholders

---

## PART 3: FEATURES DEFERRED TO V2+ (Why Not in MVP)

| Feature | Why Deferred | Est. V2 Timeline |
|---------|-------------|-----------------|
| Inventory & COGS | Added complexity (FIFO, stock adjustments); won't block ₹1-10Cr sales | Q2 2025 |
| TDS & Deduction Accounting | Only needed by specific industries; GST sufficient for MVP | Q2 2025 |
| E-Invoicing (IRN/QR) | GST GSTR1 export sufficient; e-invoice can follow | Q2 2025 |
| Advanced Budgeting & Forecasting | Basic cash flow forecast sufficient | Q2 2025 |
| AI Chat (Dabby Consultant) | Distraction from core workflows; chat secondary in V2 | Q3 2025 |
| Document Vault & OCR | Bill/Invoice OCR can wait; manual entry fast enough | Q2 2025 |
| Multi-Currency | Assume INR only for MVP | Q3 2025 |
| Recurring Transactions | Manual entry sufficient for MVP | Q2 2025 |
| Data Room & Investor Features | Not core for ₹1-10Cr companies | Q3 2025 |
| Advanced Reporting | Excel export with pivot tables sufficient | Q2 2025 |
| Bank Feeds (Real-time) | PDF upload sufficient | Q2 2025 |
| Approval Workflows (Complex) | Simple bill threshold (>₹50K) sufficient | Q2 2025 |
| Compliance Calendar | Static GST dates sufficient | Q2 2025 |

**Total Deferred:** 13 features → MVP stays at 7

---

## PART 4: END-TO-END USER WORKFLOWS (VISUAL FLOWCHARTS)

### Workflow 1: First-Time Company Onboarding (Admin)
```
Admin logs in with company email (first time)
  ↓
System checks: "Is admin role assigned?"
  ↓
If NO → Show Welcome Screen
  ├─ Collect:
  │  ├─ Full name
  │  ├─ Phone number
  │  └─ Designation (Admin confirmed)
  ├─ DPDP Compliance Notice:
  │  └─ "We store your data securely per DPDP Act. Read privacy policy."
  └─ Save: Encrypted in users table
  ↓
Step 1: Choose Industry Template
  ├─ Services (default)
  ├─ Trading
  └─ Manufacturing
  ├─ Selection → COA auto-loaded
  └─ Admin can customize/rename accounts
  ↓
Step 2: Invite Team
  ├─ Enter team emails
  ├─ Assign roles (Admin, CFO, Accountant, Analyst, Operator)
  └─ Send invites (emails sent)
  ↓
Step 3: Import Customers/Vendors from CRM
  ├─ Connect Zoho CRM or Salesforce (OAuth)
  ├─ Map fields (auto-suggested)
  ├─ Review preview (first 10 rows)
  └─ Confirm → Parties created
  ↓
Step 4: Upload First Bank Statement
  ├─ Upload PDF (monthly statement)
  ├─ System parses transactions
  └─ Confirm → Ready for reconciliation
  ↓
Dashboard Status:
  ├─ ✓ COA configured
  ├─ ✓ Team invited
  ├─ ✓ Parties imported
  ├─ ✓ Bank sync ready
  └─ "You're ready! Accountant can now record bills & invoices"
```

### Workflow 2: Daily Accounting (Accountant)
```
Accountant logs in
  ↓
Dashboard shows:
  ├─ Pending bills (to post/approve)
  ├─ Pending invoices (to follow up)
  ├─ Reconciliation needed
  └─ GL health check
  ↓
Task 1: Record Vendor Bill (AP)
  ├─ Click "New Bill"
  ├─ Select Vendor
  ├─ Enter: Bill Date, Bill #, Amount, Line Items
  ├─ If > ₹50K → Status = "Awaiting CFO Approval"
  │  └─ Notification sent to CFO
  ├─ If < ₹50K → Auto-approved
  └─ GL posts: DR Expense / CR Creditors
  ↓
Task 2: Record Customer Invoice (AR)
  ├─ Click "New Invoice"
  ├─ Select Customer
  ├─ Enter: Invoice Date, Due Date, Line Items
  ├─ GST auto-split (18% CGST + 18% SGST)
  └─ GL posts: DR Debtors / CR Revenue
  ↓
Task 3: Reconcile Bank Statement
  ├─ Upload PDF statement
  ├─ System auto-matches transactions
  ├─ Manual review of unmatched items
  └─ Finalize → Report generated
  ↓
Task 4: View Reports
  ├─ Trial Balance (GL totals)
  ├─ P&L Draft (Revenue - Expenses)
  ├─ AR Aging (pending invoices)
  ├─ AP Aging (pending bills)
  └─ Export as Excel
```

### Workflow 3: Approvals (CFO)
```
CFO logs in
  ↓
Dashboard shows:
  ├─ Pending approvals (bills > ₹50K)
  ├─ Current bank balance
  ├─ 7-day payables forecast
  ├─ 7-day receivables forecast
  └─ Cash runway estimate
  ↓
Task: Review & Approve Bill
  ├─ Click "Pending Approvals"
  ├─ List shows: Vendor, Amount, Bill Date, Department
  ├─ Click bill to see details
  ├─ Click "Approve" or "Reject"
  │  ├─ If Approve → Bill status = "Approved"
  │  │   └─ Accountant can now record payment
  │  └─ If Reject → Return to Accountant
  └─ Notification sent to Accountant
  ↓
Task: View Cash Position
  ├─ Bank balance: ₹5,00,000
  ├─ AR outstanding: ₹10,00,000
  ├─ AP pending: ₹3,00,000
  ├─ Net position: ₹7,00,000 (surplus)
  ├─ 7-day payables needed: ₹2,00,000
  └─ 30-day runway: 15 days (warning)
  ↓
Optional: Export Report for Stakeholders
  ├─ Click "Download Report"
  └─ PDF snapshot sent
```

### Workflow 4: CRM Party Import (Admin/Monthly)
```
Admin navigates to: Admin → Integrations → CRM Import
  ↓
Step 1: Select CRM Platform
  ├─ Zoho CRM
  ├─ Salesforce
  └─ CSV Upload (fallback)
  ↓
Step 2a: Connect Zoho CRM
  ├─ Click "Connect Zoho"
  ├─ Redirected to Zoho login
  ├─ Grant permission to access contacts
  └─ Return to Dabby (connection confirmed)
  ↓
Step 3: Map Fields
  ├─ Zoho: contact_name → Dabby: party_name
  ├─ Zoho: email → Dabby: email
  ├─ Zoho: phone → Dabby: phone
  └─ Confirmation: "Looks good?"
  ↓
Step 4: Select Scope
  ├─ Import all contacts
  ├─ Only customers (tagged "Customer" in CRM)
  └─ Only vendors (tagged "Vendor" in CRM)
  ├─ Preview: "Found 250 contacts"
  └─ Select scope
  ↓
Step 5: De-duplication Check
  ├─ "45 already imported (will update)"
  ├─ "205 new parties (will insert)"
  └─ Confirm to proceed
  ↓
Step 6: Import Complete
  ├─ Parties created in GL
  ├─ Linked to "Debtors" (customers) and "Creditors" (vendors)
  └─ Accountant can now use parties in invoice/bill creation
```

### Workflow 5: Bank Reconciliation (Accountant)
```
Accountant logs in → Dashboard shows: "New bank statement ready"
  ↓
Click "Reconcile Bank"
  ↓
Step 1: Upload Bank Statement
  ├─ Drag-drop PDF or browse
  ├─ Select file (monthly bank statement from email)
  └─ Click "Process"
  ↓
Step 2: PDF Parsing
  ├─ System extracts: Date | Cheque # | Description | Debit | Credit
  ├─ Success → "Parsed 25 transactions"
  └─ Failure → "Upload CSV instead?" (template provided)
  ↓
Step 3: Auto-Matching
  ├─ GREEN (matched): 18 txns (amount + cheque # = GL)
  ├─ YELLOW (likely): 4 txns (amount match, date ±3 days)
  ├─ RED (unmatched bank): 3 txns (no GL entry)
  └─ GRAY (GL pending): 2 txns (no bank match, clearing next month)
  ↓
Step 4: Manual Review
  ├─ Review YELLOW rows → Click "This is a match" or "Mark pending"
  ├─ Review RED rows → "Create GL entry" or "Mark awaiting"
  └─ Review GRAY rows → "Clearing next month"
  ↓
Step 5: Reconciliation Summary
  ├─ Starting balance: ₹5,00,000
  ├─ + Deposits: ₹10,00,000
  ├─ - Cheques: ₹9,50,000
  ├─ = Ending balance: ₹5,50,000
  ├─ Compare to bank stmt: ₹5,50,000 ✓ MATCH
  └─ Status: "Reconciled ✓"
  ↓
Step 6: Save & Report
  ├─ Click "Finalize"
  ├─ All matched items marked reconciled
  ├─ Report generated (PDF/Excel)
  └─ Download or email to auditor
```

---

## PART 5: RBAC PERMISSIONS MATRIX

| Action | Admin | CFO | Accountant | Analyst | Operator |
|--------|-------|-----|------------|---------|----------|
| **COA Management** | Create, Edit, Delete | View | View | View | — |
| **Team Management** | Invite, Roles, Remove | — | — | — | — |
| **CRM Integration** | Configure, Import | — | — | — | — |
| **GL Entry View** | Full history | View current | Full history | View current | — |
| **GL Entry Create** | Manual (rare) | — | Via AP/AR | — | — |
| **Create Bill (AP)** | ✓ | ✓ | ✓ | — | ✓ |
| **Approve Bill >₹50K** | ✓ | ✓ | ✓ (own only) | — | — |
| **Record Payment (AP)** | ✓ | — | ✓ | — | — |
| **Create Invoice (AR)** | ✓ | ✓ | ✓ | — | ✓ |
| **Record Payment (AR)** | ✓ | — | ✓ | — | — |
| **Bank Reconciliation** | ✓ | — | ✓ | View report | — |
| **View Dashboards** | ✓ | ✓ | ✓ | ✓ | — |
| **Export Reports** | ✓ | ✓ | ✓ | ✓ | — |
| **System Settings** | ✓ | — | — | — | — |

---

## PART 6: DATA SECURITY & COMPLIANCE (DPDP ACT)

### PII Collection & Storage
1. **First Login:** Collect full name, phone, email (via OAuth), designation
2. **Storage:** Encrypted in `users` table (phone hashed, PII in secure column)
3. **Compliance Notice:** Show privacy notice on first login

### Data Access Control
- Users can only see their workspace data (JWT scope + RLS)
- Admin can view team info (for management only)
- No cross-workspace data leakage

### Audit Trail
- Log all GL modifications (audit table)
- Log approvals and payments
- Maintain immutable record for tax/audit purposes

---

## PART 7: DEPLOYMENT ARCHITECTURE

### Frontend
- **Host:** Vercel
- **Build:** `vite build`
- **Environment:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE_URL`
  - `VITE_RECAPTCHA_SITE_KEY`

### Backend
- **Host:** Docker container
- **Port:** 8000 (Uvicorn)
- **Environment:**
  - `SUPABASE_SERVICE_ROLE_KEY` (required)
  - `DATABASE_URL` (Supabase PostgreSQL)
  - `FRONTEND_ORIGIN` (CORS)
  - CRM API keys (Zoho, Salesforce)

### Database
- **Supabase PostgreSQL**
- **No new extensions** (MVP uses standard SQL)

---

## PART 8: 2-DAY IMPLEMENTATION ROADMAP

### Day 1 (12 hours)

**Morning (6h):** Backend setup, database schema, RBAC middleware
- FastAPI project initialization
- Supabase schema (users, workbenches, accounts, invoices, bills, parties, bank_transactions, reconciliation_mappings)
- RLS policies for multi-tenancy
- RBAC middleware (role guards on endpoints)

**Afternoon (6h):** Frontend setup + Features 1 & 6
- Vite + React setup
- Supabase auth integration
- Admin dashboard UI (COA builder, team invite, role assignment)
- Health check testing

### Day 2 (12 hours)

**Morning (6h):** Features 2, 3, 4 (CRM Import, AR, AP)
- CRM import endpoints (Zoho, Salesforce OAuth)
- Invoice CRUD + GL posting
- Bill CRUD + approval workflow

**Afternoon (6h):** Features 5, 7 + Testing + Deploy
- Bank reconciliation (PDF parsing, auto-match, manual review)
- Cash flow dashboard
- End-to-end testing + security audit
- Docker build + Vercel deployment

---

## PART 9: CRITICAL DATABASE TABLES

```sql
-- Minimal schema for MVP

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  phone_hash VARCHAR,
  role VARCHAR DEFAULT 'Operator',
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  owner_id UUID REFERENCES users(id),
  industry VARCHAR,
  gst_number VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  code VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  type VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  invoice_number VARCHAR UNIQUE NOT NULL,
  party_id UUID REFERENCES parties(id),
  invoice_date DATE,
  due_date DATE,
  total_amount NUMERIC(12,2),
  status VARCHAR DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bills (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  bill_number VARCHAR UNIQUE NOT NULL,
  party_id UUID REFERENCES parties(id),
  bill_date DATE,
  due_date DATE,
  total_amount NUMERIC(12,2),
  status VARCHAR DEFAULT 'Draft',
  approval_status VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parties (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  party_type VARCHAR,
  crm_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  transaction_date DATE,
  description VARCHAR,
  debit NUMERIC(12,2),
  credit NUMERIC(12,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reconciliation_mappings (
  id UUID PRIMARY KEY,
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  ledger_entry_id UUID,
  status VARCHAR DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  account_id UUID REFERENCES accounts(id),
  debit NUMERIC(12,2),
  credit NUMERIC(12,2),
  posting_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## PART 10: PRE-DEPLOYMENT CHECKLIST

### Functional Tests
- [ ] User signup → COA setup → team invite (E2E)
- [ ] CRM import (Zoho/Salesforce) → parties created
- [ ] Create invoice → GL posts → Verify GL balance
- [ ] Create bill > ₹50K → CFO approval → Payment recording
- [ ] Bank reconciliation: PDF → Auto-match → Manual review → Finalize
- [ ] Cash flow dashboard: Shows AR/AP/bank/runway

### Security Tests
- [ ] JWT tokens per workspace
- [ ] Row-level security prevents cross-workspace leakage
- [ ] DPDP compliance: PII encrypted
- [ ] CORS configured (frontend origin only)

### Performance Tests
- [ ] Invoice creation <500ms
- [ ] Bank recon (100 txns) <2s
- [ ] Dashboard load <1s

---

## SUMMARY

**Dabby MVP (Final_main_V1):** 2-day deployable, focused on 7 core features for ₹1-10Cr Indian companies with 5 RBAC roles, GST compliance, and clean workflows.

**Next Steps:**
1. ✅ Finalize scope (this document)
2. Create frontend UI mockups (Figma)
3. Create backend API specs (Swagger)
4. Set up database schema
5. Implement features (Day 1-2)
6. Testing & bug fixes
7. Deploy to Vercel + Docker
8. Pilot customer launch

