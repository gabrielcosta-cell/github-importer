-- Atualizar política de INSERT para analise_bench_forms
-- Adicionar verificação para admins
DROP POLICY IF EXISTS "Users can create analise bench forms with permission" ON public.analise_bench_forms;

CREATE POLICY "Users can create analise bench forms with permission"
ON public.analise_bench_forms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND (
    -- Admins podem criar
    get_current_user_role() = 'admin'
    OR
    -- Usuários com permissão direta
    EXISTS (
      SELECT 1
      FROM user_module_permissions ump
      JOIN modules m ON ump.module_id = m.id
      WHERE ump.user_id = auth.uid()
        AND m.name = 'analise_bench'
        AND ump.can_view = true
    )
    OR
    -- Usuários com permissão via custom role
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