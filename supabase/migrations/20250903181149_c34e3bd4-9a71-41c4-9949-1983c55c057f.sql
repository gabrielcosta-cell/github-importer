-- Criar tabela de funis/pipelines do CRM
CREATE TABLE public.crm_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de estágios/colunas do CRM
CREATE TABLE public.crm_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de cards/deals do CRM
CREATE TABLE public.crm_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC DEFAULT 0,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_pipelines
CREATE POLICY "Authenticated users can view pipelines" 
ON public.crm_pipelines 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create pipelines" 
ON public.crm_pipelines 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Admins and creators can update pipelines" 
ON public.crm_pipelines 
FOR UPDATE 
USING (get_current_user_role() = 'admin' OR created_by = auth.uid());

CREATE POLICY "Admins and creators can delete pipelines" 
ON public.crm_pipelines 
FOR DELETE 
USING (get_current_user_role() = 'admin' OR created_by = auth.uid());

-- Políticas para crm_stages
CREATE POLICY "Authenticated users can view stages" 
ON public.crm_stages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create stages" 
ON public.crm_stages 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update stages" 
ON public.crm_stages 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete stages" 
ON public.crm_stages 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Políticas para crm_cards
CREATE POLICY "Authenticated users can view cards" 
ON public.crm_cards 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create cards" 
ON public.crm_cards 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update cards" 
ON public.crm_cards 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete cards" 
ON public.crm_cards 
FOR DELETE 
USING (get_current_user_role() = 'admin' OR created_by = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_pipelines_updated_at
BEFORE UPDATE ON public.crm_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_stages_updated_at
BEFORE UPDATE ON public.crm_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_cards_updated_at
BEFORE UPDATE ON public.crm_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir pipeline padrão com estágios
INSERT INTO public.crm_pipelines (name, description, created_by, position) 
VALUES ('CRM Skala', 'Pipeline principal do CRM', (SELECT id FROM auth.users LIMIT 1), 0);

-- Inserir estágios padrão (baseado na imagem)
INSERT INTO public.crm_stages (pipeline_id, name, color, position) 
SELECT 
  p.id,
  stage_name,
  stage_color,
  stage_position
FROM (
  SELECT 
    'Onboarding' as stage_name, '#8B5CF6' as stage_color, 0 as stage_position
  UNION ALL
  SELECT 'Mês Teste', '#06B6D4', 1
  UNION ALL
  SELECT 'Refinamento', '#F59E0B', 2
  UNION ALL
  SELECT 'Escala', '#10B981', 3
  UNION ALL
  SELECT 'Expansão', '#3B82F6', 4
  UNION ALL
  SELECT 'Renovação', '#6366F1', 5
  UNION ALL
  SELECT 'Retenção', '#EF4444', 6
) stages
CROSS JOIN public.crm_pipelines p
WHERE p.name = 'CRM Skala';

-- Inserir alguns cards de exemplo
INSERT INTO public.crm_cards (pipeline_id, stage_id, title, company_name, value, created_by, position)
SELECT 
  p.id as pipeline_id,
  s.id as stage_id,
  card_data.title,
  card_data.company_name,
  card_data.value,
  (SELECT id FROM auth.users LIMIT 1) as created_by,
  card_data.position
FROM public.crm_pipelines p
CROSS JOIN public.crm_stages s
CROSS JOIN (
  SELECT 'Sul Solar' as title, 'Sul Solar' as company_name, 3500 as value, 0 as position, 'Onboarding' as stage_name
  UNION ALL
  SELECT 'Grupo Três Irmãs', 'Três Irmãs Energia Solar e Agro', 3000, 0, 'Mês Teste'
  UNION ALL
  SELECT 'ID3 Brindes', 'ID3 Brindes', 3000, 0, 'Refinamento'
  UNION ALL
  SELECT 'Itiban', 'Itiban', 8900, 0, 'Escala'
  UNION ALL
  SELECT 'Amantícia', 'Amantícia', 3000, 0, 'Expansão'
  UNION ALL
  SELECT 'Seprovisa', 'Seprovisa', 1500, 0, 'Renovação'
  UNION ALL
  SELECT 'Face Doctor', 'Face Doctor', 4900, 0, 'Retenção'
) card_data
WHERE p.name = 'CRM Skala' 
  AND s.name = card_data.stage_name;

-- Criar índices para performance
CREATE INDEX idx_crm_stages_pipeline_id ON public.crm_stages(pipeline_id);
CREATE INDEX idx_crm_cards_pipeline_id ON public.crm_cards(pipeline_id);
CREATE INDEX idx_crm_cards_stage_id ON public.crm_cards(stage_id);
CREATE INDEX idx_crm_cards_position ON public.crm_cards(position);
CREATE INDEX idx_crm_stages_position ON public.crm_stages(position);