Dabby — Non-Zoho Document-First System Development Spec

(Supabase Canonical Backend Contract)

This document defines the complete logical system for building Dabby using Supabase.
It is authoritative and must be followed by backend, edge functions, and frontend.

No demo data.
No shortcuts.
No frontend writes to core tables.

1. SYSTEM PHILOSOPHY (NON-NEGOTIABLE)

Documents are the source of financial intent

Records represent interpreted business meaning

Ledger is immutable financial truth

All intelligence is derived, never stored

All writes happen via Edge Functions

Supabase RLS is the security boundary

If any feature violates the above, it is incorrect.

2. CORE SYSTEM STATES
2.1 User State
signed_up → profile_created(partial) → active


Rules:

partial → chat allowed, no workbench creation

active → full access

2.2 Workbench State
CREATED
→ DATA_COLLECTION_REQUIRED
→ DATA_UPLOADING
→ BOOTSTRAPPING
→ BOOTSTRAP_COMPLETE
→ LIVE
→ PARTIAL_DATA (if regressions)


Workbench state controls feature availability.

3. MODULE BREAKDOWN (DEPENDENCY ORDER)
Identity
→ Workbench
→ Semantic Base (Accounts + Parties)
→ Documents
→ Records
→ Ledger
→ Reconciliation
→ Intelligence
→ Compliance
→ Budgets


No module may bypass its dependencies.

4. IDENTITY & ACCESS (MODULE 0)
Tables
users
id uuid primary key references auth.users
email text
name text
phone text
dob date
gender text
plan text check (plan in ('free','go','pro','enterprise'))
created_at timestamp
updated_at timestamp


RLS:

Users can read/update their own profile only

5. WORKBENCH CORE (MODULE 1)
Tables
workbenches
id uuid primary key
name text
state text
history_window_months int
created_at timestamp

workbench_members
workbench_id uuid
user_id uuid
role text check (role in ('founder','ca','analyst','investor'))


Rules:

Founder is created automatically

Investors are always read-only

6. SEMANTIC BASE (MODULE 2)

This module gives meaning to money.

6.1 Chart of Accounts
workbench_accounts
id uuid primary key
workbench_id uuid
name text
account_type text
category text
cash_impact boolean


Must be auto-seeded on workbench creation:

Cash

Bank

Accounts Receivable

Accounts Payable

Revenue

Expense buckets

No UI editing initially.

6.2 Parties
workbench_parties
id uuid primary key
workbench_id uuid
name text
party_type text check (party_type in ('customer','vendor','both'))
gstin text
pan text


Auto-created by AI during record generation.

Investors cannot access this module.

7. DOCUMENT INGESTION (MODULE 3)
7.1 Documents (Raw Files)
workbench_documents
id uuid primary key
workbench_id uuid
file_path text
document_type text
processing_status text
uploaded_at timestamp


Rules:

Immutable

No financial meaning

Stored in private Supabase bucket

Access via signed URLs only

Document State Machine
UPLOADED
→ OCR_COMPLETE
→ AI_PARSED
→ RECORD_CREATED
→ PROCESSED

8. RECORDS — AI STRUCTURED INTENT (MODULE 4)

Records are reviewable interpretations, not truth.

workbench_records
id uuid primary key
workbench_id uuid
document_id uuid
record_type text
party_id uuid
gross_amount numeric
tax_amount numeric
net_amount numeric
issue_date date
due_date date
confidence_score numeric
status text check (status in ('draft','confirmed'))


Rules:

Created only by Edge Functions

Can be updated until confirmed

Confidence governs auto-confirmation

Confidence Logic
≥ 0.85 → auto-confirm
0.6–0.85 → review suggested
< 0.6 → mandatory review

9. LEDGER (MODULE 5 — IMMUTABLE)
Transactions
transactions
id uuid primary key
workbench_id uuid
record_id uuid
account_id uuid
counter_account_id uuid
amount numeric
direction text
transaction_date date
created_at timestamp


Rules:

Immutable

Never updated or deleted

Only created from confirmed records

Edge-function only writes

Adjustments (Audit Safe)
adjustments
id uuid primary key
original_transaction_id uuid
adjustment_amount numeric
reason text
created_by uuid
created_at timestamp


Net effect only via aggregation.

10. RECONCILIATION (MODULE 6)

Runs once during bootstrap, then incrementally.

Checks:

Cash vs bank statement

AR vs invoices

AP vs bills

Missing months

Tax mismatches

Outputs:

completeness_percentage

issues list

initial health score

Workbench state transitions:

BOOTSTRAPPING → BOOTSTRAP_COMPLETE

11. FINANCIAL INTELLIGENCE (MODULE 7)

No tables.
Only SQL views.

Derived from:

transactions

adjustments

accounts

Includes:

P&L

Balance Sheet

Cash Flow

KPIs

Investor metrics

⚠️ Never store derived values

12. COMPLIANCE ENGINE (MODULE 8)
compliances
id uuid primary key
workbench_id uuid
name text
period text
deadline date
status text


Auto-generated from records:

GST → taxable records

TDS → vendor payments

Investors: read-only

13. BUDGETS (MODULE 9)
budgets
id uuid primary key
workbench_id uuid
account_category text
allocated_amount numeric


Rules:

Soft constraints only

Never block transactions

Variance is derived

14. EDGE FUNCTION RESPONSIBILITIES

Frontend never writes directly.

Mandatory Functions

upload_document

parse_document_ocr

generate_record_from_document

confirm_record

create_ledger_entries

create_adjustment

run_reconciliation

Each function must:

Validate role

Validate workbench scope

Emit audit logs

15. RLS PATTERNS (ENFORCED)
Read (All Members)
exists (
  select 1 from workbench_members
  where workbench_id = table.workbench_id
  and user_id = auth.uid()
)

Write (Ops Only)
role in ('founder','ca','analyst')

Strict (No Investor)
role in ('founder','ca')

16. NO DEMO DATA RULES

No seeded fake transactions

No sample invoices

No default KPIs

No pre-filled budgets

System becomes meaningful only after document ingestion.

17. BUILD VALIDATION CHECKLIST (TRAE)

Before shipping:

✅ RLS blocks direct writes

✅ Ledger immutability enforced

✅ Records editable before confirmation only

✅ Documents traceable → records → ledger

✅ Derived views recompute correctly

✅ Investors cannot see parties/accounts


19. PLAN LIMITS & ENFORCEMENT (COMMERCIAL)

| Feature | Free | Go | Pro | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| Max Workbenches | 0 | 5 | 10 | Custom |
| Investor View | No | No | Yes | Yes |
| DocVault Uploads | N/A | Limited | High | Unlimited |
| Mapping Labels | N/A | Limited | Full | Custom |

Rules:
1. Free users have no workbench access.
2. Go users can create/join up to 5 workbenches.
3. Pro users have full access to investor views and advanced labels.
4. Enforcement must happen at both Frontend (UI masking) and Backend (RLS/Edge Functions).

18. FINAL SYSTEM GUARANTEE

If a company uploads only PDFs and bank statements,
Dabby must deterministically build a complete, auditable finance system.