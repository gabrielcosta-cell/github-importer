-- Criar enum para tipos de roles base
CREATE TYPE public.app_role AS ENUM ('admin', 'sdr', 'closer', 'manager', 'custom');

-- Criar tabela de módulos/abas do sistema
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de roles customizadas
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  base_role app_role NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de permissões de roles para módulos
CREATE TABLE public.role_module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_id)
);

-- Criar tabela de permissões específicas por usuário (override de role)
CREATE TABLE public.user_module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Adicionar coluna custom_role_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN custom_role_id UUID REFERENCES public.custom_roles(id);

-- Inserir módulos padrão do sistema
INSERT INTO public.modules (name, display_name, description, icon) VALUES
  ('dashboard', 'Dashboard', 'Visão geral e KPIs', 'BarChart3'),
  ('projetos', 'Projetos Reservados', 'Gerenciamento de projetos reservados', 'FolderOpen'),
  ('users', 'Usuários', 'Gerenciamento de usuários', 'Users'),
  ('profile', 'Meu Perfil', 'Configurações do perfil', 'User'),
  ('wallet', 'DOT Wallet', 'Carteira digital', 'Wallet');

-- Criar roles padrão
INSERT INTO public.custom_roles (name, display_name, description, base_role, created_by) VALUES
  ('admin_full', 'Administrador Completo', 'Acesso total ao sistema', 'admin', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('sdr_standard', 'SDR Padrão', 'Acesso básico para SDRs', 'sdr', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('closer_standard', 'Closer Padrão', 'Acesso padrão para closers', 'closer', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Configurar permissões padrão para admin
INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cr.id,
  m.id,
  true,
  true,
  true,
  true
FROM public.custom_roles cr
CROSS JOIN public.modules m
WHERE cr.name = 'admin_full';

-- Configurar permissões padrão para SDR
INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cr.id,
  m.id,
  CASE WHEN m.name IN ('dashboard', 'profile', 'wallet') THEN true ELSE false END,
  CASE WHEN m.name IN ('dashboard') THEN true ELSE false END,
  CASE WHEN m.name IN ('profile') THEN true ELSE false END,
  false
FROM public.custom_roles cr
CROSS JOIN public.modules m
WHERE cr.name = 'sdr_standard';

-- Configurar permissões padrão para Closer
INSERT INTO public.role_module_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cr.id,
  m.id,
  CASE WHEN m.name IN ('dashboard', 'projetos', 'profile', 'wallet') THEN true ELSE false END,
  CASE WHEN m.name IN ('dashboard', 'projetos') THEN true ELSE false END,
  CASE WHEN m.name IN ('projetos', 'profile') THEN true ELSE false END,
  false
FROM public.custom_roles cr
CROSS JOIN public.modules m
WHERE cr.name = 'closer_standard';

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para modules
CREATE POLICY "Everyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (get_current_user_role() = 'admin');

-- Políticas RLS para custom_roles
CREATE POLICY "Everyone can view custom roles" ON public.custom_roles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage custom roles" ON public.custom_roles FOR ALL USING (get_current_user_role() = 'admin');

-- Políticas RLS para role_module_permissions
CREATE POLICY "Everyone can view role permissions" ON public.role_module_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage role permissions" ON public.role_module_permissions FOR ALL USING (get_current_user_role() = 'admin');

-- Políticas RLS para user_module_permissions
CREATE POLICY "Users can view their own permissions" ON public.user_module_permissions FOR SELECT USING (user_id = auth.uid() OR get_current_user_role() = 'admin');
CREATE POLICY "Admins can manage user permissions" ON public.user_module_permissions FOR ALL USING (get_current_user_role() = 'admin');

-- Função para verificar permissões de usuário em módulos
CREATE OR REPLACE FUNCTION public.user_has_module_permission(
  _user_id UUID, 
  _module_name TEXT, 
  _permission_type TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_permission BOOLEAN := false;
  user_role_id UUID;
BEGIN
  -- Verificar se é admin (acesso total)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN true;
  END IF;

  -- Buscar role customizada do usuário
  SELECT custom_role_id INTO user_role_id 
  FROM public.profiles 
  WHERE user_id = _user_id;

  -- Verificar permissão específica do usuário (override)
  SELECT 
    CASE 
      WHEN _permission_type = 'view' THEN can_view
      WHEN _permission_type = 'create' THEN can_create
      WHEN _permission_type = 'edit' THEN can_edit
      WHEN _permission_type = 'delete' THEN can_delete
      ELSE false
    END INTO has_permission
  FROM public.user_module_permissions ump
  JOIN public.modules m ON m.id = ump.module_id
  WHERE ump.user_id = _user_id AND m.name = _module_name;

  -- Se encontrou permissão específica, retornar
  IF has_permission IS NOT NULL THEN
    RETURN has_permission;
  END IF;

  -- Verificar permissão da role
  IF user_role_id IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN _permission_type = 'view' THEN can_view
        WHEN _permission_type = 'create' THEN can_create
        WHEN _permission_type = 'edit' THEN can_edit
        WHEN _permission_type = 'delete' THEN can_delete
        ELSE false
      END INTO has_permission
    FROM public.role_module_permissions rmp
    JOIN public.modules m ON m.id = rmp.module_id
    WHERE rmp.role_id = user_role_id AND m.name = _module_name;
  END IF;

  RETURN COALESCE(has_permission, false);
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_module_permissions_updated_at
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();