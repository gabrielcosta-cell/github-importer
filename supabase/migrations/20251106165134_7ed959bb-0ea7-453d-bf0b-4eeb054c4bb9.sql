-- Adicionar coluna squad à tabela crm_cards para gerenciamento de equipes
ALTER TABLE crm_cards 
ADD COLUMN squad text CHECK (squad IN ('Apollo', 'Artemis', 'Athena', 'Ares', 'Aurora'));

-- Comentário explicativo da coluna
COMMENT ON COLUMN crm_cards.squad IS 'Squad responsável pelo cliente (Apollo, Artemis, Athena, Ares, Aurora)';