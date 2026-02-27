-- Adicionar campo prompt_type na tabela de prompts
ALTER TABLE public.success_case_prompts 
ADD COLUMN IF NOT EXISTS prompt_type text NOT NULL DEFAULT 'post' 
CHECK (prompt_type IN ('post', 'blog'));

-- Adicionar campo copy_type na tabela de copies para diferenciar resultados
ALTER TABLE public.success_case_copies 
ADD COLUMN IF NOT EXISTS copy_type text NOT NULL DEFAULT 'post' 
CHECK (copy_type IN ('post', 'blog'));

-- Criar índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_success_case_prompts_type ON public.success_case_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_success_case_copies_type ON public.success_case_copies(copy_type);