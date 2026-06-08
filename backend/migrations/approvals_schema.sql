-- Approval workflow for bills/payments.
-- Default 'approved' so existing behaviour is unchanged until a workbench opts in.
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('pending','approved','rejected'));
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Per-workbench policy: turn approvals on and set the amount above which a bill
-- must be signed off before it posts to the ledger.
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS approvals_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC DEFAULT 0;
