-- Migration 013: Transition from multi-tenant workbenches to single-tenant user model

-- 1. Add user_id column to all relevant tables
ALTER TABLE labels ADD COLUMN user_id UUID;
ALTER TABLE transactions ADD COLUMN user_id UUID;
ALTER TABLE parties ADD COLUMN user_id UUID;
ALTER TABLE projects ADD COLUMN user_id UUID;
ALTER TABLE budgets ADD COLUMN user_id UUID;
ALTER TABLE workbench_documents RENAME TO user_documents;
ALTER TABLE user_documents ADD COLUMN user_id UUID;
ALTER TABLE items ADD COLUMN user_id UUID;
ALTER TABLE workbench_usage RENAME TO user_usage;
ALTER TABLE user_usage ADD COLUMN user_id UUID;

-- 2. Backfill user_id based on workbench_members (take the first member as the owner)
UPDATE labels t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE transactions t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE parties t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE projects t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE budgets t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE user_documents t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE items t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);
UPDATE user_usage t SET user_id = (SELECT user_id FROM workbench_members WHERE workbench_id = t.workbench_id LIMIT 1);

-- Note: In a production environment with strict references to auth.users, you would add FK constraints here.
-- Assuming auth.users(id) is available or managed by Supabase.

-- 3. Update Indices
DROP INDEX IF EXISTS idx_labels_workbench;
CREATE INDEX idx_labels_user ON labels(user_id);

DROP INDEX IF EXISTS idx_transactions_workbench;
CREATE INDEX idx_transactions_user ON transactions(user_id);

DROP INDEX IF EXISTS idx_workbench_documents_workbench;
CREATE INDEX idx_user_documents_user ON user_documents(user_id);

DROP INDEX IF EXISTS idx_items_workbench;
CREATE INDEX idx_items_user ON items(user_id);

-- 4. Update RLS Policies
-- Labels (assuming policy exists, drop and recreate if necessary, though dabby_phase1_schema might not have policy on labels, let's create it to be safe)
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage labels in their workbenches" ON labels;
DROP POLICY IF EXISTS "Users can manage their own labels" ON labels;
CREATE POLICY "Users can manage their own labels" ON labels FOR ALL USING (user_id = auth.uid());

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage transactions in their workbenches" ON transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (user_id = auth.uid());

-- Parties
DROP POLICY IF EXISTS "Users can manage parties in their workbenches" ON parties;
CREATE POLICY "Users can manage their own parties" ON parties FOR ALL USING (user_id = auth.uid());

-- Projects
DROP POLICY IF EXISTS "Users can manage projects in their workbenches" ON projects;
CREATE POLICY "Users can manage their own projects" ON projects FOR ALL USING (user_id = auth.uid());

-- Budgets
DROP POLICY IF EXISTS "Users can manage budgets in their workbenches" ON budgets;
CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (user_id = auth.uid());

-- User Documents
DROP POLICY IF EXISTS "Users can manage documents in their workbenches" ON user_documents;
CREATE POLICY "Users can manage their own documents" ON user_documents FOR ALL USING (user_id = auth.uid());

-- Items
DROP POLICY IF EXISTS "Users can manage items in their workbenches" ON items;
CREATE POLICY "Users can manage their own items" ON items FOR ALL USING (user_id = auth.uid());

-- 5. Drop workbench_id column (Requires dropping views/constraints that depend on it first)
DROP VIEW IF EXISTS view_budget_vs_actual;
-- Recreate View without workbench_id
CREATE OR REPLACE VIEW view_budget_vs_actual AS
SELECT 
    b.id,
    b.user_id,
    b.name AS category,
    b.total_amount AS budgeted_amount,
    COALESCE((
        SELECT SUM(te.amount)
        FROM transaction_entries te
        JOIN transactions t ON t.id = te.transaction_id
        JOIN labels l ON l.id = te.label_id
        WHERE t.user_id = b.user_id
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
                WHERE t.user_id = b.user_id
                  AND l.sub_account = b.name
                  AND t.transaction_date >= b.start_date 
                  AND t.transaction_date <= b.end_date
            ), 0) / b.total_amount) * 100 
        ELSE 0 
    END AS progress_percentage
FROM budgets b;

ALTER TABLE labels DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE parties DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE budgets DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE user_documents DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE items DROP COLUMN IF EXISTS workbench_id CASCADE;
ALTER TABLE user_usage DROP COLUMN IF EXISTS workbench_id CASCADE;

-- 6. Drop the Workbenches Tables
DROP TABLE IF EXISTS workbench_members CASCADE;
DROP TABLE IF EXISTS workbenches CASCADE;
