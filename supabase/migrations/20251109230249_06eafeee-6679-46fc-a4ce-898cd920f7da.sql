-- Create squads table
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view squads"
ON public.squads
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create squads"
ON public.squads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update squads"
ON public.squads
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete squads"
ON public.squads
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Insert default squads with their colors
INSERT INTO public.squads (name, color, position) VALUES
  ('Apollo', '#3b82f6', 0),
  ('Artemis', '#f97316', 1),
  ('Athena', '#a855f7', 2),
  ('Ares', '#ef4444', 3),
  ('Aurora', '#f59e0b', 4),
  ('Atlas', '#10b981', 5)
ON CONFLICT (name) DO NOTHING;