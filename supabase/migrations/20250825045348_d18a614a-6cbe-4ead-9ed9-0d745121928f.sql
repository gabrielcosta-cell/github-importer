-- Limpar todas as políticas existentes da tabela CRM
DROP POLICY IF EXISTS "Users can view their CRM data" ON "DOT CRM / Vendas";
DROP POLICY IF EXISTS "Users can create CRM records" ON "DOT CRM / Vendas";
DROP POLICY IF EXISTS "Users can update their CRM records" ON "DOT CRM / Vendas";
DROP POLICY IF EXISTS "Admins can delete CRM records" ON "DOT CRM / Vendas";

-- Recriar todas as políticas RLS necessárias com nomes únicos
CREATE POLICY "crm_select_policy" 
ON "DOT CRM / Vendas" 
FOR SELECT 
USING (
  CASE 
    WHEN created_by IS NOT NULL THEN created_by = auth.uid()
    WHEN assigned_to IS NOT NULL THEN assigned_to = auth.uid()
    ELSE true
  END
  OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "crm_insert_policy" 
ON "DOT CRM / Vendas" 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "crm_update_policy" 
ON "DOT CRM / Vendas" 
FOR UPDATE 
USING (
  CASE 
    WHEN created_by IS NOT NULL THEN created_by = auth.uid()
    WHEN assigned_to IS NOT NULL THEN assigned_to = auth.uid()
    ELSE true
  END
  OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "crm_delete_policy" 
ON "DOT CRM / Vendas" 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);

-- Recriar políticas para profiles sem conflitos
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  user_id = auth.uid() OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  public.get_current_user_role() = 'admin' OR user_id = auth.uid()
);

CREATE POLICY "profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
USING (
  public.get_current_user_role() = 'admin'
);