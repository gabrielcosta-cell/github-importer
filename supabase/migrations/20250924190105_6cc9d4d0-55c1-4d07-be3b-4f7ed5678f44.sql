-- Aplicar permissões para TODOS os cargos não-admin
-- Regra padrão: usuários não-admin têm view + create (acesso limitado)
-- Apenas closers têm acesso completo (edit + delete)

-- Primeiro limpar permissões anteriores
DELETE FROM user_module_permissions 
WHERE module_id = (SELECT id FROM modules WHERE name = 'copy');

-- Aplicar permissões padrões para TODOS os usuários ativos não-admin
-- Padrão: view + create (histórico sem exclusão, sem prompts)
INSERT INTO user_module_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  p.user_id,
  m.id as module_id,
  true as can_view,
  true as can_create, 
  false as can_edit,
  false as can_delete
FROM profiles p
CROSS JOIN modules m
WHERE m.name = 'copy'
  AND p.role != 'admin'
  AND p.is_active = true;

-- Atualizar especificamente CLOSERS para terem acesso completo (edit + delete = prompts + exclusão)
UPDATE user_module_permissions 
SET can_edit = true, can_delete = true
WHERE module_id = (SELECT id FROM modules WHERE name = 'copy')
  AND user_id IN (
    SELECT user_id FROM profiles 
    WHERE role = 'closer' AND is_active = true
  );