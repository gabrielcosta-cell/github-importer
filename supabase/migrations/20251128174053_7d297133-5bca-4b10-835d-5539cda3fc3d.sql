-- Adicionar campo flag à tabela crm_cards
ALTER TABLE crm_cards 
ADD COLUMN IF NOT EXISTS flag TEXT CHECK (flag IN ('verde', 'amarela', 'vermelha'));