-- Adicionar módulos faltantes para Customer Experience
INSERT INTO modules (name, display_name, is_active) VALUES 
  ('csat', 'CSAT', true),
  ('formularios', 'Gerar Forms', true)
ON CONFLICT DO NOTHING;

-- Atualizar permissões da P.O. para ter acesso ao CSM
UPDATE role_module_permissions 
SET can_view = true, can_create = true, can_edit = true
WHERE role_id = (SELECT id FROM custom_roles WHERE name = 'project_owner')
AND module_id = (SELECT id FROM modules WHERE name = 'csm');