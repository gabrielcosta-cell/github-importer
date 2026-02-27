-- Criar função para identificar e corrigir overrides conflitantes
-- Esta função identifica usuários com overrides que bloqueiam permissões
-- que suas roles deveriam permitir

CREATE OR REPLACE FUNCTION public.fix_conflicting_permission_overrides()
RETURNS TABLE(
  user_email TEXT,
  user_name TEXT,
  module_name TEXT,
  permission_type TEXT,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Encontrar e corrigir overrides que bloqueiam can_create quando a role permite
  FOR conflict_record IN
    SELECT 
      p.user_id,
      p.email,
      p.name,
      m.name as mod_name,
      m.id as mod_id,
      ump.can_create as override_create,
      rmp.can_create as role_create
    FROM user_module_permissions ump
    JOIN profiles p ON p.user_id = ump.user_id
    JOIN modules m ON m.id = ump.module_id
    LEFT JOIN custom_roles cr ON cr.id = p.custom_role_id
    LEFT JOIN role_module_permissions rmp ON rmp.role_id = cr.id AND rmp.module_id = m.id
    WHERE ump.can_create = false 
      AND rmp.can_create = true
      AND p.role != 'admin'  -- Admins não precisam de overrides
  LOOP
    -- Atualizar override para alinhar com a role
    UPDATE user_module_permissions
    SET can_create = true, updated_at = now()
    WHERE user_id = conflict_record.user_id
      AND module_id = conflict_record.mod_id;
    
    user_email := conflict_record.email;
    user_name := conflict_record.name;
    module_name := conflict_record.mod_name;
    permission_type := 'can_create';
    action_taken := 'Updated override to match role permission';
    fixed_count := fixed_count + 1;
    
    RETURN NEXT;
  END LOOP;

  -- Remover overrides desnecessários para admins
  FOR conflict_record IN
    SELECT 
      p.user_id,
      p.email,
      p.name,
      m.name as mod_name
    FROM user_module_permissions ump
    JOIN profiles p ON p.user_id = ump.user_id
    JOIN modules m ON m.id = ump.module_id
    LEFT JOIN custom_roles cr ON cr.id = p.custom_role_id
    WHERE cr.base_role = 'admin' OR p.role = 'admin'
  LOOP
    -- Remover override de admin (eles têm acesso total por padrão)
    DELETE FROM user_module_permissions
    WHERE user_id = conflict_record.user_id;
    
    user_email := conflict_record.email;
    user_name := conflict_record.name;
    module_name := 'all';
    permission_type := 'all';
    action_taken := 'Removed unnecessary admin override';
    
    RETURN NEXT;
  END LOOP;

  -- Log resumo
  RAISE NOTICE 'Fixed % conflicting permission overrides', fixed_count;
  
  RETURN;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.fix_conflicting_permission_overrides() IS 
'Identifica e corrige automaticamente overrides de permissão que bloqueiam acessos que as roles dos usuários deveriam permitir. Execute periodicamente ou após modificar roles.';

-- Executar a função uma vez para limpar qualquer problema remanescente
SELECT * FROM public.fix_conflicting_permission_overrides();