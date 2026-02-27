-- Adicionar campos categoria e squad na tabela projetos_reservados
ALTER TABLE projetos_reservados 
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'MRR recorrente',
ADD COLUMN IF NOT EXISTS squad text;

-- Adicionar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_projetos_categoria ON projetos_reservados(categoria);
CREATE INDEX IF NOT EXISTS idx_projetos_squad ON projetos_reservados(squad);