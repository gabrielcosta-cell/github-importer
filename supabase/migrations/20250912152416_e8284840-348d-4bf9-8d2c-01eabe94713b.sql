-- Add UTM tracking fields to crm_cards table
ALTER TABLE public.crm_cards 
ADD COLUMN utm_url TEXT,
ADD COLUMN utm_source TEXT,
ADD COLUMN utm_medium TEXT,
ADD COLUMN utm_campaign TEXT,
ADD COLUMN utm_term TEXT,
ADD COLUMN utm_content TEXT;