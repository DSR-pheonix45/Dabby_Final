-- ============================================================================
-- 026: Trial Balance Snapshots — Historical Data & Month-End Closing
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_balance_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id  UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    snapshot_name TEXT NOT NULL,
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('manual', 'auto_monthly', 'imported')),
    total_debit   NUMERIC NOT NULL DEFAULT 0,
    total_credit  NUMERIC NOT NULL DEFAULT 0,
    is_balanced   BOOLEAN NOT NULL DEFAULT TRUE,
    notes         TEXT,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trial_balance_snapshot_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id          UUID NOT NULL REFERENCES trial_balance_snapshots(id) ON DELETE CASCADE,
    workbench_account_id UUID REFERENCES workbench_accounts(id) ON DELETE SET NULL,
    full_code            TEXT,
    ledger_name          TEXT NOT NULL,
    account_class        TEXT,
    group_code           TEXT,
    debit_amount         NUMERIC NOT NULL DEFAULT 0,
    credit_amount        NUMERIC NOT NULL DEFAULT 0,
    net_balance          NUMERIC NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tb_snapshots_wb ON trial_balance_snapshots(workbench_id);
CREATE INDEX IF NOT EXISTS idx_tb_snapshot_items_snap ON trial_balance_snapshot_items(snapshot_id);
