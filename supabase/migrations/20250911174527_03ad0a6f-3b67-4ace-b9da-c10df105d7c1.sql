-- Add implementation_value column to crm_cards table
ALTER TABLE public.crm_cards 
ADD COLUMN implementation_value numeric DEFAULT 0;