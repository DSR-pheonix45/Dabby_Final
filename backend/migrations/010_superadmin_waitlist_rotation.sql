-- ============================================================================
-- Dabby Sprint: Key Rotation, IP restrictions, Waitlist Gating & Superadmin Dashboard
-- ============================================================================

-- 1. Alter waitlist to add status column if it doesn't exist
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Create groq_api_keys table
CREATE TABLE IF NOT EXISTS public.groq_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT UNIQUE NOT NULL,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'rate_limited', 'invalid'
    failure_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_ip_logs table (Account Sharing Prevention)
CREATE TABLE IF NOT EXISTS public.user_ip_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ip_address TEXT NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ip_address)
);

-- 4. Create superadmins table
CREATE TABLE IF NOT EXISTS public.superadmins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed superadmins with developers' emails
INSERT INTO public.superadmins (email) VALUES 
('imperialion45@gmail.com'),
('medhanshk10@gmail.com'),
('speedblast069@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 5. Create page_views table for navigation analytics
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Nullable for anonymous views
    email TEXT,
    path TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create payments table to log/monitor subscriptions
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID REFERENCES workbenches(id) ON DELETE SET NULL,
    user_id UUID,
    email TEXT,
    plan TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'failed', 'refunded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create plan_history table to track upgrades/downgrades
CREATE TABLE IF NOT EXISTS public.plan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID REFERENCES workbenches(id) ON DELETE CASCADE,
    previous_plan TEXT,
    new_plan TEXT NOT NULL,
    changed_by UUID, -- user who triggered change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.groq_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_history ENABLE ROW LEVEL SECURITY;

-- Set up policies (Service Role accesses everything anyway, but keep it clean)
CREATE POLICY "Superadmins read all" ON public.waitlist FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.superadmins WHERE email = auth.jwt()->>'email')
);

-- 8. Auth.users trigger to prevent unauthorized signups/logins
CREATE OR REPLACE FUNCTION public.check_waitlist_before_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Exempt superadmins from waitlist check
  IF EXISTS (SELECT 1 FROM public.superadmins WHERE email = NEW.email) THEN
    RETURN NEW;
  END IF;

  -- Check if email is approved in waitlist
  IF NOT EXISTS (
    SELECT 1 FROM public.waitlist 
    WHERE email = NEW.email AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Signup blocked: Email % is not approved on the waitlist.', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute BEFORE inserting into auth.users (Supabase creates users here)
DROP TRIGGER IF EXISTS tr_check_waitlist_before_signup ON auth.users;
CREATE TRIGGER tr_check_waitlist_before_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_waitlist_before_signup();
