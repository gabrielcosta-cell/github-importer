-- Criar função para verificar se usuário tem permissão no módulo copy
CREATE OR REPLACE FUNCTION user_has_copy_permission(_user_id UUID, _permission_type TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin sempre tem permissão
  SELECT CASE 
    WHEN (SELECT role FROM profiles WHERE user_id = _user_id) = 'admin' THEN true
    ELSE (
      SELECT user_has_module_permission(_user_id, 'copy', _permission_type)
    )
  END;
$$;

-- Atualizar política de SELECT para copy_forms
DROP POLICY IF EXISTS "copy_forms_secure_select" ON copy_forms;

CREATE POLICY "copy_forms_secure_select" ON copy_forms
FOR SELECT
USING (
  user_has_copy_permission(auth.uid(), 'view') OR created_by = auth.uid()
);