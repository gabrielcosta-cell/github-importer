-- Create table to store success cases
CREATE TABLE public.success_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.crm_cards(id),
  client_name TEXT NOT NULL,
  squad TEXT,
  owner TEXT,
  nichos TEXT[] DEFAULT '{}',
  
  -- 1. Introdução
  contexto_inicial TEXT,
  como_chegou TEXT,
  principais_dores TEXT,
  tentativas_anteriores TEXT,
  
  -- 2. Desafios
  objetivos_alinhados TEXT,
  metas_entrada TEXT,
  prazo_analise TEXT,
  
  -- 3. Estratégia
  estrategia_dot TEXT,
  
  -- 4. Resultados
  periodo_analisado TEXT,
  resultados_atingidos TEXT,
  
  -- 5. Aprendizados
  aprendizados TEXT,
  insights_replicaveis TEXT,
  
  -- Resumo
  resumo_case TEXT,
  
  -- Métricas para exibição no card do blog
  titulo_destaque TEXT,
  descricao_curta TEXT,
  metricas_badges TEXT[] DEFAULT '{}',
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.success_cases ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all cases
CREATE POLICY "Authenticated users can view all cases"
ON public.success_cases
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert cases
CREATE POLICY "Authenticated users can create cases"
ON public.success_cases
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update cases
CREATE POLICY "Authenticated users can update cases"
ON public.success_cases
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy for public to view published cases
CREATE POLICY "Public can view published cases"
ON public.success_cases
FOR SELECT
USING (is_published = true);

-- Create trigger for updated_at
CREATE TRIGGER update_success_cases_updated_at
BEFORE UPDATE ON public.success_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();