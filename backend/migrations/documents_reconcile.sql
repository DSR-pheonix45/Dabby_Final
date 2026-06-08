-- ============================================================================
-- Reconcile workbench_documents schema.
-- The frontend (DocVault, backendService, DataIngestion, doc->txn linking) is
-- written against columns the live table didn't have (filename, status,
-- transaction_id, created_at, metadata, file_size, mime_type, document_type).
-- This additively introduces them and backfills from the existing columns so
-- the document vault, ingest-from-vault and linking all work. Idempotent.
-- ============================================================================

ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE workbench_documents ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Backfill the new columns from the original ones where they exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='workbench_documents' AND column_name='file_name') THEN
        UPDATE workbench_documents SET filename = COALESCE(filename, file_name) WHERE filename IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='workbench_documents' AND column_name='processing_status') THEN
        UPDATE workbench_documents SET status = COALESCE(status, processing_status) WHERE status IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='workbench_documents' AND column_name='uploaded_at') THEN
        UPDATE workbench_documents SET created_at = COALESCE(created_at, uploaded_at) WHERE created_at IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workbench_documents_txn ON workbench_documents(transaction_id);
