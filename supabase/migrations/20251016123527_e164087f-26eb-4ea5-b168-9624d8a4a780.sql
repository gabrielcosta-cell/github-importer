
-- Permitir que usuários vejam sua própria custom role
CREATE POLICY "Users can view their own custom role"
ON custom_roles
FOR SELECT
USING (
  id IN (
    SELECT custom_role_id 
    FROM profiles 
    WHERE user_id = auth.uid() AND custom_role_id IS NOT NULL
  )
);
