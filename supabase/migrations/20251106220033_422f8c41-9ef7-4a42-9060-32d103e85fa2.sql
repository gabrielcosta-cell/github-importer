-- Adicionar campo 'plano' na tabela crm_cards
ALTER TABLE public.crm_cards 
ADD COLUMN IF NOT EXISTS plano TEXT CHECK (plano IN ('Starter', 'Business', 'Pro', 'Conceito') OR plano IS NULL);