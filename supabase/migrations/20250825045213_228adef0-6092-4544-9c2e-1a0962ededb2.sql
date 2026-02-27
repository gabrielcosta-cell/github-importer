-- Primeiro corrigir a recursão infinita nas políticas RLS
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

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

-- Recriar políticas RLS para profiles sem recursão usando função
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);

-- Proteger a tabela 'DOT CRM / Vendas' existente
-- Primeiro habilitar RLS
ALTER TABLE "DOT CRM / Vendas" ENABLE ROW LEVEL SECURITY;

-- Adicionar colunas necessárias para controle de acesso
ALTER TABLE "DOT CRM / Vendas" 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar políticas RLS para a tabela CRM
CREATE POLICY "Users can view their CRM data" 
ON "DOT CRM / Vendas" 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  assigned_to = auth.uid() OR 
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Users can create CRM records" 
ON "DOT CRM / Vendas" 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "Users can update their CRM records" 
ON "DOT CRM / Vendas" 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  assigned_to = auth.uid() OR 
  public.get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can delete CRM records" 
ON "DOT CRM / Vendas" 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);

-- Corrigir políticas das outras tabelas também
DROP POLICY IF EXISTS "Only admins can access system settings" ON public.system_settings;

CREATE POLICY "Only admins can access system settings" 
ON public.system_settings 
FOR ALL 
USING (
  public.get_current_user_role() = 'admin'
);

-- Corrigir políticas da tabela businesses
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;

CREATE POLICY "Users can view businesses" 
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