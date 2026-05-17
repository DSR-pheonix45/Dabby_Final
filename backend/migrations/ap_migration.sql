-- Create Bills table (Accounts Payable)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id), -- The Vendor
    doc_id UUID REFERENCES workbench_documents(id) ON DELETE SET NULL, -- The scanned bill/receipt
    bill_number TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_due DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid, overdue
    category TEXT DEFAULT 'expense', -- expense, subscription, inventory_purchase
    description TEXT,
    items_json JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    expense_label_id UUID REFERENCES labels(id), -- The Debit side (Expense)
    ap_label_id UUID REFERENCES labels(id),      -- The Credit side (AP Liability)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add bill_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;

-- Indices
CREATE INDEX IF NOT EXISTS idx_bills_workbench ON bills(workbench_id);
CREATE INDEX IF NOT EXISTS idx_bills_party ON bills(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bill ON transactions(bill_id);
