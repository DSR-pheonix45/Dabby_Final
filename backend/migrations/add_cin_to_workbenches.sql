-- Add CIN to workbenches table
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS cin TEXT;
