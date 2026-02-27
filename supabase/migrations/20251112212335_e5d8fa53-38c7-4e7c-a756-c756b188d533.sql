-- Criar tabela de etiquetas personalizadas
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Criar tabela de relacionamento entre cards e etiquetas
CREATE TABLE IF NOT EXISTS public.crm_card_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, tag_id)
);

-- Inserir etiquetas do sistema (migrar das antigas flags booleanas)
INSERT INTO public.crm_tags (name, color, is_system, is_active) VALUES
  ('DESQUALIFICADO', '#ef4444', true, true),
  ('SEM URGÊNCIA', '#eab308', true, true),
  ('QUALIFICAÇÃO MÉDIA', '#f97316', true, true),
  ('QUALIFICAÇÃO INDEFINIDA', '#a855f7', true, true),
  ('INDICAÇÃO', '#ec4899', true, true),
  ('QUALIFICADO PMV', '#3b82f6', true, true),
  ('PRÉ QUALIFICADO', '#10b981', true, true),
  ('QUALIFICADO SERVIÇO', '#06b6d4', true, true),
  ('ORÇAMENTO INDEFINIDO', '#f59e0b', true, true),
  ('NICHO', '#8b5cf6', true, true),
  ('NÃO É O DECISOR', '#ef4444', true, true),
  ('NÃO INVESTE EM MARKETING', '#dc2626', true, true),
  ('PÓS-NÃO-VENDA', '#b91c1c', true, true)
ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para crm_tags
CREATE POLICY "Users can view tags"
  ON public.crm_tags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create custom tags"
  ON public.crm_tags
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by = auth.uid() 
    AND is_system = false
  );

CREATE POLICY "Users can update their own tags"
  ON public.crm_tags
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND (created_by = auth.uid() OR is_system = false)
  );

CREATE POLICY "Users can delete their own tags"
  ON public.crm_tags
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND created_by = auth.uid() 
    AND is_system = false
  );

-- Políticas RLS para crm_card_tags
CREATE POLICY "Users can view card tags"
  ON public.crm_card_tags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create card tags"
  ON public.crm_card_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete card tags"
  ON public.crm_card_tags
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_crm_card_tags_card_id ON public.crm_card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_tags_tag_id ON public.crm_card_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_crm_tags_active ON public.crm_tags(is_active) WHERE is_active = true;