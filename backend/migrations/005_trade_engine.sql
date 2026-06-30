-- 1. Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    document_id UUID REFERENCES workbench_documents(id) ON DELETE SET NULL,
    analysis_note_id TEXT,
    trade_type TEXT CHECK (trade_type IN (
        'Vendor Invoice', 'Vendor Payment', 'Sales Invoice', 'Customer Payment',
        'Expense Receipt', 'Payroll', 'Investment', 'Loan', 'Bank Statement',
        'Credit Note', 'Debit Note', 'Purchase Order', 'Sales Order', 'Manual Trade'
    )),
    trade_direction TEXT CHECK (trade_direction IN (
        'PAYABLE', 'RECEIVABLE', 'IMMEDIATE_SETTLEMENT', 'TRANSFER', 'NON_FINANCIAL'
    )),
    status TEXT DEFAULT 'Needs Review' CHECK (status IN (
        'Draft', 'Needs Review', 'Ready', 'Rejected'
    )),
    confidence NUMERIC DEFAULT 1.0,
    amount NUMERIC, -- Kept for backward compatibility
    gross_amount NUMERIC,
    tax_amount NUMERIC,
    net_amount NUMERIC,
    currency TEXT DEFAULT 'INR',
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    description TEXT,
    notes TEXT,
    created_by UUID,
    reviewed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_trades_workbench ON trades(workbench_id);
CREATE INDEX IF NOT EXISTS idx_trades_document ON trades(document_id);

-- 2. Create trade_parties table
CREATE TABLE IF NOT EXISTS trade_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    role TEXT NOT NULL, -- e.g., 'our_company', 'counterparty'
    detected_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create trade_entities table
CREATE TABLE IF NOT EXISTS trade_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    role TEXT NOT NULL, -- e.g., 'our_company', 'counterparty'
    detected_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create trade_labels table
CREATE TABLE IF NOT EXISTS trade_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    label_id UUID REFERENCES workbench_accounts(id) ON DELETE SET NULL,
    role TEXT NOT NULL, -- e.g., 'expense', 'revenue', 'asset', 'inventory', 'liability'
    detected_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_labels ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Users can manage trades in their workbenches" ON trades;
CREATE POLICY "Users can manage trades in their workbenches" ON trades
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id));

DROP POLICY IF EXISTS "Users can manage trade parties in their trades" ON trade_parties;
CREATE POLICY "Users can manage trade parties in their trades" ON trade_parties
    FOR ALL USING (EXISTS (SELECT 1 FROM trades WHERE id = trade_parties.trade_id AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)));

DROP POLICY IF EXISTS "Users can manage trade entities in their trades" ON trade_entities;
CREATE POLICY "Users can manage trade entities in their trades" ON trade_entities
    FOR ALL USING (EXISTS (SELECT 1 FROM trades WHERE id = trade_entities.trade_id AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)));

DROP POLICY IF EXISTS "Users can manage trade labels in their trades" ON trade_labels;
CREATE POLICY "Users can manage trade labels in their trades" ON trade_labels
    FOR ALL USING (EXISTS (SELECT 1 FROM trades WHERE id = trade_labels.trade_id AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)));


-- ==========================================
-- ALTER STATEMENTS FOR UPGRADING EXISTING DB
-- ==========================================
ALTER TABLE trades ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tax_amount NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS net_amount NUMERIC;
