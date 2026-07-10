-- Migration 020: Fix Workbenches RLS
-- Allows invited users to view the workbenches they are a member of.

ALTER TABLE workbenches ENABLE ROW LEVEL SECURITY;

-- Allow members to view the workbench
DROP POLICY IF EXISTS "workbench_members_select" ON workbenches;
CREATE POLICY "workbench_members_select" ON workbenches 
FOR SELECT USING (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM workbench_members 
        WHERE workbench_members.workbench_id = workbenches.id 
        AND workbench_members.user_id = auth.uid() 
        AND workbench_members.status = 'active'
    )
);

-- Allow members to update the workbench settings if they are owner/admin
DROP POLICY IF EXISTS "workbench_members_update" ON workbenches;
CREATE POLICY "workbench_members_update" ON workbenches 
FOR UPDATE USING (
    created_by = auth.uid() OR 
    is_active_workbench_member(id, auth.uid(), ARRAY['owner', 'admin'])
);
