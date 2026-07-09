-- Phase 2: Workbench Collaboration Domain
-- This migration creates the core tables for workbench members and business parties.

-- 1. workbench_members
CREATE TABLE IF NOT EXISTS workbench_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('invited', 'active', 'suspended')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workbench_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workbench_members_workbench_id ON workbench_members(workbench_id);
CREATE INDEX IF NOT EXISTS idx_workbench_members_user_id ON workbench_members(user_id);

COMMENT ON TABLE workbench_members IS 'Users who have access to a Workbench.';

-- 2. parties
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    party_type VARCHAR(50) NOT NULL CHECK (party_type IN ('customer', 'vendor', 'employee', 'investor', 'bank', 'government', 'partner', 'internal', 'other')),
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parties_workbench_id ON parties(workbench_id);

COMMENT ON TABLE parties IS 'Represents every business actor interacting with the workbench.';

-- 3. party_profiles
CREATE TABLE IF NOT EXISTS party_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE UNIQUE,
    legal_name VARCHAR(255),
    industry VARCHAR(100),
    country VARCHAR(100),
    default_currency VARCHAR(3),
    website VARCHAR(255),
    risk_rating VARCHAR(50),
    kyc_status VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_party_profiles_party_id ON party_profiles(party_id);

COMMENT ON TABLE party_profiles IS 'Stores descriptive information about a Party. One profile per party.';

-- 4. party_representatives
CREATE TABLE IF NOT EXISTS party_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_party_representatives_party_id ON party_representatives(party_id);

COMMENT ON TABLE party_representatives IS 'Stores human contacts representing a Party.';

-- 5. party_identities
CREATE TABLE IF NOT EXISTS party_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    identity_type VARCHAR(50) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    issuing_country VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_party_identities_party_id ON party_identities(party_id);

COMMENT ON TABLE party_identities IS 'Stores legal and tax identifiers for a Party.';

-- 6. financial_accounts
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('bank_account', 'cash', 'upi', 'wallet', 'credit_card', 'loan_account', 'escrow', 'brokerage', 'virtual_account')),
    account_holder_name VARCHAR(255),
    display_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc VARCHAR(50),
    swift VARCHAR(50),
    iban VARCHAR(50),
    upi_id VARCHAR(100),
    currency VARCHAR(3),
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_party_id ON financial_accounts(party_id);

COMMENT ON TABLE financial_accounts IS 'Represents payment destinations and transaction sources.';

-- 7. party_engagements
CREATE TABLE IF NOT EXISTS party_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbench_id UUID NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    payment_terms_days INTEGER,
    credit_limit NUMERIC(15, 2),
    default_currency VARCHAR(3),
    preferred_financial_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_party_engagements_workbench_id ON party_engagements(workbench_id);
CREATE INDEX IF NOT EXISTS idx_party_engagements_party_id ON party_engagements(party_id);

COMMENT ON TABLE party_engagements IS 'Represents the commercial relationship between the Workbench and a Party.';

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workbench_members_updated_at ON workbench_members;
CREATE TRIGGER trg_workbench_members_updated_at BEFORE UPDATE ON workbench_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_parties_updated_at ON parties;
CREATE TRIGGER trg_parties_updated_at BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_party_profiles_updated_at ON party_profiles;
CREATE TRIGGER trg_party_profiles_updated_at BEFORE UPDATE ON party_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_party_representatives_updated_at ON party_representatives;
CREATE TRIGGER trg_party_representatives_updated_at BEFORE UPDATE ON party_representatives FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_party_identities_updated_at ON party_identities;
CREATE TRIGGER trg_party_identities_updated_at BEFORE UPDATE ON party_identities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_financial_accounts_updated_at ON financial_accounts;
CREATE TRIGGER trg_financial_accounts_updated_at BEFORE UPDATE ON financial_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_party_engagements_updated_at ON party_engagements;
CREATE TRIGGER trg_party_engagements_updated_at BEFORE UPDATE ON party_engagements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE workbench_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_engagements ENABLE ROW LEVEL SECURITY;

-- Create helper function for role checking
CREATE OR REPLACE FUNCTION is_active_workbench_member(p_workbench_id UUID, p_user_id UUID, p_allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
BEGIN
    -- Fallback: The original creator is always an owner
    IF EXISTS (SELECT 1 FROM workbenches WHERE id = p_workbench_id AND created_by = p_user_id) THEN
        IF 'owner' = ANY(p_allowed_roles) THEN
            RETURN TRUE;
        END IF;
    END IF;

    SELECT role, status INTO v_role, v_status
    FROM workbench_members
    WHERE workbench_id = p_workbench_id AND user_id = p_user_id;

    IF v_status = 'active' AND v_role = ANY(p_allowed_roles) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for workbench_members
CREATE POLICY "workbench_members_select" ON workbench_members FOR SELECT USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer'])
);
CREATE POLICY "workbench_members_insert" ON workbench_members FOR INSERT WITH CHECK (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin'])
);
CREATE POLICY "workbench_members_update" ON workbench_members FOR UPDATE USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin'])
);
CREATE POLICY "workbench_members_delete" ON workbench_members FOR DELETE USING (
    is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin'])
);

-- RLS for parties
CREATE POLICY "parties_select" ON parties FOR SELECT USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']));
CREATE POLICY "parties_insert" ON parties FOR INSERT WITH CHECK (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']));
CREATE POLICY "parties_update" ON parties FOR UPDATE USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']));
CREATE POLICY "parties_delete" ON parties FOR DELETE USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin']));

-- RLS for party_profiles
CREATE POLICY "party_profiles_select" ON party_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_profiles.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']))
);
CREATE POLICY "party_profiles_insert" ON party_profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_profiles.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_profiles_update" ON party_profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_profiles.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_profiles_delete" ON party_profiles FOR DELETE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_profiles.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin']))
);

-- RLS for party_representatives
CREATE POLICY "party_representatives_select" ON party_representatives FOR SELECT USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_representatives.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']))
);
CREATE POLICY "party_representatives_insert" ON party_representatives FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_representatives.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_representatives_update" ON party_representatives FOR UPDATE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_representatives.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_representatives_delete" ON party_representatives FOR DELETE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_representatives.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin']))
);

-- RLS for party_identities
CREATE POLICY "party_identities_select" ON party_identities FOR SELECT USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_identities.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']))
);
CREATE POLICY "party_identities_insert" ON party_identities FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = party_identities.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_identities_update" ON party_identities FOR UPDATE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_identities.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "party_identities_delete" ON party_identities FOR DELETE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = party_identities.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin']))
);

-- RLS for financial_accounts
CREATE POLICY "financial_accounts_select" ON financial_accounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM parties WHERE id = financial_accounts.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']))
);
CREATE POLICY "financial_accounts_insert" ON financial_accounts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM parties WHERE id = financial_accounts.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "financial_accounts_update" ON financial_accounts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = financial_accounts.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']))
);
CREATE POLICY "financial_accounts_delete" ON financial_accounts FOR DELETE USING (
    EXISTS (SELECT 1 FROM parties WHERE id = financial_accounts.party_id AND is_active_workbench_member(parties.workbench_id, auth.uid(), ARRAY['owner', 'admin']))
);

-- RLS for party_engagements
CREATE POLICY "party_engagements_select" ON party_engagements FOR SELECT USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant', 'auditor', 'viewer']));
CREATE POLICY "party_engagements_insert" ON party_engagements FOR INSERT WITH CHECK (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']));
CREATE POLICY "party_engagements_update" ON party_engagements FOR UPDATE USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin', 'cfo', 'finance_manager', 'accountant']));
CREATE POLICY "party_engagements_delete" ON party_engagements FOR DELETE USING (is_active_workbench_member(workbench_id, auth.uid(), ARRAY['owner', 'admin']));
