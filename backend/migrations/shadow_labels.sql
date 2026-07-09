-- Migration: Add Shadow Label support for Vessels
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN DEFAULT FALSE;
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS vessel_id UUID;

ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS label_id UUID REFERENCES public.labels(id);

-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_labels_vessel_id ON public.labels(vessel_id);
CREATE INDEX IF NOT EXISTS idx_labels_is_shadow ON public.labels(is_shadow);
CREATE INDEX IF NOT EXISTS idx_entities_label_id ON public.entities(label_id);
