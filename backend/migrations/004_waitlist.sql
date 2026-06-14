-- Migration to create the waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anonymous) to insert their email to join the waitlist
CREATE POLICY "Allow public inserts" ON public.waitlist
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users (like internal dashboards or admins) to select/read the waitlist
CREATE POLICY "Allow authenticated selects" ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);
