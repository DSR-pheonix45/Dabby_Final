-- Phase 3: Enterprise Collaboration & Tasks Engine Updates
-- 1. workbench_tasks (Polymorphic)
CREATE TABLE IF NOT EXISTS workbench_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'completed', 'cancelled')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'workflow')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workbench_tasks_workbench_id ON workbench_tasks(workbench_id);
CREATE INDEX IF NOT EXISTS idx_workbench_tasks_assigned_to ON workbench_tasks(assigned_to);

-- 2. activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workbench_id ON activity_logs(workbench_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- 3. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID REFERENCES workbenches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workbench_id ON notifications(workbench_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_workbench_tasks_updated_at ON workbench_tasks;
CREATE TRIGGER trg_workbench_tasks_updated_at BEFORE UPDATE ON workbench_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE workbench_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for workbench_tasks
CREATE POLICY "workbench_tasks_select" ON workbench_tasks FOR SELECT USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer'])
);
CREATE POLICY "workbench_tasks_insert" ON workbench_tasks FOR INSERT WITH CHECK (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant'])
);
CREATE POLICY "workbench_tasks_update" ON workbench_tasks FOR UPDATE USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer'])
);
CREATE POLICY "workbench_tasks_delete" ON workbench_tasks FOR DELETE USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager'])
);

-- Policies for activity_logs (append-only)
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer'])
);
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer'])
);

-- Policies for notifications (user-specific)
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (user_id = auth.uid() OR is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor']));
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (user_id = auth.uid());
