-- Aplicar regras de permissão específicas para módulo copy aos usuários existentes
-- Regra: Usuários com edit + delete = acesso completo (prompts + exclusão)
-- Regra: Usuários com apenas view + create = acesso limitado (histórico sem exclusão)

-- Primeiro, limpar permissões existentes do módulo copy para recriar com as novas regras
DELETE FROM user_module_permissions 
WHERE module_id = (SELECT id FROM modules WHERE name = 'copy');

-- Aplicar permissões padrão baseadas no role para usuários ativos não-admin
-- SDR: apenas view + create (histórico sem exclusão, sem prompts)
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
  AND p.role = 'sdr'
  AND p.is_active = true;

-- CLOSER: acesso completo (edit + delete = prompts + exclusão)
INSERT INTO user_module_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  p.user_id,
  m.id as module_id,
  true as can_view,
  true as can_create, 
  true as can_edit,
  true as can_delete
FROM profiles p
CROSS JOIN modules m
WHERE m.name = 'copy'
  AND p.role = 'closer'
  AND p.is_active = true;