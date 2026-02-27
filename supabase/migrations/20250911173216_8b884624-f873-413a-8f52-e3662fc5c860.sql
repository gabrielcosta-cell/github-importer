-- Add new fields to crm_cards table
ALTER TABLE public.crm_cards 
ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS niche TEXT;