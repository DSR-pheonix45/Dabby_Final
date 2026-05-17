-- Inventory and Stock Management Schema (Refined)

-- 1. Items Table (Replacing old 'inventory' table if it exists)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category TEXT DEFAULT 'General',
    type TEXT NOT NULL CHECK (type IN ('product', 'service', 'goods')), -- matching frontend 'goods'
    usage_type TEXT NOT NULL DEFAULT 'trading' CHECK (usage_type IN ('trading', 'internal')),
    unit TEXT DEFAULT 'pcs',
    min_stock_level NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0, -- Default selling price or reference price
    cost_method TEXT NOT NULL DEFAULT 'FIFO' CHECK (cost_method IN ('FIFO', 'Average')),
    
    -- Linked Accounts (Labels) - The "Value" Layer
    inventory_label_id UUID REFERENCES labels(id), -- Asset account
    cogs_label_id UUID REFERENCES labels(id),      -- Expense account
    revenue_label_id UUID REFERENCES labels(id),   -- Revenue account
    
    status TEXT DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stock Ledger (Quantity tracking) - The "Stock" Layer
CREATE TABLE IF NOT EXISTS stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to "Flow" Layer
    quantity_change NUMERIC NOT NULL, -- +10 (purchase), -5 (sale)
    unit_cost NUMERIC NOT NULL DEFAULT 0, 
    reason TEXT NOT NULL CHECK (reason IN ('purchase', 'sale', 'adjustment', 'consumption', 'return')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_items_workbench ON items(workbench_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_txn ON stock_ledger(transaction_id);

-- RLS Policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage items in their workbenches" ON items;
CREATE POLICY "Users can manage items in their workbenches" ON items 
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = items.workbench_id));

DROP POLICY IF EXISTS "Users can manage stock ledger for their items" ON stock_ledger;
CREATE POLICY "Users can manage stock ledger for their items" ON stock_ledger 
    FOR ALL USING (EXISTS (SELECT 1 FROM items WHERE id = stock_ledger.item_id AND items.workbench_id IN (SELECT id FROM workbenches WHERE id = items.workbench_id)));
