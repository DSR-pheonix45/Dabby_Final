-- 1. Create rulesets table
CREATE TABLE IF NOT EXISTS rulesets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Active', 'Disabled', 'Draft')),
    version TEXT NOT NULL DEFAULT '1.0',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to enforce single active ruleset per document type per workbench
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_ruleset 
ON rulesets(workbench_id, document_type) 
WHERE (status = 'Active');

-- 2. Create ruleset_versions table
CREATE TABLE IF NOT EXISTS ruleset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruleset_id UUID NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    prompt TEXT NOT NULL,
    structured_logic JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create financial_events table
CREATE TABLE IF NOT EXISTS financial_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruleset_id UUID REFERENCES rulesets(id) ON DELETE SET NULL,
    ruleset_version_id UUID REFERENCES ruleset_versions(id) ON DELETE SET NULL,
    document_id UUID REFERENCES workbench_documents(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    counterparty TEXT,
    event_date DATE,
    status TEXT NOT NULL DEFAULT 'Executed' CHECK (status IN ('Pending', 'Executed', 'Failed')),
    metadata JSONB DEFAULT '{}',
    execution_timestamp TIMESTAMPTZ DEFAULT NOW(),
    failure_reason TEXT
);

-- 4. Enable RLS
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruleset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can manage rulesets in their workbenches" ON rulesets;
CREATE POLICY "Users can manage rulesets in their workbenches" ON rulesets
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = rulesets.workbench_id));

DROP POLICY IF EXISTS "Users can manage ruleset versions" ON ruleset_versions;
CREATE POLICY "Users can manage ruleset versions" ON ruleset_versions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM rulesets 
        WHERE id = ruleset_versions.ruleset_id 
        AND EXISTS (SELECT 1 FROM workbenches WHERE id = rulesets.workbench_id)
    ));

DROP POLICY IF EXISTS "Users can manage financial events" ON financial_events;
CREATE POLICY "Users can manage financial events" ON financial_events
    FOR ALL USING (EXISTS (
        SELECT 1 FROM rulesets 
        WHERE id = financial_events.ruleset_id 
        AND EXISTS (SELECT 1 FROM workbenches WHERE id = rulesets.workbench_id)
    ) OR (document_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM workbench_documents 
        WHERE id = financial_events.document_id 
        AND EXISTS (SELECT 1 FROM workbenches WHERE id = workbench_documents.workbench_id)
    )));
