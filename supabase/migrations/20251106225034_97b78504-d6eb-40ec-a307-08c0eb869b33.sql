-- Remover constraints antigas
ALTER TABLE crm_cards DROP CONSTRAINT IF EXISTS crm_cards_plano_check;
ALTER TABLE projetos_reservados DROP CONSTRAINT IF EXISTS projetos_reservados_plano_check;

-- Adicionar constraints atualizadas com "Social"
ALTER TABLE crm_cards 
ADD CONSTRAINT crm_cards_plano_check 
CHECK (plano = ANY (ARRAY['Starter'::text, 'Business'::text, 'Pro'::text, 'Conceito'::text, 'Social'::text]) OR plano IS NULL);

ALTER TABLE projetos_reservados 
ADD CONSTRAINT projetos_reservados_plano_check 
CHECK (plano = ANY (ARRAY['STARTER'::text, 'BUSINESS'::text, 'PRO'::text, 'CONCEITO'::text, 'SOCIAL'::text]));