-- Atualizar política de SELECT para businesses
-- Permitir que usuários autenticados com permissão de visualização vejam todos os negócios
DROP POLICY IF EXISTS "businesses_restricted_select" ON businesses;

CREATE POLICY "businesses_select_with_permission"
ON businesses
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_has_module_permission(auth.uid(), 'dashboard', 'view')
);