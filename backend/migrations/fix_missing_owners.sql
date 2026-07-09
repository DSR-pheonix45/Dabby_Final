-- Retroactively add missing owners to workbench_members
INSERT INTO workbench_members (workbench_id, user_id, role, status)
SELECT w.id, w.user_id, 'owner', 'active'
FROM workbenches w
WHERE NOT EXISTS (
    SELECT 1 FROM workbench_members wm 
    WHERE wm.workbench_id = w.id AND wm.user_id = w.user_id
)
ON CONFLICT DO NOTHING;
