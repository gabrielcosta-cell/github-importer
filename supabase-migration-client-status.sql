-- Migração: Adicionar coluna client_status na tabela csm_cards
-- Executar no Supabase SQL Editor

-- 1. Adicionar coluna client_status com valor padrão 'ativo'
ALTER TABLE csm_cards 
ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'ativo';

-- 2. Atualizar cards com churn=true para status 'cancelado'
UPDATE csm_cards 
SET client_status = 'cancelado' 
WHERE churn = true;

-- 3. Garantir que todos os demais estejam como 'ativo'
UPDATE csm_cards 
SET client_status = 'ativo' 
WHERE client_status IS NULL OR client_status = '';

-- 4. Adicionar constraint para valores válidos
ALTER TABLE csm_cards 
ADD CONSTRAINT csm_cards_client_status_check 
CHECK (client_status IN ('ativo', 'cancelado'));

-- 5. Criar índice para performance de filtros
CREATE INDEX IF NOT EXISTS idx_csm_cards_client_status 
ON csm_cards(client_status);
