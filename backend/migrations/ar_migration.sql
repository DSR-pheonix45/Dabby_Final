-- Add HSN support to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- Create Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id),
    doc_id UUID REFERENCES workbench_documents(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_due DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'sent', -- sent, partial, paid, overdue
    description TEXT,
    items_json JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    revenue_label_id UUID REFERENCES labels(id),
    ar_label_id UUID REFERENCES labels(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add invoice_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Indices
CREATE INDEX IF NOT EXISTS idx_invoices_workbench ON invoices(workbench_id);
CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);
