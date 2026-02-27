-- Corrigir todos os usuários que têm override bloqueando can_create
-- mas cuja role permite can_create

-- 1. Atualizar Vinicius Cadó para can_create = true
UPDATE user_module_permissions ump
SET 
  can_create = true,
  updated_at = now()
FROM modules m, profiles p, custom_roles cr, role_module_permissions rmp
WHERE ump.module_id = m.id
  AND ump.user_id = p.user_id
  AND p.custom_role_id = cr.id
  AND rmp.role_id = cr.id
  AND rmp.module_id = m.id
  AND m.name = 'dashboard'
  AND ump.can_create = false  -- Override está bloqueando
  AND rmp.can_create = true   -- Mas a role permite
  AND p.email = 'vinicius.cado@dotconceito.com';

-- 2. Para admins completos, melhor remover overrides desnecessários
-- pois o sistema já verifica se é admin antes de checar permissões
DELETE FROM user_module_permissions ump
USING profiles p, custom_roles cr, modules m
WHERE ump.user_id = p.user_id
  AND p.custom_role_id = cr.id
  AND ump.module_id = m.id
  AND cr.base_role = 'admin'
  AND m.name = 'dashboard';