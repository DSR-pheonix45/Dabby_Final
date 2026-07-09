-- ==========================================
-- Migration: 016_document_intelligence
-- Description: Core domain for Document Intelligence and Chart of Accounts
-- ==========================================

-- Standard function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Chart of Accounts (COA) Foundation

CREATE TABLE IF NOT EXISTS coa_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    industry TEXT,
    business_type TEXT,
    structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE coa_templates IS 'Blueprint hierarchies for generating Financial DNA';

CREATE TRIGGER trg_coa_templates_updated_at
BEFORE UPDATE ON coa_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    parent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE accounts IS 'Recursive hierarchy of accounts for a workbench';

CREATE INDEX idx_accounts_workbench_id ON accounts(workbench_id);
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id);

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();


-- 2. Immutable Evidence Layer

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    file_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workbench_id, file_hash) -- Prevent identical files in same workbench
);

COMMENT ON TABLE documents IS 'Immutable storage metadata for uploaded evidence';

CREATE INDEX idx_documents_workbench_id ON documents(workbench_id);

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_pages IS 'Handles multi-page PDFs or multi-image receipts';

CREATE INDEX idx_document_pages_document_id ON document_pages(document_id);


-- 3. Intelligence Pipeline

CREATE TABLE IF NOT EXISTS document_ocr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    language TEXT,
    raw_text TEXT NOT NULL,
    confidence NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_ocr IS 'Raw extraction text and metadata. Never updated once created.';

CREATE INDEX idx_document_ocr_document_id ON document_ocr(document_id);
CREATE INDEX idx_document_ocr_page_id ON document_ocr(document_page_id);

CREATE TABLE IF NOT EXISTS analysis_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    classification_type TEXT NOT NULL,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasoning TEXT,
    confidence NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE analysis_notes IS 'Semantic understanding (schema-agnostic) produced by the AI';

CREATE INDEX idx_analysis_notes_document_id ON analysis_notes(document_id);

CREATE TRIGGER trg_analysis_notes_updated_at
BEFORE UPDATE ON analysis_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS document_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed')),
    error_message TEXT,
    execution_time_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_processing_logs IS 'Execution traces and failures for every pipeline stage';

CREATE INDEX idx_document_processing_logs_document_id ON document_processing_logs(document_id);


-- ==========================================
-- Row Level Security (RLS)
-- ==========================================

ALTER TABLE coa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_logs ENABLE ROW LEVEL SECURITY;

-- COA Templates are system-wide reading for now
DROP POLICY IF EXISTS "Anyone can read coa templates" ON coa_templates;
CREATE POLICY "Anyone can read coa templates" ON coa_templates FOR SELECT USING (true);

-- Accounts
DROP POLICY IF EXISTS "Users can manage accounts in their workbenches" ON accounts;
CREATE POLICY "Users can manage accounts in their workbenches" ON accounts FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = accounts.workbench_id));

-- Documents
DROP POLICY IF EXISTS "Users can manage documents in their workbenches" ON documents;
CREATE POLICY "Users can manage documents in their workbenches" ON documents FOR ALL USING (EXISTS (SELECT 1 FROM workbenches WHERE id = documents.workbench_id));

-- Document Pages
DROP POLICY IF EXISTS "Users can manage document pages in their workbenches" ON document_pages;
CREATE POLICY "Users can manage document pages in their workbenches" ON document_pages FOR ALL USING (
    EXISTS (SELECT 1 FROM documents d JOIN workbenches w ON d.workbench_id = w.id WHERE d.id = document_pages.document_id)
);

-- Document OCR
DROP POLICY IF EXISTS "Users can manage document ocr in their workbenches" ON document_ocr;
CREATE POLICY "Users can manage document ocr in their workbenches" ON document_ocr FOR ALL USING (
    EXISTS (SELECT 1 FROM documents d JOIN workbenches w ON d.workbench_id = w.id WHERE d.id = document_ocr.document_id)
);

-- Analysis Notes
DROP POLICY IF EXISTS "Users can manage analysis notes in their workbenches" ON analysis_notes;
CREATE POLICY "Users can manage analysis notes in their workbenches" ON analysis_notes FOR ALL USING (
    EXISTS (SELECT 1 FROM documents d JOIN workbenches w ON d.workbench_id = w.id WHERE d.id = analysis_notes.document_id)
);

-- Processing Logs
DROP POLICY IF EXISTS "Users can manage processing logs in their workbenches" ON document_processing_logs;
CREATE POLICY "Users can manage processing logs in their workbenches" ON document_processing_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM documents d JOIN workbenches w ON d.workbench_id = w.id WHERE d.id = document_processing_logs.document_id)
);
