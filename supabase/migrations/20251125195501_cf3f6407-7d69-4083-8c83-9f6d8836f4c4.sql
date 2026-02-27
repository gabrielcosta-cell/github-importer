-- Atualizar a função get_current_user_role para verificar is_active
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN 'anonymous'
      ELSE COALESCE(
        (
          SELECT 
            CASE 
              -- Se tem custom_role, usar o base_role dela (convertido para text)
              WHEN p.custom_role_id IS NOT NULL THEN cr.base_role::text
              -- Senão usar o role padrão
              ELSE p.role
            END
          FROM public.profiles p
          LEFT JOIN public.custom_roles cr ON cr.id = p.custom_role_id AND cr.is_active = true
          WHERE p.user_id = auth.uid() 
            AND p.is_active = true  -- CRÍTICO: verificar se usuário está ativo
          LIMIT 1
        ),
        'inactive_user'  -- Retornar 'inactive_user' se não encontrar perfil ativo
      )
    END;
$$;