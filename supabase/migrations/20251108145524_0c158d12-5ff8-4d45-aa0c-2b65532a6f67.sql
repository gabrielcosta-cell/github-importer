-- Atualizar política de INSERT para analise_bench_forms
-- Simplificar para verificar apenas se o usuário tem acesso ao módulo (can_view)
DROP POLICY IF EXISTS "Users can create analise bench forms with permission" ON public.analise_bench_forms;

CREATE POLICY "Users can create analise bench forms with permission"
ON public.analise_bench_forms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND (
    EXISTS (
      SELECT 1
      FROM user_module_permissions ump
      JOIN modules m ON ump.module_id = m.id
      WHERE ump.user_id = auth.uid()
        AND m.name = 'analise_bench'
        AND ump.can_view = true
    )
    OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN role_module_permissions rmp ON rmp.role_id = p.custom_role_id
      JOIN modules m ON rmp.module_id = m.id
      WHERE p.user_id = auth.uid()
        AND m.name = 'analise_bench'
        AND rmp.can_view = true
    )
  )
);