-- Corrigir políticas RLS para considerar custom_role base_role

-- Tabela custom_roles: atualizar políticas de visualização
DROP POLICY IF EXISTS "Admins can view custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Apenas admins podem visualizar roles customizadas" ON public.custom_roles;

CREATE POLICY "Admins can view custom roles v2" 
ON public.custom_roles 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Tabela role_module_permissions: atualizar política de visualização
DROP POLICY IF EXISTS "Apenas admins podem visualizar permissões de roles" ON public.role_module_permissions;

CREATE POLICY "Admins can view role permissions v2" 
ON public.role_module_permissions 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Garantir que as demais políticas também usem get_current_user_role()
-- Custom Roles
DROP POLICY IF EXISTS "Admins can insert custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can update custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can delete custom roles" ON public.custom_roles;

CREATE POLICY "Admins can insert custom roles v2" 
ON public.custom_roles 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin' AND created_by = auth.uid());

CREATE POLICY "Admins can update custom roles v2" 
ON public.custom_roles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete custom roles v2" 
ON public.custom_roles 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Role Module Permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_module_permissions;

CREATE POLICY "Admins can manage role permissions v2" 
ON public.role_module_permissions 
FOR ALL 
USING (get_current_user_role() = 'admin');