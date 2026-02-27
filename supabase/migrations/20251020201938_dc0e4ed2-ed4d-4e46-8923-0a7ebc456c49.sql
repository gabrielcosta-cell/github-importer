-- Corrigir permissão de create do módulo dashboard para o usuário Pedro Brigido
-- O problema é que existe um override específico bloqueando can_create
UPDATE user_module_permissions
SET 
  can_create = true,
  updated_at = now()
WHERE user_id = 'd6a3a0e6-b6b7-42cc-85af-425f155276cc'
  AND module_id = (SELECT id FROM modules WHERE name = 'dashboard');