-- Adicionar coluna module_scope à tabela crm_tags
ALTER TABLE crm_tags 
ADD COLUMN module_scope TEXT NOT NULL DEFAULT 'both' 
CHECK (module_scope IN ('crm', 'csm', 'both'));

-- Criar índice para performance
CREATE INDEX idx_crm_tags_module_scope ON crm_tags(module_scope);

-- Comentário explicativo
COMMENT ON COLUMN crm_tags.module_scope IS 'Define em qual módulo a etiqueta está disponível: crm (apenas CRM), csm (apenas CSM), ou both (ambos módulos)';

-- Atualizar etiquetas de qualificação existentes para serem exclusivas do CRM
UPDATE crm_tags 
SET module_scope = 'crm' 
WHERE name IN ('DESQUALIFICADO', 'PRÉ QUALIFICADO', 'QUALIFICAÇÃO MÉDIA', 'QUALIFICAÇÃO INDEFINIDA', 'NÃO É O DECISOR');