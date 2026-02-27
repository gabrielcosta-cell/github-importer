-- Criar tabela para projetos reservados
CREATE TABLE public.projetos_reservados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  mrr TEXT NOT NULL DEFAULT 'R$ 0,00',
  implementacao TEXT NOT NULL DEFAULT 'R$ 0,00',
  plano TEXT NOT NULL CHECK (plano IN ('STARTER', 'BUSINESS', 'PRO', 'CONCEITO')) DEFAULT 'STARTER',
  vaga_reservada_ate DATE NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.projetos_reservados ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar projetos reservados"
ON public.projetos_reservados
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir projetos reservados"
ON public.projetos_reservados
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Usuários podem atualizar projetos que criaram ou admins podem atualizar todos"
ON public.projetos_reservados
FOR UPDATE
USING (
  (created_by = auth.uid()) OR 
  (get_current_user_role() = 'admin')
);

CREATE POLICY "Usuários podem deletar projetos que criaram ou admins podem deletar todos"
ON public.projetos_reservados
FOR DELETE
USING (
  (created_by = auth.uid()) OR 
  (get_current_user_role() = 'admin')
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_projetos_reservados_updated_at
  BEFORE UPDATE ON public.projetos_reservados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();