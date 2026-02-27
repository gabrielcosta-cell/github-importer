-- Adicionar coluna briefing_questions à tabela pipeline_required_fields
ALTER TABLE pipeline_required_fields 
ADD COLUMN IF NOT EXISTS briefing_questions jsonb DEFAULT '[]'::jsonb;

-- Adicionar coluna briefing_answers à tabela crm_cards
ALTER TABLE crm_cards 
ADD COLUMN IF NOT EXISTS briefing_answers jsonb DEFAULT '{}'::jsonb;