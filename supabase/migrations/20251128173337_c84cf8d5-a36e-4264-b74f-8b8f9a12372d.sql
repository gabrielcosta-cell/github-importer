-- Adicionar campos de informações contratuais à tabela crm_cards
ALTER TABLE crm_cards 
ADD COLUMN IF NOT EXISTS servico_contratado TEXT,
ADD COLUMN IF NOT EXISTS tempo_contrato TEXT,
ADD COLUMN IF NOT EXISTS frequencia_reuniao TEXT,
ADD COLUMN IF NOT EXISTS criativos_estaticos INTEGER,
ADD COLUMN IF NOT EXISTS criativos_video INTEGER,
ADD COLUMN IF NOT EXISTS lps INTEGER,
ADD COLUMN IF NOT EXISTS limite_investimento NUMERIC,
ADD COLUMN IF NOT EXISTS existe_comissao BOOLEAN DEFAULT false;