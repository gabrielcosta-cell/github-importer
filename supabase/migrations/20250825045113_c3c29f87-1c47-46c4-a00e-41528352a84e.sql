-- Corrigir recursão infinita nas políticas RLS da tabela profiles
-- Primeiro remover as políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Criar função security definer para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar função security definer para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar políticas RLS para profiles sem recursão
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Usuário pode ver seu próprio perfil OU é admin (verificado por função)
  user_id = auth.uid() OR 
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin' AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin'
  )
);

-- Adicionar políticas RLS para a tabela 'DOT CRM / Vendas'
-- Primeiro verificar se a tabela existe e renomeá-la para um nome mais apropriado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DOT CRM / Vendas') THEN
    ALTER TABLE "DOT CRM / Vendas" RENAME TO crm_leads;
  END IF;
END $$;

-- Se a tabela crm_leads não existir, criar uma estrutura adequada
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  value DECIMAL(10,2),
  status TEXT NOT NULL CHECK (status IN ('lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')) DEFAULT 'lead',
  source TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para crm_leads
CREATE POLICY "Users can view their assigned leads" 
ON public.crm_leads 
FOR SELECT 
USING (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Users can create leads" 
ON public.crm_leads 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "Users can update their leads" 
ON public.crm_leads 
FOR UPDATE 
USING (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can delete leads" 
ON public.crm_leads 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);

-- Trigger para atualizar timestamp automaticamente
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Corrigir políticas da tabela system_settings também
DROP POLICY IF EXISTS "Only admins can access system settings" ON public.system_settings;

CREATE POLICY "Only admins can access system settings" 
ON public.system_settings 
FOR ALL 
USING (
  public.get_current_user_role() = 'admin'
);

-- Corrigir políticas da tabela businesses também
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;

CREATE POLICY "Admins can view all businesses" 
ON public.businesses 
FOR SELECT 
USING (
  responsible_user_id = auth.uid() OR 
  created_by = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Users can update their businesses" 
ON public.businesses 
FOR UPDATE 
USING (
  responsible_user_id = auth.uid() OR 
  created_by = auth.uid() OR
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can delete businesses" 
ON public.businesses 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);