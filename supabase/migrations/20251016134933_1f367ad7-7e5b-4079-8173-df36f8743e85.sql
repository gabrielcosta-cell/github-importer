-- Inserir permissões para o módulo aprovacao para roles com base_role admin
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cr.id as role_id,
  m.id as module_id,
  true as can_view,
  true as can_create,
  true as can_edit,
  true as can_delete
FROM custom_roles cr
CROSS JOIN modules m
WHERE m.name = 'aprovacao'
  AND cr.base_role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_module_permissions rmp 
    WHERE rmp.role_id = cr.id AND rmp.module_id = m.id
  );