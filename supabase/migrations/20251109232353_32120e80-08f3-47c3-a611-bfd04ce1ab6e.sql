-- Adicionar coluna de ícone na tabela squads
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Users';

-- Atualizar os squads existentes com ícones padrão
UPDATE public.squads SET icon = 'Rocket' WHERE name = 'Apollo';
UPDATE public.squads SET icon = 'Bow' WHERE name = 'Artemis';
UPDATE public.squads SET icon = 'Brain' WHERE name = 'Athena';
UPDATE public.squads SET icon = 'Swords' WHERE name = 'Ares';
UPDATE public.squads SET icon = 'Sunrise' WHERE name = 'Aurora';
UPDATE public.squads SET icon = 'Mountain' WHERE name = 'Atlas';

-- Adicionar comentário
COMMENT ON COLUMN public.squads.icon IS 'Lucide icon name for the squad (e.g., Rocket, Brain, Swords)';