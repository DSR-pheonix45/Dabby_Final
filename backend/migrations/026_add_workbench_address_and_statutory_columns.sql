-- Migration 026: Add address, cin, gstin, pan, and bank_accounts columns to workbenches table

ALTER TABLE workbenches 
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cin TEXT,
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS pan TEXT,
ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN workbenches.address IS 'Physical office address JSON (street, city, state, pincode, country)';
COMMENT ON COLUMN workbenches.cin IS 'Corporate Identification Number';
COMMENT ON COLUMN workbenches.gstin IS 'GST Identification Number';
COMMENT ON COLUMN workbenches.pan IS 'Permanent Account Number';
COMMENT ON COLUMN workbenches.bank_accounts IS 'List of bank accounts and COA ledger links';
