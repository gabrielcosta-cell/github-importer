-- Add card_id column to nps_responses table for CSM card linking
ALTER TABLE public.nps_responses 
ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.crm_cards(id) ON DELETE SET NULL;

-- Add card_id column to csat_responses table for CSM card linking
ALTER TABLE public.csat_responses 
ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.crm_cards(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nps_responses_card_id ON public.nps_responses(card_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_card_id ON public.csat_responses(card_id);