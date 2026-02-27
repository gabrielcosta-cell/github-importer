
-- Tabela de configuração de tarefas por etapa do funil
CREATE TABLE public.crm_stage_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline_days INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de tarefas dos cards (instâncias criadas para cada card)
CREATE TABLE public.crm_card_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  stage_task_id UUID NOT NULL REFERENCES public.crm_stage_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_stage_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_stage_tasks
CREATE POLICY "Admins podem gerenciar tarefas de etapa"
ON public.crm_stage_tasks FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Usuários autenticados podem visualizar tarefas de etapa"
ON public.crm_stage_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas para crm_card_tasks
CREATE POLICY "Usuários podem criar tarefas de card"
ON public.crm_card_tasks FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem visualizar tarefas de card"
ON public.crm_card_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar tarefas de card"
ON public.crm_card_tasks FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem deletar tarefas de card"
ON public.crm_card_tasks FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_stage_tasks_updated_at
BEFORE UPDATE ON public.crm_stage_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_card_tasks_updated_at
BEFORE UPDATE ON public.crm_card_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_crm_stage_tasks_stage_id ON public.crm_stage_tasks(stage_id);
CREATE INDEX idx_crm_stage_tasks_pipeline_id ON public.crm_stage_tasks(pipeline_id);
CREATE INDEX idx_crm_card_tasks_card_id ON public.crm_card_tasks(card_id);
CREATE INDEX idx_crm_card_tasks_stage_task_id ON public.crm_card_tasks(stage_task_id);
CREATE INDEX idx_crm_card_tasks_is_completed ON public.crm_card_tasks(is_completed);
