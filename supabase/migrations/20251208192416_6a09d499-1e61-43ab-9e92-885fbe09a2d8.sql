-- Criar função para buscar usuários por base_role (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_users_by_base_role(target_base_role text)
RETURNS TABLE(user_id uuid, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.name, p.email, 'Usuário sem nome') as user_name
  FROM profiles p
  LEFT JOIN custom_roles cr ON cr.id = p.custom_role_id
  WHERE p.is_active = true
    AND (
      -- Usuário com custom_role que tem esse base_role
      (cr.base_role::text = target_base_role AND cr.is_active = true)
      OR
      -- Usuário com role direto (legacy) e sem custom_role
      (p.role = target_base_role AND p.custom_role_id IS NULL)
    )
  ORDER BY p.name;
END;
$$;