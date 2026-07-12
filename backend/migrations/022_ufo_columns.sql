-- Add strictly typed UFO columns to di_analysis_notes table

ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS parties JSONB DEFAULT '{}'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS money JSONB DEFAULT '{}'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS taxes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS dates JSONB DEFAULT '{}'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN di_analysis_notes.document_type IS 'Canonical document type for UFO';
COMMENT ON COLUMN di_analysis_notes.parties IS 'Issuer and recipient information';
COMMENT ON COLUMN di_analysis_notes.money IS 'Total amounts, subtotal, and currency';
COMMENT ON COLUMN di_analysis_notes.taxes IS 'Tax breakdowns and line items';
COMMENT ON COLUMN di_analysis_notes.dates IS 'Document dates, due dates, period dates';
COMMENT ON COLUMN di_analysis_notes.line_items IS 'Transactions or invoice line items';
