-- Migration: Create workbench_tasks table
CREATE TABLE IF NOT EXISTS public.workbench_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES public.workbenches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workbench_tasks_workbench_id ON public.workbench_tasks(workbench_id);
CREATE INDEX IF NOT EXISTS idx_workbench_tasks_assigned_to ON public.workbench_tasks(assigned_to);

-- Enable RLS
ALTER TABLE public.workbench_tasks ENABLE ROW LEVEL SECURITY;

-- Simple policy (all authenticated users can see tasks for workbenches they are members of)
-- This assumes we have a way to check membership.
-- For now, let's keep it simple or rely on service role for backend.
