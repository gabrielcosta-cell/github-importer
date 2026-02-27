-- Adicionar módulo de Aprovação
INSERT INTO public.modules (name, display_name, description, icon, is_active)
VALUES ('aprovacao', 'Aprovação', 'Gerenciamento de aprovação de copys e criativos', 'CheckCircle', true)
ON CONFLICT (name) DO NOTHING;

-- Criar tabela de jobs de aprovação
CREATE TABLE IF NOT EXISTS public.approval_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_name text,
  responsible_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'para_aprovacao', 'em_ajustes', 'aprovado', 'arquivado')),
  start_date date,
  end_date date,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  position integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.approval_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approval jobs"
ON public.approval_jobs
FOR SELECT
USING (
  get_current_user_role() = 'admin' OR 
  user_has_module_permission(auth.uid(), 'aprovacao', 'view')
);

CREATE POLICY "Users can create approval jobs"
ON public.approval_jobs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  created_by = auth.uid() AND
  user_has_module_permission(auth.uid(), 'aprovacao', 'create')
);

CREATE POLICY "Users can update approval jobs"
ON public.approval_jobs
FOR UPDATE
USING (
  user_has_module_permission(auth.uid(), 'aprovacao', 'edit')
);

CREATE POLICY "Users can delete approval jobs"
ON public.approval_jobs
FOR DELETE
USING (
  user_has_module_permission(auth.uid(), 'aprovacao', 'delete')
);

-- Trigger para updated_at
CREATE TRIGGER update_approval_jobs_updated_at
BEFORE UPDATE ON public.approval_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();