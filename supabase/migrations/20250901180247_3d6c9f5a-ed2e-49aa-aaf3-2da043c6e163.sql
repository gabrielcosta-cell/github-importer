-- Melhorar segurança das tabelas de configuração do sistema
-- Restringir acesso a informações sensíveis de roles e permissões

-- Atualizar política da tabela role_module_permissions para restringir acesso apenas a admins
DROP POLICY IF EXISTS "Everyone can view role permissions" ON public.role_module_permissions;
CREATE POLICY "Apenas admins podem visualizar permissões de roles" 
ON public.role_module_permissions 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Atualizar política da tabela custom_roles para restringir acesso apenas a admins  
DROP POLICY IF EXISTS "Everyone can view custom roles" ON public.custom_roles;
CREATE POLICY "Apenas admins podem visualizar roles customizadas" 
ON public.custom_roles 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Manter política existente para modules mas adicionar comentário sobre segurança
COMMENT ON POLICY "Everyone can view modules" ON public.modules IS 'Política permite visualização de módulos para todos os usuários autenticados. Considere restringir baseado em permissões específicas se necessário.';