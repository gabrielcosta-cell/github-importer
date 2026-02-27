-- Add squad column to csat_responses
ALTER TABLE public.csat_responses ADD COLUMN squad TEXT DEFAULT NULL;

-- Add squad column to nps_responses  
ALTER TABLE public.nps_responses ADD COLUMN squad TEXT DEFAULT NULL;