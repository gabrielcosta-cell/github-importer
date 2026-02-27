-- Corrigir política RLS de INSERT para analise_bench_forms
-- O problema: a política estava verificando can_view ao invés de can_create

DROP POLICY IF EXISTS "Users can create analise bench forms with permission" ON analise_bench_forms;

CREATE POLICY "Users can create analise bench forms with permission"
ON analise_bench_forms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    -- Admins podem criar
    get_current_user_role() = 'admin'
    OR
    -- Usuários com permissão específica de CREATE no módulo
    EXISTS (
      SELECT 1 FROM user_module_permissions ump
      JOIN modules m ON ump.module_id = m.id
      WHERE ump.user_id = auth.uid()
        AND m.name = 'analise_bench'
        AND ump.can_create = true  -- CORRIGIDO: era can_view, agora é can_create
    )
    OR
    -- Usuários cuja role tem permissão de CREATE no módulo
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN role_module_permissions rmp ON rmp.role_id = p.custom_role_id
      JOIN modules m ON rmp.module_id = m.id
      WHERE p.user_id = auth.uid()
        AND m.name = 'analise_bench'
        AND rmp.can_create = true  -- CORRIGIDO: era can_view, agora é can_create
    )
  )
);