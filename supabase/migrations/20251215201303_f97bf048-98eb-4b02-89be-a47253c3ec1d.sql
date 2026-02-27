-- Add column for DOT logo variant selection
ALTER TABLE public.success_cases
ADD COLUMN dot_logo_variant TEXT DEFAULT 'dark' CHECK (dot_logo_variant IN ('dark', 'light'));