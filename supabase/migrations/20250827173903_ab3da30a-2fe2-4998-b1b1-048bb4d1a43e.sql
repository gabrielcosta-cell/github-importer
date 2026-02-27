-- Inserir novo módulo "Gestão de projetos"
INSERT INTO public.modules (name, display_name, description, icon, is_active) 
VALUES ('gestao_projetos', 'Gestão de Projetos', 'Módulo para gestão de projetos', 'FolderCheck', true);

-- Criar função "Head de projetos, performance e CS" 
INSERT INTO public.custom_roles (name, display_name, base_role, is_active, created_by) 
VALUES ('head_projetos_performance_cs', 'Head de projetos, performance e CS', 'custom', true, (SELECT id FROM auth.users LIMIT 1));

-- Buscar IDs dos módulos e da nova função
WITH role_data AS (
  SELECT id as role_id FROM public.custom_roles WHERE name = 'head_projetos_performance_cs'
),
module_data AS (
  SELECT 
    id as module_id,
    name as module_name
  FROM public.modules 
  WHERE name IN ('dashboard', 'projetos_reservados', 'meu_perfil', 'gestao_projetos') 
  AND is_active = true
)
-- Inserir permissões para a nova função - apenas visualização
INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  role_data.role_id,
  module_data.module_id,
  true as can_view,  -- Acesso de visualização
  false as can_create,
  false as can_edit,
  false as can_delete
FROM role_data
CROSS JOIN module_data;