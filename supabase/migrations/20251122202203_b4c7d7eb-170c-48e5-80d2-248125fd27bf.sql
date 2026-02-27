-- Adicionar coluna faturamento_display que aceita texto
ALTER TABLE crm_cards 
ADD COLUMN faturamento_display TEXT;

-- Comentário explicativo
COMMENT ON COLUMN crm_cards.faturamento_display IS 'Campo de faturamento que aceita texto e números para exibição flexível';