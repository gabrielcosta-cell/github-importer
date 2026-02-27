-- Add categoria field to crm_cards table
ALTER TABLE public.crm_cards
ADD COLUMN categoria text DEFAULT 'MRR recorrente';

COMMENT ON COLUMN public.crm_cards.categoria IS 'Categoria do cliente: MRR recorrente ou MRR Vendido';