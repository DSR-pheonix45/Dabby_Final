-- ============================================================================
-- MIGRATION 033: CANONICAL DI COA HIERARCHY & NORMALIZED ACCOUNTING TABLES
-- ============================================================================
-- Implements normalized ALERX hierarchy:
-- Account (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE) -> Sub-account -> Ledger -> Label
-- ============================================================================

-- 1. Create di_ledgers table (User/Company Ledgers under Sub-accounts)
CREATE TABLE IF NOT EXISTS public.di_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL,
    sub_account_id UUID NOT NULL REFERENCES public.di_accounts(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.di_accounts(id) ON DELETE CASCADE,
    ledger_code VARCHAR(64) NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_di_ledger_code UNIQUE(workbench_id, ledger_code)
);

-- 2. Create di_labels table (User/Company Operational Labels under Ledgers)
CREATE TABLE IF NOT EXISTS public.di_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL,
    ledger_id UUID NOT NULL REFERENCES public.di_ledgers(id) ON DELETE CASCADE,
    label_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_di_label_name UNIQUE(workbench_id, ledger_id, label_name)
);

-- 3. Add posting targets and dimensions to di_ledger_entries
ALTER TABLE public.di_ledger_entries
    ADD COLUMN IF NOT EXISTS sub_account_id UUID REFERENCES public.di_accounts(id),
    ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES public.di_ledgers(id),
    ADD COLUMN IF NOT EXISTS label_id UUID REFERENCES public.di_labels(id),
    ADD COLUMN IF NOT EXISTS party_id UUID;

-- 4. Enable RLS
ALTER TABLE public.di_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "di_ledgers_all_policy" ON public.di_ledgers;
CREATE POLICY "di_ledgers_all_policy" ON public.di_ledgers
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "di_labels_all_policy" ON public.di_labels;
CREATE POLICY "di_labels_all_policy" ON public.di_labels
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_di_ledgers_wb ON public.di_ledgers(workbench_id);
CREATE INDEX IF NOT EXISTS idx_di_ledgers_sub ON public.di_ledgers(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_di_labels_ledger ON public.di_labels(ledger_id);
CREATE INDEX IF NOT EXISTS idx_di_entries_ledger ON public.di_ledger_entries(ledger_id);
