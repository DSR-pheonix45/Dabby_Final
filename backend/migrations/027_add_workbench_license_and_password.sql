-- Migration 027: Add license_key and access_password columns to workbenches table

ALTER TABLE workbenches 
ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS access_password TEXT;

COMMENT ON COLUMN workbenches.license_key IS 'Auto-generated License Key for workbench access across devices';
COMMENT ON COLUMN workbenches.access_password IS 'Password required to gain access to workbench on other devices/accounts';

-- Backfill missing license_key and access_password for existing records
UPDATE workbenches 
SET license_key = 'WB-' || UPPER(SUBSTRING(MD5(id::text || 'key') FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(id::text || 'key2') FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(id::text || 'key3') FROM 1 FOR 4))
WHERE license_key IS NULL;

UPDATE workbenches 
SET access_password = 'Wb-' || SUBSTRING(MD5(id::text || 'pass') FROM 1 FOR 6)
WHERE access_password IS NULL;
