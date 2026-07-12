-- ============================================================================
-- 023: Business Event pipeline tables (Phase 3)
-- Schemas derived directly from the backend code:
--   business_event_registry.py  -> business_events, trade_drafts
--   settlement_engine.py        -> event_settlements
--
-- NOTE: This unblocks the Business Event Registry + Settlement Engine.
-- It does NOT enable event->ledger posting: accounting_compiler
-- .compile_from_business_event is still an explicit NotImplementedError stub,
-- and no code yet PRODUCES trade_drafts (the analysis_note -> draft classifier
-- is unwritten). Those are code gaps, not schema gaps.
-- ============================================================================

-- ── trade_drafts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_drafts (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         UUID NOT NULL,
    analysis_note_id                UUID REFERENCES di_analysis_notes(id) ON DELETE SET NULL,
    document_id                     UUID REFERENCES di_documents(id) ON DELETE SET NULL,
    event_type                      TEXT,
    counterparty_name               TEXT,
    amount                          NUMERIC,
    event_date                      DATE,
    settlement_key                  TEXT,
    currency                        TEXT DEFAULT 'INR',
    status                          TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    -- reviewer overrides
    override_event_type             TEXT,
    override_counterparty           TEXT,
    override_amount                 NUMERIC,
    override_event_date             DATE,
    override_settlement_key         TEXT,
    reviewer_notes                  TEXT,
    reviewed_at                     TIMESTAMPTZ,
    reviewed_by                     UUID,
    business_event_id               UUID,
    legacy_trade_id_for_comparison  UUID,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── business_events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    analysis_note_id  UUID REFERENCES di_analysis_notes(id) ON DELETE SET NULL,
    trade_draft_id    UUID REFERENCES trade_drafts(id) ON DELETE SET NULL,
    document_id       UUID REFERENCES di_documents(id) ON DELETE SET NULL,
    event_type        TEXT NOT NULL,
    event_date        DATE,
    counterparty      TEXT,
    amount            NUMERIC,
    currency          TEXT DEFAULT 'INR',
    settlement_key    TEXT,
    event_status      TEXT NOT NULL DEFAULT 'OPEN',
    event_metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_superseded     BOOLEAN NOT NULL DEFAULT FALSE,
    superseded_by     UUID,
    legacy_trade_id   UUID,
    transaction_id    UUID,
    compiled_at       TIMESTAMPTZ,
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trade_drafts.business_event_id backlink (added after business_events exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'trade_drafts_business_event_id_fkey'
    ) THEN
        ALTER TABLE trade_drafts
            ADD CONSTRAINT trade_drafts_business_event_id_fkey
            FOREIGN KEY (business_event_id) REFERENCES business_events(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── event_settlements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_settlements (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL,
    event_id_a         UUID NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,
    event_id_b         UUID NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,
    settlement_key     TEXT,
    match_method       TEXT,
    match_confidence   NUMERIC,
    original_amount    NUMERIC,
    amount_matched     NUMERIC,
    settlement_status  TEXT NOT NULL DEFAULT 'OPEN',
    settled_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id_a, event_id_b)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trade_drafts_user        ON trade_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_status      ON trade_drafts(status);
CREATE INDEX IF NOT EXISTS idx_trade_drafts_document    ON trade_drafts(document_id);
CREATE INDEX IF NOT EXISTS idx_business_events_user     ON business_events(user_id);
CREATE INDEX IF NOT EXISTS idx_business_events_status   ON business_events(event_status);
CREATE INDEX IF NOT EXISTS idx_business_events_type     ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_events_doc      ON business_events(document_id);
CREATE INDEX IF NOT EXISTS idx_business_events_key      ON business_events(settlement_key);
CREATE INDEX IF NOT EXISTS idx_business_events_active   ON business_events(user_id, is_superseded, event_status);
CREATE INDEX IF NOT EXISTS idx_event_settlements_a      ON event_settlements(event_id_a);
CREATE INDEX IF NOT EXISTS idx_event_settlements_b      ON event_settlements(event_id_b);

-- ── RLS (backend uses service role and bypasses this; policies are for any
--        future direct-from-client reads, scoped to the owning user) ──────────
ALTER TABLE trade_drafts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settlements  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trade_drafts' AND policyname='own_trade_drafts') THEN
        CREATE POLICY own_trade_drafts ON trade_drafts FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_events' AND policyname='own_business_events') THEN
        CREATE POLICY own_business_events ON business_events FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_settlements' AND policyname='own_event_settlements') THEN
        CREATE POLICY own_event_settlements ON event_settlements FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;
