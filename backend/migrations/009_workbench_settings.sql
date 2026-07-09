-- Fix: frontend createWorkbench writes a `settings` jsonb (e.g. enable_inventory),
-- but the workbenches table was missing the column, causing a 400 on create:
--   "Could not find the 'settings' column of 'workbenches' in the schema cache"
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
