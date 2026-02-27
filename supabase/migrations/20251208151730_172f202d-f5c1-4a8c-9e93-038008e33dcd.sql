-- Criar tabela para motivos de perda personalizados
CREATE TABLE public.crm_loss_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem visualizar motivos de perda"
ON public.crm_loss_reasons
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar motivos de perda"
ON public.crm_loss_reasons
FOR ALL
USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_loss_reasons_updated_at
BEFORE UPDATE ON public.crm_loss_reasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir motivos de perda padrão
INSERT INTO public.crm_loss_reasons (name, position, created_by) VALUES
  ('Sem orçamento', 0, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)),
  ('Escolheu concorrente', 1, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)),
  ('Não respondeu', 2, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)),
  ('Timing inadequado', 3, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)),
  ('Não qualificado', 4, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)),
  ('Outro', 5, (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1));