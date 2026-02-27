-- Verificar usuários que não têm permissão para view no módulo copy
-- e dar permissão para todos os usuários ativos (exceto admin que já tem acesso total)

-- Inserir permissão de view para módulo copy para todos os usuários que não têm
INSERT INTO user_module_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT DISTINCT 
  p.user_id,
  m.id as module_id,
  true as can_view,
  false as can_create, 
  false as can_edit,
  false as can_delete
FROM profiles p
CROSS JOIN modules m
WHERE m.name = 'copy'
  AND p.role != 'admin'
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_module_permissions ump 
    WHERE ump.user_id = p.user_id 
    AND ump.module_id = m.id
  );

-- Atualizar permissões existentes para garantir que can_view seja true para todos os usuários ativos
UPDATE user_module_permissions 
SET can_view = true 
WHERE module_id = (SELECT id FROM modules WHERE name = 'copy')
  AND user_id IN (SELECT user_id FROM profiles WHERE is_active = true AND role != 'admin');