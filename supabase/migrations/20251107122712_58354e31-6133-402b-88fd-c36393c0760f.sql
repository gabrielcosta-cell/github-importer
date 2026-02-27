-- Adicionar campos específicos de Customer Success na tabela crm_cards
ALTER TABLE crm_cards 
ADD COLUMN IF NOT EXISTS data_renovacao date,
ADD COLUMN IF NOT EXISTS health_score integer CHECK (health_score >= 0 AND health_score <= 100),
ADD COLUMN IF NOT EXISTS satisfacao_cliente integer CHECK (satisfacao_cliente >= 0 AND satisfacao_cliente <= 10),
ADD COLUMN IF NOT EXISTS nivel_engajamento text CHECK (nivel_engajamento IN ('Baixo', 'Médio', 'Alto', 'Muito Alto'));

-- Adicionar comentários para documentação
COMMENT ON COLUMN crm_cards.data_renovacao IS 'Data prevista de renovação do contrato do cliente';
COMMENT ON COLUMN crm_cards.health_score IS 'Score de saúde do cliente (0-100)';
COMMENT ON COLUMN crm_cards.satisfacao_cliente IS 'Nível de satisfação do cliente (0-10)';
COMMENT ON COLUMN crm_cards.nivel_engajamento IS 'Nível de engajamento do cliente';