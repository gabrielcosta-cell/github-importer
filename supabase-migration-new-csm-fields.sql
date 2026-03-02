-- Migration: Adicionar campos faltantes ao CSM Card
-- etapa_real, valor_contrato, observacao_comissao

ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS etapa_real text;
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS valor_contrato numeric DEFAULT 0;
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS observacao_comissao text;
