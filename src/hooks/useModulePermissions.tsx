import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModulePermissions {
  [moduleName: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export const useModulePermissions = () => {
  const { profile, user } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermissions>({});
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastRoleRef = useRef<string | null>(null);

  const checkModulePermission = (moduleName: string, permissionType: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    // Módulos removidos (comercial) - sempre retorna false
    const removedModules = ['crm', 'dashboard', 'wallet', 'lista-espera', 'lista_espera'];
    if (removedModules.includes(moduleName)) {
      return false;
    }
    
    // Módulos que TODOS os usuários podem acessar, independente de permissões
    const publicModules = ['preferencias-interface', 'preferencias', 'interface_preferences', 'profile', 'meu-perfil'];
    if (publicModules.includes(moduleName)) {
      return true;
    }

    // Regra do produto: CSM é o módulo padrão para qualquer usuário AUTENTICADO
    // (mesmo quando o carregamento de permissões falhar/retornar vazio)
    if (user && moduleName === 'csm' && permissionType === 'view') {
      return true;
    }
    
    const effectiveRole = profile?.effectiveRole || profile?.role;
    const customRoles = profile?.custom_roles as { base_role?: string; name?: string; display_name?: string } | undefined;
    const customRoleName = customRoles?.name?.toLowerCase() || '';
    const customRoleDisplayName = customRoles?.display_name?.toLowerCase() || '';
    
    // Admin sempre tem acesso total a TODOS os módulos
    if (effectiveRole === 'admin' || customRoleName === 'admin' || customRoleDisplayName.includes('administrador completo')) {
      return true;
    }
    
    // Verificar permissões do banco de dados primeiro
    const modulePerms = permissions[moduleName];
    if (modulePerms) {
      const hasPermission = (() => {
        switch (permissionType) {
          case 'view':
            return modulePerms.can_view;
          case 'create':
            return modulePerms.can_create;
          case 'edit':
            return modulePerms.can_edit;
          case 'delete':
            return modulePerms.can_delete;
          default:
            return false;
        }
      })();
      
      if (hasPermission) {
        return true;
      }
    }

    // Se não tem permissão explícita no banco, negar acesso
    return false;
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !profile) {
        setPermissions({});
        setLoading(false);
        hasLoadedRef.current = false;
        lastUserIdRef.current = null;
        lastRoleRef.current = null;
        return;
      }

      // Check if we need to refetch (user or role changed)
      const userChanged = lastUserIdRef.current !== user.id;
      const roleChanged = lastRoleRef.current !== profile.role;
      const needsRefetch = userChanged || roleChanged || !hasLoadedRef.current;

      // Update refs
      lastUserIdRef.current = user.id;
      lastRoleRef.current = profile.role;

      if (!needsRefetch) {
        console.log('🚀 Permissions already loaded, skipping fetch');
        return;
      }

      console.log('🔄 Fetching permissions for user:', user.id, 'role:', profile.role, 'effectiveRole:', profile.effectiveRole);

      // Admin tem acesso total - não precisa verificar permissões específicas
      const effectiveRole = profile?.effectiveRole || profile.role;
      if (effectiveRole === 'admin') {
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      try {
        // Only show loading if we haven't loaded before
        if (!hasLoadedRef.current) {
          setLoading(true);
        }

        // Buscar todos os módulos ativos
        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select('id, name')
          .eq('is_active', true);

        if (modulesError) {
          console.error('Erro ao buscar módulos:', modulesError);
          return;
        }

        // Usar a função do banco para verificar permissões
        const modulePermissions: ModulePermissions = {};
        
        for (const module of modules || []) {
          console.log('🔄 Checking permissions for module:', module.name);
          
          // Verificar cada tipo de permissão
          const [viewResult, createResult, editResult, deleteResult] = await Promise.all([
            supabase.rpc('user_has_module_permission', {
              _user_id: user.id,
              _module_name: module.name,
              _permission_type: 'view'
            }),
            supabase.rpc('user_has_module_permission', {
              _user_id: user.id,
              _module_name: module.name,
              _permission_type: 'create'
            }),
            supabase.rpc('user_has_module_permission', {
              _user_id: user.id,
              _module_name: module.name,
              _permission_type: 'edit'
            }),
            supabase.rpc('user_has_module_permission', {
              _user_id: user.id,
              _module_name: module.name,
              _permission_type: 'delete'
            })
          ]);

          const modulePermissions_single = {
            can_view: viewResult.data || false,
            can_create: createResult.data || false,
            can_edit: editResult.data || false,
            can_delete: deleteResult.data || false
          };

          console.log(`📊 Permissions for ${module.name}:`, modulePermissions_single);

          modulePermissions[module.name] = modulePermissions_single;
        }

        console.log('🎯 Final permissions object:', modulePermissions);
        setPermissions(modulePermissions);
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
      } finally {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    };

    fetchPermissions();
  }, [user?.id, profile?.role, profile?.effectiveRole]);

  return {
    permissions,
    loading,
    checkModulePermission
  };
};