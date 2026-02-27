-- Adicionar campos de métricas de cliente à tabela crm_cards
ALTER TABLE crm_cards
ADD COLUMN IF NOT EXISTS receita_gerada_cliente numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS investimento_midia numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS teve_vendas text DEFAULT NULL CHECK (teve_vendas IN ('Sim', 'Não', NULL)),
ADD COLUMN IF NOT EXISTS teve_roas_maior_1 text DEFAULT NULL CHECK (teve_roas_maior_1 IN ('Sim', 'Não', NULL)),
ADD COLUMN IF NOT EXISTS teve_roi_maior_1 text DEFAULT NULL CHECK (teve_roi_maior_1 IN ('Sim', 'Não', NULL)),
ADD COLUMN IF NOT EXISTS nota_nps integer DEFAULT NULL CHECK (nota_nps IS NULL OR (nota_nps >= 0 AND nota_nps <= 10));

COMMENT ON COLUMN crm_cards.receita_gerada_cliente IS 'Receita gerada ao cliente em reais';
COMMENT ON COLUMN crm_cards.investimento_midia IS 'Total investido em mídia em reais';
COMMENT ON COLUMN crm_cards.teve_vendas IS 'Indica se já teve vendas: Sim, Não ou NULL';
COMMENT ON COLUMN crm_cards.teve_roas_maior_1 IS 'Indica se já teve ROAS > 1: Sim, Não ou NULL';
COMMENT ON COLUMN crm_cards.teve_roi_maior_1 IS 'Indica se já teve ROI > 1: Sim, Não ou NULL';
COMMENT ON COLUMN crm_cards.nota_nps IS 'Nota do último NPS (0-10 ou NULL)';