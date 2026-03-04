-- Migration: Adicionar campos de tipo de receita ao csm_cards
-- Executar no Supabase SQL Editor

-- Tipo de receita para cards do CRM Ops
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS tipo_receita text
  CHECK (tipo_receita IS NULL OR tipo_receita IN ('venda_unica', 'variavel_midia', 'variavel_meta', 'venda_recorrente'));

-- Marca cards recorrentes já migrados para o CSM
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS migrado_csm boolean DEFAULT false;

-- Data de ganho/fechamento do negócio
ALTER TABLE csm_cards ADD COLUMN IF NOT EXISTS data_ganho date;
