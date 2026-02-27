-- Adicionar coluna copy_type nas tabelas para separar Onboarding e Ongoing

-- Adicionar coluna na tabela copy_forms
ALTER TABLE copy_forms 
ADD COLUMN IF NOT EXISTS copy_type TEXT DEFAULT 'onboarding' CHECK (copy_type IN ('onboarding', 'ongoing'));

-- Criar índice para melhorar performance nas queries
CREATE INDEX IF NOT EXISTS idx_copy_forms_copy_type ON copy_forms(copy_type);

-- Adicionar coluna na tabela default_prompts
ALTER TABLE default_prompts 
ADD COLUMN IF NOT EXISTS copy_type TEXT DEFAULT 'onboarding' CHECK (copy_type IN ('onboarding', 'ongoing'));

CREATE INDEX IF NOT EXISTS idx_default_prompts_copy_type ON default_prompts(copy_type);

-- Adicionar coluna na tabela default_briefing_documents (se existir)
ALTER TABLE default_briefing_documents 
ADD COLUMN IF NOT EXISTS copy_type TEXT DEFAULT 'onboarding' CHECK (copy_type IN ('onboarding', 'ongoing'));

CREATE INDEX IF NOT EXISTS idx_default_briefing_documents_copy_type ON default_briefing_documents(copy_type);

COMMENT ON COLUMN copy_forms.copy_type IS 'Tipo de copy: onboarding (processo inicial) ou ongoing (processo contínuo)';
COMMENT ON COLUMN default_prompts.copy_type IS 'Tipo de copy ao qual o prompt se aplica';
COMMENT ON COLUMN default_briefing_documents.copy_type IS 'Tipo de copy ao qual o documento padrão se aplica';