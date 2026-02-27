-- Adicionar coluna de cor na tabela squads
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

-- Comentário na coluna
COMMENT ON COLUMN public.squads.color IS 'Cor do squad em formato hexadecimal';

-- Atualizar squads existentes com cores padrão
UPDATE public.squads SET color = '#3b82f6' WHERE name = 'Apollo';
UPDATE public.squads SET color = '#f97316' WHERE name = 'Artemis';
UPDATE public.squads SET color = '#a855f7' WHERE name = 'Athena';
UPDATE public.squads SET color = '#ef4444' WHERE name = 'Ares';
UPDATE public.squads SET color = '#f59e0b' WHERE name = 'Aurora';
UPDATE public.squads SET color = '#14b8a6' WHERE name = 'Atlas';