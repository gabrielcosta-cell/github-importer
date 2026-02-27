-- Remover todas as políticas existentes para recriar corretamente
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Proteger a tabela 'DOT CRM / Vendas' que está completamente desprotegida
ALTER TABLE "DOT CRM / Vendas" ENABLE ROW LEVEL SECURITY;

-- Adicionar colunas de controle se não existirem
ALTER TABLE "DOT CRM / Vendas" 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar políticas de segurança para a tabela CRM
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