-- Remover política restritiva atual
DROP POLICY IF EXISTS "businesses_secure_select_v2" ON public.businesses;

-- Criar nova política: usuários com permissão no módulo dashboard veem todos os negócios
CREATE POLICY "businesses_secure_select_v2"
ON public.businesses
FOR SELECT
USING (
  get_current_user_role() = 'admin'::text OR 
  user_has_module_permission(auth.uid(), 'dashboard', 'view')
);