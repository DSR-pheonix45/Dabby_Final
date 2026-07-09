-- Retroactively add missing owners to workbench_members
INSERT INTO workbench_members (workbench_id, user_id, role, status)
SELECT w.id, w.created_by, 'owner', 'active'
FROM workbenches w
WHERE w.created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM workbench_members wm 
    WHERE wm.workbench_id = w.id AND wm.user_id = w.created_by
)
ON CONFLICT DO NOTHING;
