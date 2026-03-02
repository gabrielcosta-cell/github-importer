-- Migration: Adicionar colunas faltantes na tabela csm_cards
-- Executar no Supabase SQL Editor ANTES de importar os clientes cancelados

-- Comissão
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS existe_comissao boolean DEFAULT false;

-- Serviço contratado
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS servico_contratado text;

-- Tempo de contrato (em meses)
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS tempo_contrato text;

-- Fase do projeto
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS fase_projeto text;
