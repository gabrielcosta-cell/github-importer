-- Adicionar campos de site, CNPJ e endereço à tabela crm_cards
ALTER TABLE public.crm_cards
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS endereco_rua TEXT,
ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
ADD COLUMN IF NOT EXISTS endereco_estado TEXT;

-- Adicionar índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_crm_cards_cnpj ON public.crm_cards(cnpj);
CREATE INDEX IF NOT EXISTS idx_crm_cards_cep ON public.crm_cards(cep);