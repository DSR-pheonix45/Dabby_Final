-- ============================================================
-- Dabby Phase 1: Analysis Note Pipeline
-- Migration 011 — Analysis Notes Infrastructure
-- ============================================================
-- Run this in Supabase SQL editor BEFORE deploying new code.
-- Tables are additive — no existing tables are modified.
-- ============================================================


-- ─────────────────────────────────────────────
-- 1. OCR Raw Output Store
--    Immutable per-document raw extraction result.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ocr_raw_output (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID NOT NULL REFERENCES workbench_documents(id) ON DELETE CASCADE,
    workbench_id        UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,

    -- Raw text extracted from document (concatenated across pages)
    raw_text            TEXT,

    -- Structured tables found in document: [{ "headers": [], "rows": [[]] }]
    tables              JSONB DEFAULT '[]',

    -- Named entities extracted: { dates, amounts, organizations, gstin_numbers, bank_accounts }
    entities            JSONB DEFAULT '{}',

    -- Which engine produced this output
    extraction_method   TEXT CHECK (extraction_method IN (
                            'gemini_vision', 'groq_text', 'aggregated', 'fallback'
                        )),

    page_count          INTEGER DEFAULT 1,
    processing_time_ms  INTEGER,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_raw_output_document  ON ocr_raw_output(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_raw_output_workbench ON ocr_raw_output(workbench_id);


-- ─────────────────────────────────────────────
-- 2. Document Classifications
--    Stores classifier output per document.
--    One row per classification attempt; newest is authoritative.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_classifications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id             UUID NOT NULL REFERENCES workbench_documents(id) ON DELETE CASCADE,
    workbench_id            UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,

    document_type           TEXT CHECK (document_type IN (
                                'sales_invoice', 'vendor_invoice',
                                'customer_payment_receipt', 'vendor_payment_receipt',
                                'expense_receipt', 'bank_statement',
                                'payroll_register', 'credit_note', 'debit_note',
                                'purchase_order', 'sales_order',
                                'loan_agreement', 'investment_agreement',
                                'tax_document', 'unknown'
                            )),

    confidence              NUMERIC NOT NULL DEFAULT 0.0,

    -- Human-readable explanation of why this type was selected
    reasoning               TEXT,

    -- List of signals that led to classification (keywords, patterns, LLM hints)
    classification_signals  JSONB DEFAULT '[]',

    -- 'heuristic' = keyword/pattern match only, 'llm' = LLM confirmed, 'combined' = both
    classifier_version      TEXT DEFAULT '1.0',
    classification_method   TEXT CHECK (classification_method IN ('heuristic', 'llm', 'combined')),

    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_classifications_document  ON document_classifications(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_classifications_workbench ON document_classifications(workbench_id);


-- ─────────────────────────────────────────────
-- 3. Analysis Notes
--    Canonical, immutable business-event records.
--    Every document produces exactly one active note.
--    Re-analysis produces a new note; old note is SUPERSEDED.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_notes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    document_id         UUID NOT NULL REFERENCES workbench_documents(id) ON DELETE CASCADE,
    workbench_id        UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,

    -- Canonical document type (mirrors document_classifications.document_type)
    document_type       TEXT NOT NULL,

    -- ── Three-dimensional confidence ─────────────────────────
    -- {
    --   "ocr_quality":        0.0–1.0,   (how cleanly the document was read)
    --   "classification":     0.0–1.0,   (certainty of document_type assignment)
    --   "field_completeness": 0.0–1.0,   (fraction of required fields populated)
    --   "overall":            0.0–1.0    (min of the three — weakest link wins)
    -- }
    confidence          JSONB NOT NULL DEFAULT '{"ocr_quality":0,"classification":0,"field_completeness":0,"overall":0}',

    -- ── Core Extracted Data ───────────────────────────────────
    document_metadata   JSONB DEFAULT '{}',
    -- { document_id, document_date, currency, language, document_number }

    parties             JSONB DEFAULT '{}',
    -- { issuer: {name, gstin, address}, recipient: {name, gstin, address} }

    amounts             JSONB DEFAULT '{}',
    -- { subtotal, tax_amount, discount, total_amount, currency }
    -- For bank_statement: { opening_balance, closing_balance, total_credits, total_debits, net_cash_flow }

    dates               JSONB DEFAULT '{}',
    -- { document_date, due_date, payment_date, period_start, period_end }

    document_references  JSONB DEFAULT '{}',
    -- { invoice_number, po_number, so_number, reference_invoice, transaction_reference,
    --   agreement_number, challan_number, filing_period, payroll_period }

    -- ── Business Context ──────────────────────────────────────
    -- Pure business language — NO accounting terms
    -- {
    --   "intent": "CUSTOMER_BILLED",           (from INTENT_MAP — deterministic)
    --   "cash_direction": "INBOUND",           (INBOUND | OUTBOUND | MIXED | NONE)
    --   "economic_effect": "..."               (plain-English description)
    -- }
    business_context    JSONB DEFAULT '{}',

    -- ── Line Items ────────────────────────────────────────────
    -- Array of { description, quantity, unit_price, amount, tax_rate, tax_amount }
    -- For bank_statement: array of transaction objects
    line_items          JSONB DEFAULT '[]',

    -- ── Evidence ─────────────────────────────────────────────
    -- Raw signals that supported the extraction
    -- { raw_text_snippet, ocr_extraction_method, page_count, extraction_timestamp }
    evidence            JSONB DEFAULT '{}',

    -- ── Settlement Data ───────────────────────────────────────
    -- Reconciliation / validation metadata
    -- For bank_statement: { balance_verified, expected_closing, difference }
    settlement          JSONB DEFAULT '{}',

    -- ── Settlement Key (The Moat) ─────────────────────────────
    -- Cross-document linkage identifier.
    -- Invoice → "INV-1234"
    -- Payment receipt for that invoice → also "INV-1234"
    -- Enables automatic Invoice→Payment→Settlement matching without AI.
    settlement_key      TEXT,

    -- ── Event Candidate (DETERMINISTIC — no AI) ──────────────
    -- {
    --   "event_type":  "CUSTOMER_BILLED",         (from INTENT_MAP lookup)
    --   "confidence":  <inherits classification confidence — no new uncertainty>,
    --   "reasoning":   "Deterministic mapping from document_type='sales_invoice'"
    -- }
    event_candidate     JSONB DEFAULT '{}',

    -- ── Lifecycle ─────────────────────────────────────────────
    -- DRAFT        → Generated, not yet reviewed. Auto-routes if overall >= 0.85.
    -- UNDER_REVIEW → Human reviewer has opened but not decided.
    -- APPROVED     → Confirmed accurate. Safe for Trade Engine.
    -- REJECTED     → Wrong. Document must be re-uploaded or re-analysed.
    -- SUPERSEDED   → A newer note exists for this document.
    review_status       TEXT NOT NULL DEFAULT 'DRAFT' CHECK (review_status IN (
                            'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED'
                        )),

    -- Audit: who reviewed and when
    reviewed_by         UUID,
    reviewed_at         TIMESTAMPTZ,
    review_notes        TEXT,

    -- Generator metadata
    generator_version   TEXT DEFAULT '1.0',

    -- Immutable flag: true when review_status = SUPERSEDED
    is_superseded       BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_notes_document      ON analysis_notes(document_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notes_workbench     ON analysis_notes(workbench_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notes_review_status ON analysis_notes(review_status);
CREATE INDEX IF NOT EXISTS idx_analysis_notes_settlement_key ON analysis_notes(settlement_key);
CREATE INDEX IF NOT EXISTS idx_analysis_notes_doc_type      ON analysis_notes(document_type);


-- ─────────────────────────────────────────────
-- 4. Document Processing Log
--    Structured, per-stage audit trail.
--    Records every stage entry and exit, with timing and errors.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_processing_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES workbench_documents(id) ON DELETE CASCADE,
    workbench_id    UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,

    stage           TEXT NOT NULL CHECK (stage IN (
                        'VALIDATE', 'SPLIT', 'OCR', 'CLASSIFY',
                        'ANALYSE', 'QUEUE_TRADE', 'COMPLETE', 'ERROR'
                    )),

    status          TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED')),

    duration_ms     INTEGER,
    error_message   TEXT,

    -- Freeform stage metadata (e.g. page counts, model used, confidence scores)
    metadata        JSONB DEFAULT '{}',

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_log_document  ON document_processing_log(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_workbench ON document_processing_log(workbench_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_stage     ON document_processing_log(stage);


-- ─────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE ocr_raw_output          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_log ENABLE ROW LEVEL SECURITY;

-- ocr_raw_output: workbench members can read/write
DROP POLICY IF EXISTS "Workbench members can manage ocr_raw_output" ON ocr_raw_output;
CREATE POLICY "Workbench members can manage ocr_raw_output" ON ocr_raw_output
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workbenches WHERE id = ocr_raw_output.workbench_id)
    );

-- document_classifications: workbench members can read/write
DROP POLICY IF EXISTS "Workbench members can manage document_classifications" ON document_classifications;
CREATE POLICY "Workbench members can manage document_classifications" ON document_classifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workbenches WHERE id = document_classifications.workbench_id)
    );

-- analysis_notes: workbench members can read/write
DROP POLICY IF EXISTS "Workbench members can manage analysis_notes" ON analysis_notes;
CREATE POLICY "Workbench members can manage analysis_notes" ON analysis_notes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workbenches WHERE id = analysis_notes.workbench_id)
    );

-- document_processing_log: workbench members can read/write
DROP POLICY IF EXISTS "Workbench members can manage document_processing_log" ON document_processing_log;
CREATE POLICY "Workbench members can manage document_processing_log" ON document_processing_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workbenches WHERE id = document_processing_log.workbench_id)
    );


-- ─────────────────────────────────────────────
-- 6. Helper: settlement_key index for cross-document matching
--    Enables: "find all notes with this settlement key in this workbench"
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analysis_notes_wb_settlement
    ON analysis_notes(workbench_id, settlement_key)
    WHERE settlement_key IS NOT NULL;


-- ─────────────────────────────────────────────
-- 7. Add analysis_note_id backlink to workbench_documents
--    Allows direct lookup: document → its latest analysis note
-- ─────────────────────────────────────────────
ALTER TABLE workbench_documents
    ADD COLUMN IF NOT EXISTS analysis_note_id UUID REFERENCES analysis_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workbench_docs_analysis_note
    ON workbench_documents(analysis_note_id)
    WHERE analysis_note_id IS NOT NULL;
