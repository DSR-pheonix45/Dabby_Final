-- Dabby Phase 1: Foundational Financial Engine Schema

-- 1. Labels Table (Leaf nodes for transactions)
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    sub_account TEXT NOT NULL, -- Layer 2: Sub-Accounts (grouping)
    parent_id UUID REFERENCES labels(id), -- Nullable for hierarchy
    is_system BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Transactions Table (The event header - represents a Trade)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_party_id UUID, -- NEW
    source_entity_id UUID, -- NEW
    destination_party_id UUID, -- NEW
    destination_entity_id UUID, -- NEW
    created_by UUID, -- Optional: link to user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transaction Entries Table (The atomic money movements)
CREATE TABLE IF NOT EXISTS transaction_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id),
    amount NUMERIC NOT NULL, -- Signed numeric: + for destination, - for source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_labels_workbench ON labels(workbench_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workbench ON transactions(workbench_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_transaction ON transaction_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_label ON transaction_entries(label_id);

-- Parties (The Who: Individuals or Groups)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('individual', 'corporation', 'group')),
    email TEXT,
    phone TEXT,
    is_self BOOLEAN DEFAULT FALSE, -- NEW: Identify the workbench owner
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entities (The What: Legal Representatives or Vessels)
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'property', 'legal_rep', 'upi')), -- Added upi
    metadata JSONB DEFAULT '{}', -- NEW: Store bank details, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage parties in their workbenches" ON parties;
CREATE POLICY "Users can manage parties in their workbenches" ON parties FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = parties.workbench_id));

DROP POLICY IF EXISTS "Users can manage entities in their parties" ON entities;
CREATE POLICY "Users can manage entities in their parties" ON entities FOR ALL USING (EXISTS (SELECT 1 FROM parties WHERE id = entities.party_id));
