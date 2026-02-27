-- Criar tabela para formulários de análise e benchmark
CREATE TABLE IF NOT EXISTS public.analise_bench_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cliente
  client_id TEXT,
  
  -- Informações do Cliente
  nome_empresa TEXT,
  nicho_empresa TEXT,
  site TEXT,
  servicos_produtos TEXT,
  diferenciais_competitivos TEXT,
  publico_alvo TEXT,
  objetivo_projeto TEXT,
  maior_desafio TEXT,
  
  -- Concorrentes (JSONB array)
  competitors JSONB,
  
  -- Foco da Análise
  objetivo_benchmark TEXT[],
  objetivo_benchmark_outro TEXT,
  aspecto_prioritario TEXT,
  informacoes_adicionais TEXT,
  
  -- Metadados
  status TEXT DEFAULT 'draft',
  ai_response TEXT,
  ai_provider TEXT,
  response_generated_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar Row Level Security
ALTER TABLE public.analise_bench_forms ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar apenas seus próprios briefings ou de todos se tiverem permissão
CREATE POLICY "Users can view analise bench forms based on permissions"
ON public.analise_bench_forms
FOR SELECT
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.user_module_permissions ump
    JOIN public.modules m ON ump.module_id = m.id
    WHERE ump.user_id = auth.uid()
      AND m.name = 'analise_bench'
      AND ump.can_view = true
  )
);

-- Política: Usuários podem criar briefings se tiverem permissão
CREATE POLICY "Users can create analise bench forms with permission"
ON public.analise_bench_forms
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_module_permissions ump
    JOIN public.modules m ON ump.module_id = m.id
    WHERE ump.user_id = auth.uid()
      AND m.name = 'analise_bench'
      AND ump.can_create = true
  )
);

-- Política: Usuários podem atualizar seus próprios briefings se tiverem permissão
CREATE POLICY "Users can update their own analise bench forms with permission"
ON public.analise_bench_forms
FOR UPDATE
USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_module_permissions ump
    JOIN public.modules m ON ump.module_id = m.id
    WHERE ump.user_id = auth.uid()
      AND m.name = 'analise_bench'
      AND ump.can_edit = true
  )
);

-- Política: Usuários podem deletar seus próprios briefings se tiverem permissão
CREATE POLICY "Users can delete their own analise bench forms with permission"
ON public.analise_bench_forms
FOR DELETE
USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.user_module_permissions ump
    JOIN public.modules m ON ump.module_id = m.id
    WHERE ump.user_id = auth.uid()
      AND m.name = 'analise_bench'
      AND ump.can_delete = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_analise_bench_forms_updated_at
  BEFORE UPDATE ON public.analise_bench_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_analise_bench_forms_created_by ON public.analise_bench_forms(created_by);
CREATE INDEX idx_analise_bench_forms_created_at ON public.analise_bench_forms(created_at DESC);
CREATE INDEX idx_analise_bench_forms_status ON public.analise_bench_forms(status);