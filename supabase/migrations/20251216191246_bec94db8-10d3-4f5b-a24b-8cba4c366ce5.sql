-- Adicionar permissões para os novos módulos (csat, formularios) para todas as roles existentes
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cr.id as role_id,
  m.id as module_id,
  false as can_view,
  false as can_create,
  false as can_edit,
  false as can_delete
FROM custom_roles cr
CROSS JOIN modules m
WHERE m.name IN ('csat', 'formularios')
  AND NOT EXISTS (
    SELECT 1 FROM role_module_permissions rmp 
    WHERE rmp.role_id = cr.id AND rmp.module_id = m.id
  );

-- Dar acesso de visualização de CSAT, NPS, Churn e Formularios para a P.O.
UPDATE role_module_permissions 
SET can_view = true, can_create = true, can_edit = true
WHERE role_id = (SELECT id FROM custom_roles WHERE name = 'project_owner')
AND module_id IN (SELECT id FROM modules WHERE name IN ('csat', 'nps', 'churn', 'formularios'));