-- Fix coa_accounts table
ALTER TABLE coa_accounts ADD COLUMN IF NOT EXISTS sub_account TEXT;

-- Ensure it's populated for existing rows if possible, 
-- though it's mostly used for seeding.
UPDATE coa_accounts SET sub_account = name WHERE level = 2 AND sub_account IS NULL;
