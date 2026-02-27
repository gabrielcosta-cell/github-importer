-- Adicionar permissão can_view para o módulo 'copy' no custom_role do Vinicius
-- Custom role ID: 030624ae-0353-449d-aad1-061b52cf2834
-- Module 'copy' ID: 768a3b18-e586-4cd0-8bcc-3029d461e6a8

INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
VALUES (
  '030624ae-0353-449d-aad1-061b52cf2834',
  '768a3b18-e586-4cd0-8bcc-3029d461e6a8',
  true,
  true,
  true,
  true
)
ON CONFLICT (role_id, module_id) 
DO UPDATE SET 
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;