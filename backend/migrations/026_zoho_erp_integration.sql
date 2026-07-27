-- ============================================================================
-- 026: Zoho ERP Integration & Universal Sync Schema
-- Enables 1:1 mapping between Dabby Workbench and Zoho Organization.
-- Provides idempotent tracking of external records across UFG tables.
-- ============================================================================

-- 1. ERP Connections Table
CREATE TABLE IF NOT EXISTS erp_connections (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id       UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    provider           TEXT NOT NULL DEFAULT 'zoho',
    provider_org_id    TEXT NOT NULL,
    provider_org_name  TEXT,
    api_domain         TEXT NOT NULL DEFAULT 'https://www.zohoapis.in',
    access_token       TEXT,
    refresh_token      TEXT,
    token_expires_at   TIMESTAMPTZ,
    status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'syncing', 'error', 'disconnected')),
    last_sync_at       TIMESTAMPTZ,
    sync_cursor        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    -- A single Zoho Organization can belong to only ONE Dabby Workbench
    CONSTRAINT unique_provider_org UNIQUE (provider, provider_org_id),
    -- A Workbench can only have one active connection per ERP provider
    CONSTRAINT unique_workbench_provider UNIQUE (workbench_id, provider)
);

-- 2. ERP Sync Logs Table
CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id      UUID NOT NULL REFERENCES erp_connections(id) ON DELETE CASCADE,
    workbench_id       UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    sync_type          TEXT NOT NULL DEFAULT 'incremental' CHECK (sync_type IN ('full', 'incremental', 'manual')),
    status             TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    records_fetched    INT NOT NULL DEFAULT 0,
    records_imported   INT NOT NULL DEFAULT 0,
    warnings           JSONB DEFAULT '[]'::jsonb,
    errors             JSONB DEFAULT '[]'::jsonb,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at       TIMESTAMPTZ
);

-- Indexes for connection & logs
CREATE INDEX IF NOT EXISTS idx_erp_conn_workbench ON erp_connections(workbench_id);
CREATE INDEX IF NOT EXISTS idx_erp_logs_conn ON erp_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_erp_logs_workbench ON erp_sync_logs(workbench_id);

-- 3. Add External Provider & External ID tracking to UFG Tables for Idempotent Sync

-- di_accounts (CoA)
ALTER TABLE di_accounts ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE di_accounts ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_di_accounts_ext 
    ON di_accounts(workbench_id, external_provider, external_id) 
    WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

-- public.parties (Customers & Vendors)
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_ext 
    ON public.parties(workbench_id, external_provider, external_id) 
    WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

-- di_documents (Invoices, Bills)
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_di_documents_ext 
    ON di_documents(workbench_id, external_provider, external_id) 
    WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

-- di_ledger_transactions
ALTER TABLE di_ledger_transactions ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE di_ledger_transactions ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_di_ledger_tx_ext 
    ON di_ledger_transactions(workbench_id, external_provider, external_id) 
    WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

-- Enable RLS
ALTER TABLE erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_connections' AND policyname='members_manage_erp') THEN
        CREATE POLICY members_manage_erp ON erp_connections FOR ALL
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_sync_logs' AND policyname='members_read_erp_logs') THEN
        CREATE POLICY members_read_erp_logs ON erp_sync_logs FOR SELECT
        USING (workbench_id IN (SELECT workbench_id FROM workbench_members WHERE user_id = auth.uid()));
    END IF;
END $$;
