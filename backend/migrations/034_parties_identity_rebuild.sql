-- Migration 034: Rebuild Party Identity, Roles, and Classification Layer

-- 0. Bulletproof set_updated_at() trigger function against undefined_column errors
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW.updated_at = NOW();
    EXCEPTION WHEN undefined_column THEN
        -- Ignore if target table/record lacks an updated_at column
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Ensure required columns on public.parties
ALTER TABLE public.parties
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) DEFAULT 'CORPORATION',
ADD COLUMN IF NOT EXISTS gstin VARCHAR(50),
ADD COLUMN IF NOT EXISTS pan VARCHAR(50),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS is_self BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update legal_name from name where null
UPDATE public.parties SET legal_name = name WHERE legal_name IS NULL OR legal_name = '';
UPDATE public.parties SET display_name = name WHERE display_name IS NULL OR display_name = '';

-- Ensure non-null on legal_name
ALTER TABLE public.parties ALTER COLUMN legal_name SET NOT NULL;

-- 2. Create party_roles table
CREATE TABLE IF NOT EXISTS public.party_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CUSTOMER', 'VENDOR', 'PARTNER', 'INVESTOR', 'BANK', 'OTHER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(party_id, role)
);

CREATE INDEX IF NOT EXISTS idx_party_roles_party_id ON public.party_roles(party_id);
CREATE INDEX IF NOT EXISTS idx_party_roles_role ON public.party_roles(role);

-- 3. Enforce exactly one is_self = true Party per Workbench
CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_single_self 
ON public.parties (workbench_id) 
WHERE is_self = TRUE;

-- 4. Data Migration: Populate party_roles from legacy party_type column
INSERT INTO public.party_roles (party_id, role)
SELECT 
    p.id,
    CASE 
        WHEN LOWER(p.party_type) = 'customer' THEN 'CUSTOMER'
        WHEN LOWER(p.party_type) = 'vendor' THEN 'VENDOR'
        WHEN LOWER(p.party_type) = 'partner' THEN 'PARTNER'
        WHEN LOWER(p.party_type) = 'investor' THEN 'INVESTOR'
        WHEN LOWER(p.party_type) = 'bank' THEN 'BANK'
        ELSE 'OTHER'
    END
FROM public.parties p
WHERE LOWER(p.party_type) != 'internal'
ON CONFLICT (party_id, role) DO NOTHING;

-- 5. Mark legacy internal parties as is_self = true
UPDATE public.parties 
SET is_self = TRUE 
WHERE LOWER(party_type) = 'internal';

-- 6. Ensure every Workbench has an Internal / Self Party initialized
INSERT INTO public.parties (workbench_id, name, legal_name, display_name, entity_type, is_self, status)
SELECT 
    w.id,
    w.name,
    COALESCE(w.legal_name, w.name),
    w.name,
    'CORPORATION',
    TRUE,
    'ACTIVE'
FROM public.workbenches w
WHERE NOT EXISTS (
    SELECT 1 FROM public.parties p WHERE p.workbench_id = w.id AND p.is_self = TRUE
)
ON CONFLICT DO NOTHING;
