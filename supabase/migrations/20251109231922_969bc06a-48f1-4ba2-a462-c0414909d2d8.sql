-- Remover a constraint CHECK que limita os valores de squad
ALTER TABLE public.crm_cards DROP CONSTRAINT IF EXISTS crm_cards_squad_check;

-- Adicionar comentário explicando que os valores válidos vêm da tabela squads
COMMENT ON COLUMN public.crm_cards.squad IS 'Squad assignment - values are managed dynamically through the squads table';