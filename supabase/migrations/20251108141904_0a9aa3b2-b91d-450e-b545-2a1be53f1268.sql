-- Criar tabela analise_bench_forms (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analise_bench_forms') THEN
    CREATE TABLE public.analise_bench_forms (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      client_id UUID NOT NULL,
      
      -- Informações do Cliente
      nome_empresa TEXT,
      nicho_empresa TEXT,
      site TEXT,
      servicos_produtos TEXT,
      diferenciais_competitivos TEXT,
      publico_alvo TEXT,
      objetivo_projeto TEXT,
      maior_desafio TEXT,
      
      -- Concorrentes (salvos como JSON)
      quantos_concorrentes INTEGER DEFAULT 1,
      competitors JSONB DEFAULT '[]'::jsonb,
      
      -- Foco da Análise
      objetivo_benchmark TEXT[],
      objetivo_benchmark_outro TEXT,
      aspecto_prioritario TEXT,
      informacoes_adicionais TEXT,
      
      -- Análise gerada
      generated_analysis TEXT,
      
      -- Metadados
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Habilitar RLS
    ALTER TABLE public.analise_bench_forms ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    CREATE POLICY "Users can view their own analise bench forms"
    ON public.analise_bench_forms
    FOR SELECT
    USING (auth.uid() = created_by);

    CREATE POLICY "Users can create their own analise bench forms"
    ON public.analise_bench_forms
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

    CREATE POLICY "Users can update their own analise bench forms"
    ON public.analise_bench_forms
    FOR UPDATE
    USING (auth.uid() = created_by);

    CREATE POLICY "Users can delete their own analise bench forms"
    ON public.analise_bench_forms
    FOR DELETE
    USING (auth.uid() = created_by);
  END IF;
END $$;

-- Criar trigger apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_analise_bench_forms_updated_at' 
    AND tgrelid = 'public.analise_bench_forms'::regclass
  ) THEN
    CREATE TRIGGER update_analise_bench_forms_updated_at
    BEFORE UPDATE ON public.analise_bench_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Atualizar check constraint da tabela default_prompts para incluir 'analise_bench'
ALTER TABLE public.default_prompts 
DROP CONSTRAINT IF EXISTS default_prompts_copy_type_check;

ALTER TABLE public.default_prompts 
ADD CONSTRAINT default_prompts_copy_type_check 
CHECK (copy_type IN ('copy', 'analise_bench', 'onboarding'));