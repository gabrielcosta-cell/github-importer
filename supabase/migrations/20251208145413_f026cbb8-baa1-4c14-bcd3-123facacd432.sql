-- Função para buscar usuários de um role (security definer para bypass de RLS)
CREATE OR REPLACE FUNCTION public.get_users_by_custom_role(role_id uuid)
RETURNS TABLE(user_id uuid, user_name text, role_display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_display_name text;
BEGIN
  -- Buscar o display_name do custom_role
  SELECT COALESCE(cr.display_name, cr.name, 'Grupo designado')
  INTO v_role_display_name
  FROM custom_roles cr
  WHERE cr.id = role_id;
  
  -- Retornar usuários com este custom_role_id
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.name, p.email, 'Usuário sem nome') as user_name,
    COALESCE(v_role_display_name, 'Grupo designado') as role_display_name
  FROM profiles p
  WHERE p.custom_role_id = role_id
    AND p.is_active = true
  ORDER BY p.name;
END;
$$;