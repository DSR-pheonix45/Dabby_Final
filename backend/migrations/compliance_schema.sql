-- Compliance calendar table (idempotent). The frontend ComplianceView reads this.
CREATE TABLE IF NOT EXISTS compliances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    form TEXT,                       -- GSTR-1, GSTR-3B, TDS, PF, ESI ...
    period TEXT,                     -- e.g. "Apr 2024" or "Q1 FY25"
    deadline DATE NOT NULL,
    status TEXT DEFAULT 'pending',   -- pending, filed, overdue
    filed_date DATE,
    category TEXT DEFAULT 'gst',     -- gst, tds, payroll, income_tax
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliances_workbench ON compliances(workbench_id);
-- Prevent duplicate calendar rows when the generator is re-run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_compliances_unique
    ON compliances(workbench_id, form, deadline);

ALTER TABLE compliances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read compliances" ON compliances;
CREATE POLICY "Members read compliances" ON compliances
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workbench_members m
                WHERE m.workbench_id = compliances.workbench_id
                  AND m.user_id = auth.uid())
    );
