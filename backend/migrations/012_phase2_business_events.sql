-- ============================================================
-- Dabby Phase 2: Analysis Note → Trade Draft → Business Event
-- Migration 012 — Business Events Infrastructure
-- ============================================================
-- Run this in Supabase SQL editor BEFORE deploying new code.
-- All tables are additive. No existing tables are modified.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. business_events
--    Immutable verified financial reality.
--    Created FIRST because trade_drafts FK references it.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id        UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    analysis_note_id    UUID REFERENCES analysis_notes(id) ON DELETE SET NULL,
    document_id         UUID REFERENCES user_documents(id) ON DELETE SET NULL,

    -- trade_draft_id populated after Phase 2 pipeline; NULL for V1 legacy events
    -- (circular FK resolved by adding constraint after trade_drafts is created)

    -- ── Business Event Core ──────────────────────────────────
    event_type          TEXT NOT NULL CHECK (event_type IN (
                            'CUSTOMER_BILLED',
                            'CUSTOMER_PAYMENT_RECEIVED',
                            'VENDOR_BILLED',
                            'VENDOR_PAYMENT_MADE',
                            'PAYROLL_INCURRED',
                            'PAYROLL_PAID',
                            'LOAN_RECEIVED',
                            'LOAN_REPAID',
                            'INVESTMENT_RECEIVED',
                            'TAX_LIABILITY_CREATED',
                            'TAX_PAID',
                            'PURCHASE_ORDER_CREATED',
                            'SALES_ORDER_CREATED',
                            'CREDIT_NOTE_ISSUED',
                            'DEBIT_NOTE_ISSUED',
                            'BANK_ACTIVITY_RECORDED',
                            'EXPENSE_INCURRED',
                            'UNCLASSIFIED'
                        )),

    event_date          DATE,
    counterparty        TEXT,
    amount              NUMERIC,
    currency            TEXT DEFAULT 'INR',

    -- Cross-document linkage key (from Phase 1 Analysis Note)
    -- Enables deterministic settlement matching.
    settlement_key      TEXT,

    -- ── Settlement Status ─────────────────────────────────────
    -- Tracks economic completion, NOT accounting completion.
    event_status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (event_status IN (
                            'OPEN',             -- no settlement match yet
                            'PARTIALLY_SETTLED',-- matched to partial payment
                            'SETTLED',          -- fully matched
                            'CANCELLED',        -- manually cancelled
                            'SUPERSEDED'        -- a newer event supersedes this one
                        )),

    -- ── Event Metadata ────────────────────────────────────────
    -- Embeds: line items (invoice), transactions (bank statement),
    -- employees (payroll), etc. One event per document.
    event_metadata      JSONB DEFAULT '{}',

    -- ── Immutability ──────────────────────────────────────────
    -- Business Events are NEVER updated in place.
    -- Re-processing creates a new event and supersedes the old.
    is_superseded       BOOLEAN NOT NULL DEFAULT FALSE,
    superseded_by       UUID,   -- self-referential; constraint added below

    -- ── Legacy Trade Engine backlink (parallel-run comparison) ─
    legacy_trade_id     UUID REFERENCES trades(id) ON DELETE SET NULL,

    -- ── Accounting status ─────────────────────────────────────
    -- Tracking whether this event has been compiled to ledger.
    compiled_at         TIMESTAMPTZ,
    transaction_id      UUID,   -- FK to transactions table (if compiled)

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Self-referential FK for superseded_by
ALTER TABLE business_events
    ADD CONSTRAINT fk_business_events_superseded_by
    FOREIGN KEY (superseded_by) REFERENCES business_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_events_workbench     ON business_events(user_id);
CREATE INDEX IF NOT EXISTS idx_business_events_analysis_note ON business_events(analysis_note_id);
CREATE INDEX IF NOT EXISTS idx_business_events_settlement_key ON business_events(user_id, settlement_key) WHERE settlement_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_events_event_type    ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_events_status        ON business_events(event_status);
CREATE INDEX IF NOT EXISTS idx_business_events_counterparty  ON business_events(user_id, counterparty);
CREATE INDEX IF NOT EXISTS idx_business_events_event_date    ON business_events(event_date);


-- ─────────────────────────────────────────────────────────────
-- 2. trade_drafts
--    Proposed business actions derived from Analysis Notes.
--    Reviewable before becoming Business Events.
--    Analysis Note is the SOLE data source — never OCR metadata.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_drafts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id        UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    analysis_note_id    UUID NOT NULL REFERENCES analysis_notes(id) ON DELETE CASCADE,
    document_id         UUID REFERENCES user_documents(id) ON DELETE SET NULL,

    -- ── Derived from Analysis Note (deterministic) ────────────
    event_type          TEXT NOT NULL,          -- from analysis_note.event_candidate.event_type
    counterparty_name   TEXT,                   -- resolved by COUNTERPARTY_MAP
    amount              NUMERIC,                -- resolved by AMOUNT_MAP
    currency            TEXT DEFAULT 'INR',
    event_date          DATE,                   -- from analysis_note.dates.document_date
    settlement_key      TEXT,                   -- from analysis_note.settlement_key

    -- ── Draft Lifecycle ───────────────────────────────────────
    status              TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN (
                            'PENDING_REVIEW',   -- awaiting human review
                            'APPROVED',         -- human approved → Business Event created
                            'REJECTED',         -- human rejected
                            'SUPERSEDED'        -- re-analysis produced a newer draft
                        )),

    -- ── Reviewer Overrides ────────────────────────────────────
    -- Reviewer can correct these fields without touching the Analysis Note.
    -- The Analysis Note remains immutable.
    override_counterparty   TEXT,
    override_amount         NUMERIC,
    override_event_date     DATE,
    override_settlement_key TEXT,
    override_event_type     TEXT,   -- reviewer can reclassify the event

    reviewer_notes          TEXT,

    -- ── Populated on APPROVED ─────────────────────────────────
    business_event_id       UUID REFERENCES business_events(id) ON DELETE SET NULL,
    reviewed_by             UUID,
    reviewed_at             TIMESTAMPTZ,

    -- ── Feature flag tracking ─────────────────────────────────
    pipeline_version        TEXT DEFAULT 'v2',

    -- ── Parallel-run comparison (migration only) ──────────────
    -- During phased rollout, the legacy Trade Engine also runs.
    -- This stores the legacy trade_id for output comparison.
    legacy_trade_id_for_comparison UUID REFERENCES trades(id) ON DELETE SET NULL,

    generator_version   TEXT DEFAULT '1.0',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_drafts_workbench      ON trade_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_analysis_note  ON trade_drafts(analysis_note_id);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_status         ON trade_drafts(status);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_settlement_key ON trade_drafts(settlement_key);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_event_type     ON trade_drafts(event_type);


-- ─────────────────────────────────────────────────────────────
-- 3. Add trade_draft_id backlink to business_events
--    (Could not be added in step 1 due to forward reference)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE business_events
    ADD COLUMN IF NOT EXISTS trade_draft_id UUID REFERENCES trade_drafts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_events_trade_draft ON business_events(trade_draft_id);


-- ─────────────────────────────────────────────────────────────
-- 4. event_settlements
--    Economic completion tracking.
--    Deterministic three-pass matching engine.
--    No AI. No LLM. No prompts.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_settlements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id        UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,

    -- "Open" event being settled (e.g. sales_invoice → CUSTOMER_BILLED)
    event_id_a          UUID NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,

    -- "Settling" event (e.g. customer_payment_receipt → CUSTOMER_PAYMENT_RECEIVED)
    event_id_b          UUID NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,

    -- ── Match details ─────────────────────────────────────────
    settlement_key      TEXT,   -- the key that matched (or NULL for amount-based match)

    match_method        TEXT NOT NULL CHECK (match_method IN (
                            'settlement_key',       -- Pass 1: exact key match  (confidence 1.0)
                            'invoice_reference',    -- Pass 2: invoice number   (confidence 0.9)
                            'amount_counterparty'   -- Pass 3: amount+party     (confidence 0.75)
                        )),

    match_confidence    NUMERIC NOT NULL DEFAULT 1.0,
                        -- 1.0 = exact  |  0.9 = invoice ref  |  0.75 = amount+party

    -- ── Settlement amounts ────────────────────────────────────
    -- event_id_a amount (original)
    original_amount     NUMERIC,
    -- How much of event_id_a is settled by event_id_b
    amount_matched      NUMERIC,

    settlement_status   TEXT NOT NULL DEFAULT 'OPEN' CHECK (settlement_status IN (
                            'OPEN',
                            'PARTIALLY_SETTLED',
                            'SETTLED',
                            'UNMATCHED'
                        )),

    settled_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_settlements_workbench ON event_settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_event_settlements_event_a   ON event_settlements(event_id_a);
CREATE INDEX IF NOT EXISTS idx_event_settlements_event_b   ON event_settlements(event_id_b);
CREATE INDEX IF NOT EXISTS idx_event_settlements_key       ON event_settlements(settlement_key);
CREATE INDEX IF NOT EXISTS idx_event_settlements_status    ON event_settlements(settlement_status);

-- Prevent duplicate settlement pairs
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_settlements_pair
    ON event_settlements(event_id_a, event_id_b);


-- ─────────────────────────────────────────────────────────────
-- 5. Feature flag support table (optional — can use env vars)
--    Allows per-document-type V2 rollout from Supabase UI.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_name   TEXT NOT NULL UNIQUE,
    flag_value  TEXT NOT NULL DEFAULT 'false',
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the Phase 2 feature flag (disabled by default)
INSERT INTO feature_flags (flag_name, flag_value, description)
VALUES (
    'TRADE_ENGINE_V2',
    'false',
    'Enables Phase 2 pipeline: Analysis Note → Trade Draft → Business Event. '
    'Set flag_value to comma-separated doc types to enable for specific types only, '
    'or "true" to enable for all. e.g. "sales_invoice,vendor_invoice"'
)
ON CONFLICT (flag_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE trade_drafts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workbench members can manage trade_drafts" ON trade_drafts;
CREATE POLICY "Workbench members can manage trade_drafts" ON trade_drafts
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = trade_drafts.user_id));

DROP POLICY IF EXISTS "Workbench members can manage business_events" ON business_events;
CREATE POLICY "Workbench members can manage business_events" ON business_events
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = business_events.user_id));

DROP POLICY IF EXISTS "Workbench members can manage event_settlements" ON event_settlements;
CREATE POLICY "Workbench members can manage event_settlements" ON event_settlements
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = event_settlements.user_id));

DROP POLICY IF EXISTS "Anyone can read feature_flags" ON feature_flags;
CREATE POLICY "Anyone can read feature_flags" ON feature_flags
    FOR SELECT USING (TRUE);
