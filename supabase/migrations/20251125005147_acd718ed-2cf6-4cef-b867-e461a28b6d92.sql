-- Criar tabela para configurações de campos obrigatórios por pipeline
CREATE TABLE IF NOT EXISTS public.pipeline_required_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(pipeline_id)
);

-- Habilitar RLS
ALTER TABLE public.pipeline_required_fields ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar configurações"
  ON public.pipeline_required_fields
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir configurações"
  ON public.pipeline_required_fields
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin' AND created_by = auth.uid());

CREATE POLICY "Admins podem atualizar configurações"
  ON public.pipeline_required_fields
  FOR UPDATE
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins podem deletar configurações"
  ON public.pipeline_required_fields
  FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pipeline_required_fields_updated_at
  BEFORE UPDATE ON public.pipeline_required_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índice para melhor performance
CREATE INDEX idx_pipeline_required_fields_pipeline_id ON public.pipeline_required_fields(pipeline_id);