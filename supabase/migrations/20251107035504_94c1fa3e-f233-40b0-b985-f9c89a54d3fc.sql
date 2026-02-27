-- Adicionar campos de motivo de perda e comentários na tabela crm_cards
ALTER TABLE crm_cards
ADD COLUMN IF NOT EXISTS motivo_perda TEXT,
ADD COLUMN IF NOT EXISTS comentarios_perda TEXT;