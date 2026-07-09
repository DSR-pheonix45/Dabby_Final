-- Schema for Document Management in Datalis
-- This table stores metadata for files uploaded to Supabase Storage

CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to a specific transaction
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage (e.g. 'user_id/filename.pdf')
    file_size BIGINT,
    mime_type TEXT,
    document_type TEXT, -- invoice, bill, expense, upi_screenshot, receipt, etc.
    status TEXT DEFAULT 'processed', -- processed, pending, failed
    metadata JSONB DEFAULT '{}', -- Store extracted OCR data or extra info
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_workbench ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_transaction ON user_documents(transaction_id);

-- RLS Policies
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage documents in their workbenches" ON user_documents;
CREATE POLICY "Users can manage documents in their workbenches" ON user_documents 
    FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = user_documents.user_id));
