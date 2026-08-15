-- Migration 029: Add di_folders table and folder_id column to di_documents

CREATE TABLE IF NOT EXISTS di_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES di_folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#14b8a6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add folder_id to di_documents if not exists
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES di_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_di_folders_workbench_id ON di_folders(workbench_id);
CREATE INDEX IF NOT EXISTS idx_di_folders_parent_id ON di_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_di_documents_folder_id ON di_documents(folder_id);

ALTER TABLE di_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage folders in their workbenches" ON di_folders;
CREATE POLICY "Users can manage folders in their workbenches" ON di_folders FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = di_folders.workbench_id));
