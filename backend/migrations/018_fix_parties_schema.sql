-- 1. Add new columns for workbench collaboration
ALTER TABLE public.parties 
ADD COLUMN IF NOT EXISTS workbench_id UUID REFERENCES public.workbenches(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS party_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Drop the NOT NULL constraint on category for backwards compatibility
ALTER TABLE public.parties ALTER COLUMN category DROP NOT NULL;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_parties_workbench_id ON public.parties(workbench_id);
