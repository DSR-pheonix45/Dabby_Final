-- ============================================================================
-- Module 12: Subscription plans + usage metering
-- Free / Go (Seed) / Pro (Growth) / Enterprise (Scale)
-- ============================================================================

-- Plan tier lives on the workbench (billing is per organization/workbench).
ALTER TABLE workbenches ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- Monthly, workbench-scoped counters (currently: OCR document uploads).
CREATE TABLE IF NOT EXISTS user_usage (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    period       TEXT NOT NULL,               -- 'YYYY-MM'
    metric       TEXT NOT NULL,               -- e.g. 'uploads'
    count        INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, period, metric)
);

-- Daily, per-user AI consultant message counters (chat rate limiting).
CREATE TABLE IF NOT EXISTS ai_usage (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id  UUID REFERENCES workbenches(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,
    usage_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    message_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_lookup ON user_usage(user_id, period, metric);
CREATE INDEX IF NOT EXISTS idx_ai_usage_lookup        ON ai_usage(user_id, user_id, usage_date);

-- RLS: the FastAPI backend uses the service role (bypasses RLS), but enable it
-- so any future direct client reads are members-only.
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_usage' AND policyname = 'members_read_usage') THEN
        CREATE POLICY members_read_usage ON user_usage FOR SELECT
        USING (user_id IN (SELECT user_id FROM user_members WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage' AND policyname = 'own_read_ai_usage') THEN
        CREATE POLICY own_read_ai_usage ON ai_usage FOR SELECT
        USING (user_id = auth.uid());
    END IF;
END$$;
