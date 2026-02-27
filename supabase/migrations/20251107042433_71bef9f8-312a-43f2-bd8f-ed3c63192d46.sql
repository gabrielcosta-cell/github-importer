-- Adicionar campo data_perda na tabela crm_cards
ALTER TABLE public.crm_cards 
ADD COLUMN IF NOT EXISTS data_perda timestamp with time zone;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.crm_cards.data_perda IS 'Data em que o card foi marcado como perdido';