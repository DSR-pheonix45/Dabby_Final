-- 1. Projects Table (For cross-functional clubbing)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Budgets Table (Acts as category allocations in this setup)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- This acts as the category/sub-account name (e.g. 'Marketing')
    total_amount NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT '2024-01-01',
    end_date DATE NOT NULL DEFAULT '2024-12-31',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alter Transactions to support project clubbing
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 4. Create View for Budget Vs Actual (Analytical Consumption Engine)
CREATE OR REPLACE VIEW view_budget_vs_actual AS
SELECT 
    b.id,
    b.workbench_id,
    b.name AS category,
    b.total_amount AS budgeted_amount,
    COALESCE((
        -- Sum up all transaction entries that match the sub-account and fall in the date range
        SELECT SUM(te.amount)
        FROM transaction_entries te
        JOIN transactions t ON t.id = te.transaction_id
        JOIN labels l ON l.id = te.label_id
        WHERE t.workbench_id = b.workbench_id
          AND l.sub_account = b.name
          AND t.transaction_date >= b.start_date 
          AND t.transaction_date <= b.end_date
    ), 0) AS actual_amount,
    
    CASE 
        WHEN b.total_amount > 0 THEN 
            (COALESCE((
                SELECT SUM(te.amount)
                FROM transaction_entries te
                JOIN transactions t ON t.id = te.transaction_id
                JOIN labels l ON l.id = te.label_id
                WHERE t.workbench_id = b.workbench_id
                  AND l.sub_account = b.name
                  AND t.transaction_date >= b.start_date 
                  AND t.transaction_date <= b.end_date
            ), 0) / b.total_amount) * 100 
        ELSE 0 
    END AS progress_percentage
FROM budgets b;

-- 5. Add RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage projects in their workbenches" ON projects FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = projects.workbench_id));

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budgets in their workbenches" ON budgets FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = budgets.workbench_id));
