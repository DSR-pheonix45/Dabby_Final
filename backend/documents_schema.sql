-- Schema for Document Management in Datalis
-- This table stores metadata for files uploaded to Supabase Storage

CREATE TABLE IF NOT EXISTS workbench_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to a specific transaction
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage (e.g. 'workbench_id/filename.pdf')
    file_size BIGINT,
    mime_type TEXT,
    document_type TEXT, -- invoice, bill, expense, upi_screenshot, receipt, etc.
    status TEXT DEFAULT 'processed', -- processed, pending, failed
    metadata JSONB DEFAULT '{}', -- Store extracted OCR data or extra info
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_workbench_documents_workbench ON workbench_documents(workbench_id);
CREATE INDEX IF NOT EXISTS idx_workbench_documents_transaction ON workbench_documents(transaction_id);

-- RLS Policies
ALTER TABLE workbench_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage documents in their workbenches" ON workbench_documents;
CREATE POLICY "Users can manage documents in their workbenches" ON workbench_documents 
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = workbench_documents.workbench_id));
