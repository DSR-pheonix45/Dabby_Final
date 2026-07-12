-- ============================================================================
-- 024: Universal Ledger (Phase 5) — the immutable double-entry postings that
-- the V2 Accounting Compiler writes from a Business Event.
--
-- Entries reference di_accounts (the workbench COA). Debits/credits are stored
-- explicitly; the compiler guarantees SUM(debit) = SUM(credit) per transaction.
-- ============================================================================

CREATE TABLE IF NOT EXISTS di_ledger_transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id       UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    business_event_id  UUID REFERENCES business_events(id) ON DELETE SET NULL,
    description        TEXT,
    transaction_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    currency           TEXT NOT NULL DEFAULT 'INR',
    total_amount       NUMERIC NOT NULL DEFAULT 0,
    created_by         UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- one ledger transaction per business event (idempotency)
    UNIQUE (business_event_id)
);

CREATE TABLE IF NOT EXISTS di_ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES di_ledger_transactions(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES di_accounts(id),
    direction       TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount          NUMERIC NOT NULL CHECK (amount >= 0),
    memo            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx_workbench  ON di_ledger_transactions(workbench_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_event      ON di_ledger_transactions(business_event_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx    ON di_ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_acct  ON di_ledger_entries(account_id);

-- RLS (backend service role bypasses; policies for future direct client reads,
-- scoped to workbenches the user is a member of).
ALTER TABLE di_ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE di_ledger_entries      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='di_ledger_transactions' AND policyname='members_read_ledger_tx') THEN
        CREATE POLICY members_read_ledger_tx ON di_ledger_transactions FOR SELECT
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='di_ledger_entries' AND policyname='members_read_ledger_entries') THEN
        CREATE POLICY members_read_ledger_entries ON di_ledger_entries FOR SELECT
        USING (transaction_id IN (
            SELECT t.id FROM di_ledger_transactions t
            JOIN workbench_members m ON m.workbench_id = t.workbench_id
            WHERE m.user_id = auth.uid()
        ));
    END IF;
END $$;
