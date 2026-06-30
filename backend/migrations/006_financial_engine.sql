-- 1. Alter trades status constraint to support complete Trade State Machine
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE trades ADD CONSTRAINT trades_status_check CHECK (status IN (
    'Draft', 'Needs Review', 'Pending', 'Approved', 'Partially Settled', 'Settled', 'Cancelled', 'Reversed', 'Ready', 'Rejected'
));

-- 2. Create trade_activities table
CREATE TABLE IF NOT EXISTS trade_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'CREATE_RECEIVABLE', 'CREATE_PAYABLE', 'INCREASE_LABEL', 'DECREASE_LABEL',
        'CREATE_ASSET', 'UPDATE_STOCK', 'CONSUME_BUDGET', 'UPDATE_PARTY', 'UPDATE_ENTITY',
        'ADD_EXPENSE', 'ADD_REVENUE', 'ADD_INPUT_GST', 'ADD_OUTPUT_GST',
        'REMOVE_RECEIVABLE', 'REMOVE_PAYABLE', 'SUBTRACT_BANK'
    )),
    action TEXT, -- e.g. 'DEBIT', 'CREDIT', 'ADJUST'
    target_type TEXT, -- e.g. 'invoices', 'bills', 'items', 'assets', 'budgets'
    target_id UUID, -- reference to target record if applicable
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Executed', 'Failed', 'Reversed')),
    metadata JSONB DEFAULT '{}',
    depends_on UUID REFERENCES trade_activities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create trade_activity_execution table (Replay and execution snapshot history)
CREATE TABLE IF NOT EXISTS trade_activity_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES trade_activities(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Success', 'Failed')),
    previous_value JSONB DEFAULT '{}',
    new_value JSONB DEFAULT '{}',
    executed_by UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- 4. Create assets table (Asset Register)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    label_id UUID REFERENCES workbench_accounts(id) ON DELETE SET NULL,
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_value NUMERIC NOT NULL DEFAULT 0,
    useful_life INTEGER DEFAULT 5, -- in years
    depreciation_method TEXT NOT NULL DEFAULT 'Straight Line',
    salvage_value NUMERIC DEFAULT 0,
    current_value NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'written_off')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create audit_logs table (Immutable execution audit history)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES trade_activities(id) ON DELETE SET NULL,
    user_id UUID,
    action TEXT NOT NULL, -- e.g. 'SAVE_DRAFT', 'APPROVE_EXECUTE', 'REJECT', 'RE_ANALYSE'
    old_value JSONB DEFAULT '{}',
    new_value JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add balance and outstanding columns to parties and entities
ALTER TABLE parties ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC DEFAULT 0.0;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0.0;

-- 7. Enable RLS
ALTER TABLE trade_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_activity_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Add RLS Policies
DROP POLICY IF EXISTS "Users can manage trade activities in their workbenches" ON trade_activities;
CREATE POLICY "Users can manage trade activities in their workbenches" ON trade_activities
    FOR ALL USING (EXISTS (SELECT 1 FROM trades WHERE id = trade_activities.trade_id AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)));

DROP POLICY IF EXISTS "Users can manage execution records in their workbenches" ON trade_activity_execution;
CREATE POLICY "Users can manage execution records in their workbenches" ON trade_activity_execution
    FOR ALL USING (EXISTS (
        SELECT 1 FROM trade_activities 
        JOIN trades ON trades.id = trade_activities.trade_id
        WHERE trade_activities.id = trade_activity_execution.activity_id 
          AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)
    ));

DROP POLICY IF EXISTS "Users can manage assets in their workbenches" ON assets;
CREATE POLICY "Users can manage assets in their workbenches" ON assets
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = assets.workbench_id));

DROP POLICY IF EXISTS "Users can manage audit logs in their workbenches" ON audit_logs;
CREATE POLICY "Users can manage audit logs in their workbenches" ON audit_logs
    FOR ALL USING (EXISTS (SELECT 1 FROM trades WHERE id = audit_logs.trade_id AND EXISTS (SELECT 1 FROM workbenches WHERE id = trades.workbench_id)));
