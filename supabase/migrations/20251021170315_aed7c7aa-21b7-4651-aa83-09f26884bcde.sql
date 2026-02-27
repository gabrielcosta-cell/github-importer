-- Adicionar permissão de visualização do módulo copy para o role closer
INSERT INTO role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
VALUES (
  '00830791-6d50-4975-8291-352146af707d', -- closer_standard role
  '768a3b18-e586-4cd0-8bcc-3029d461e6a8', -- copy module
  true,  -- can_view
  false, -- can_create
  false, -- can_edit
  false  -- can_delete
)
ON CONFLICT (role_id, module_id) 
DO UPDATE SET can_view = true;