-- Migration 028: Add DELETE RLS policy for workbenches & fix di_ledger_entries CASCADE
-- Enables workbench owners/creators to delete their workbench and automatically cascades ledger entries.

-- 1. Allow workbench owner or creator to delete the workbench
DROP POLICY IF EXISTS "workbench_owner_delete" ON workbenches;
CREATE POLICY "workbench_owner_delete" ON workbenches 
FOR DELETE USING (
    created_by = auth.uid() OR 
    is_active_workbench_member(id, auth.uid(), ARRAY['owner'])
);

-- 2. Add ON DELETE CASCADE to di_ledger_entries -> di_accounts foreign key constraint
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'di_ledger_entries_account_id_fkey'
    ) THEN
        ALTER TABLE di_ledger_entries DROP CONSTRAINT di_ledger_entries_account_id_fkey;
        ALTER TABLE di_ledger_entries ADD CONSTRAINT di_ledger_entries_account_id_fkey
            FOREIGN KEY (account_id) REFERENCES di_accounts(id) ON DELETE CASCADE;
    END IF;
END $$;
