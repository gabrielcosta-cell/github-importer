-- Atualizar políticas do quadro de vendas (tabela businesses) para mapear totalmente às permissões do módulo "dashboard"

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_secure_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_secure_insert_v2" ON public.businesses;
DROP POLICY IF EXISTS "businesses_secure_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_secure_update_v2" ON public.businesses;

-- SELECT já foi ajustado anteriormente para 'view' do módulo dashboard
-- Recriar políticas com base nas permissões do módulo "dashboard"

-- INSERT: precisa ter permissão de criar no módulo e garantir created_by = auth.uid()
CREATE POLICY "businesses_insert_dashboard_permission"
ON public.businesses
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND user_has_module_permission(auth.uid(), 'dashboard', 'create')
);

-- UPDATE: permissão de editar no módulo
CREATE POLICY "businesses_update_dashboard_permission"
ON public.businesses
FOR UPDATE
USING (
  user_has_module_permission(auth.uid(), 'dashboard', 'edit')
);

-- DELETE: permissão de deletar no módulo
CREATE POLICY "businesses_delete_dashboard_permission"
ON public.businesses
FOR DELETE
USING (
  user_has_module_permission(auth.uid(), 'dashboard', 'delete')
);