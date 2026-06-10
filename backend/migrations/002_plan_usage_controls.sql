-- ============================================================
-- Dabby Plan-Based Usage Controls — SQL Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PLANS TABLE — Stores plan definitions and their limits
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,                    -- 'free', 'go', 'pro', 'enterprise'
    name TEXT NOT NULL,                     -- Display name
    price_inr INTEGER NOT NULL DEFAULT 0,   -- Monthly price in INR
    description TEXT,

    -- Usage Limits
    max_workbenches INTEGER NOT NULL DEFAULT 0,
    max_members_per_workbench INTEGER NOT NULL DEFAULT 0,
    max_ai_requests_per_month INTEGER NOT NULL DEFAULT 50,
    doc_vault_mb INTEGER NOT NULL DEFAULT 0,  -- Max storage in MB

    -- Feature Flags
    investor_view BOOLEAN NOT NULL DEFAULT FALSE,
    advanced_coa BOOLEAN NOT NULL DEFAULT FALSE,
    audit_logs BOOLEAN NOT NULL DEFAULT FALSE,
    priority_ai BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 4 plans
INSERT INTO plans (id, name, price_inr, description, max_workbenches, max_members_per_workbench, max_ai_requests_per_month, doc_vault_mb, investor_view, advanced_coa, audit_logs, priority_ai, sort_order)
VALUES
    ('free',       'Free',       0,     'Perfect for exploring AI capabilities.',
     0, 0, 50, 0, FALSE, FALSE, FALSE, FALSE, 1),

    ('go',         'Go',         5000,  'For startups needing active tracking.',
     5, 5, 500, 100, FALSE, FALSE, FALSE, FALSE, 2),

    ('pro',        'Pro',        10000, 'Advanced tools for growing teams.',
     10, 15, 1000, 500, TRUE, TRUE, FALSE, TRUE, 3),

    ('enterprise', 'Enterprise', 20000, 'Custom solutions for large organizations.',
     999, 50, 9999, 5000, TRUE, TRUE, TRUE, TRUE, 4)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_inr = EXCLUDED.price_inr,
    description = EXCLUDED.description,
    max_workbenches = EXCLUDED.max_workbenches,
    max_members_per_workbench = EXCLUDED.max_members_per_workbench,
    max_ai_requests_per_month = EXCLUDED.max_ai_requests_per_month,
    doc_vault_mb = EXCLUDED.doc_vault_mb,
    investor_view = EXCLUDED.investor_view,
    advanced_coa = EXCLUDED.advanced_coa,
    audit_logs = EXCLUDED.audit_logs,
    priority_ai = EXCLUDED.priority_ai,
    sort_order = EXCLUDED.sort_order;


-- ============================================================
-- 2. USER_SUBSCRIPTIONS TABLE — Tracks user plan history
-- ============================================================
-- This tracks when users change plans (upgrade/downgrade history).
-- The LATEST row per user_id = their current active subscription.
-- The `users.plan` column remains the source of truth for quick lookups.

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),

    -- Razorpay integration
    razorpay_subscription_id TEXT,      -- Razorpay subscription ID (if paid)
    razorpay_payment_id TEXT,           -- Last payment ID

    -- Dates
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,             -- NULL for free (never expires)
    cancelled_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
    ON user_subscriptions(user_id, started_at DESC);

-- Seed a subscription row for every existing user based on their current plan
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
SELECT
    u.id,
    COALESCE(u.plan, 'free'),
    'active',
    COALESCE(u.created_at, NOW())
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id
);


-- ============================================================
-- 3. AI_USAGE_LOG TABLE — Tracks AI requests per user per month
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL DEFAULT 'chat',
        -- 'chat', 'template', 'categorize', 'scan'
    model TEXT,                            -- e.g. 'llama-3.3-70b-versatile'
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for counting monthly requests efficiently
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
    ON ai_usage_log(user_id, created_at DESC);


-- ============================================================
-- 4. ENSURE users.plan COLUMN EXISTS (it already does, but safe)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'plan'
    ) THEN
        ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
    END IF;
END $$;

-- Add foreign key from users.plan → plans.id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_plan'
          AND table_name = 'users'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_plan
            FOREIGN KEY (plan) REFERENCES plans(id);
    END IF;
END $$;


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

-- Plans table: readable by everyone, writable by service role only
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans are publicly readable" ON plans;
CREATE POLICY "Plans are publicly readable" ON plans
    FOR SELECT USING (true);

-- User subscriptions: users can read their own, service role can write
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON user_subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- AI usage log: users can read their own
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own AI usage" ON ai_usage_log;
CREATE POLICY "Users can view own AI usage" ON ai_usage_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage AI usage" ON ai_usage_log;
CREATE POLICY "Service role can manage AI usage" ON ai_usage_log
    FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- DONE! Verify by running:
--   SELECT * FROM plans ORDER BY sort_order;
--   SELECT * FROM user_subscriptions LIMIT 5;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan';
-- ============================================================
