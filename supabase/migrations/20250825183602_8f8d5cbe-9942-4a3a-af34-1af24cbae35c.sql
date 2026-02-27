-- Criar tabela para metas mensais
CREATE TABLE public.monthly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  goal_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Habilitar RLS
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar metas
CREATE POLICY "Admins can manage monthly goals" 
ON public.monthly_goals 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Todos podem ver metas
CREATE POLICY "Everyone can view monthly goals" 
ON public.monthly_goals 
FOR SELECT 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_monthly_goals_updated_at
BEFORE UPDATE ON public.monthly_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para comissões
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('closer_mrr', 'sdr_plan')),
  commission_value NUMERIC NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  business_plan TEXT,
  business_mrr NUMERIC,
  business_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só veem suas comissões, admins veem todas
CREATE POLICY "Users can view their own commissions" 
ON public.commissions 
FOR SELECT 
USING (user_id = auth.uid() OR get_current_user_role() = 'admin');

-- Admins podem inserir/atualizar comissões
CREATE POLICY "Admins can manage commissions" 
ON public.commissions 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();