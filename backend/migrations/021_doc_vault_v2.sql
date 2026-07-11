-- ==========================================
-- Migration: 021_doc_vault_v2
-- Description: Update document intelligence tables for Financial Analysis and UFO
-- ==========================================

-- 1. Add status and metadata columns to di_documents
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'needs_review', 'ready_to_post', 'posted', 'failed'));
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS confidence NUMERIC;
ALTER TABLE di_documents ADD COLUMN IF NOT EXISTS document_type TEXT;

-- 2. Add structural analysis columns to di_analysis_notes
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS financial_impact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS business_events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE di_analysis_notes ADD COLUMN IF NOT EXISTS expected_journal JSONB DEFAULT '[]'::jsonb;
