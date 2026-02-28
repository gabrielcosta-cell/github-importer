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
    // Módulos removidos - sempre retorna false
    const removedModules = ['dashboard', 'wallet', 'lista-espera', 'lista_espera'];
    if (removedModules.includes(moduleName)) {
      return false;
    }
    
    // Módulos públicos - todos podem acessar
    const publicModules = ['preferencias-interface', 'preferencias', 'interface_preferences', 'profile', 'meu-perfil'];
    if (publicModules.includes(moduleName)) {
      return true;
    }

    // CSM é módulo padrão para qualquer usuário autenticado (view)
    if (user && moduleName === 'csm' && permissionType === 'view') {
      return true;
    }
    
    const isGlobalAdmin = profile?.is_global_admin || false;
    const effectiveRole = profile?.effectiveRole || profile?.role;
    
    // Admin Global: acesso total a TUDO
    if (isGlobalAdmin) {
      return true;
    }
    
    // Admin: acesso total exceto que não pode se auto-promover (tratado na UI)
    if (effectiveRole === 'admin') {
      return true;
    }

    // Usuário Comum: módulo 'users' bloqueado completamente
    if (moduleName === 'users') {
      return false;
    }

    // Usuário Comum: bloqueio de delete em CSM e pipelines
    if (permissionType === 'delete') {
      const deleteBlockedModules = ['csm', 'pipelines', 'csm_pipelines', 'kanban'];
      if (deleteBlockedModules.includes(moduleName)) {
        return false;
      }
    }
    
    // Verificar permissões do banco de dados
    const modulePerms = permissions[moduleName];
    if (modulePerms) {
      switch (permissionType) {
        case 'view': return modulePerms.can_view;
        case 'create': return modulePerms.can_create;
        case 'edit': return modulePerms.can_edit;
        case 'delete': return modulePerms.can_delete;
        default: return false;
      }
    }

    // Sem permissão explícita = negar
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

      const userChanged = lastUserIdRef.current !== user.id;
      const roleChanged = lastRoleRef.current !== profile.role;
      const needsRefetch = userChanged || roleChanged || !hasLoadedRef.current;

      lastUserIdRef.current = user.id;
      lastRoleRef.current = profile.role;

      if (!needsRefetch) {
        return;
      }

      // Admin e Admin Global têm acesso total - não precisa verificar
      const effectiveRole = profile?.effectiveRole || profile.role;
      if (effectiveRole === 'admin' || profile.is_global_admin) {
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      try {
        if (!hasLoadedRef.current) {
          setLoading(true);
        }

        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select('id, name')
          .eq('is_active', true);

        if (modulesError) {
          console.error('Erro ao buscar módulos:', modulesError);
          return;
        }

        const modulePermissions: ModulePermissions = {};
        
        for (const module of modules || []) {
          const [viewResult, createResult, editResult, deleteResult] = await Promise.all([
            supabase.rpc('user_has_module_permission', { _user_id: user.id, _module_name: module.name, _permission_type: 'view' }),
            supabase.rpc('user_has_module_permission', { _user_id: user.id, _module_name: module.name, _permission_type: 'create' }),
            supabase.rpc('user_has_module_permission', { _user_id: user.id, _module_name: module.name, _permission_type: 'edit' }),
            supabase.rpc('user_has_module_permission', { _user_id: user.id, _module_name: module.name, _permission_type: 'delete' })
          ]);

          modulePermissions[module.name] = {
            can_view: viewResult.data || false,
            can_create: createResult.data || false,
            can_edit: editResult.data || false,
            can_delete: deleteResult.data || false
          };
        }

        setPermissions(modulePermissions);
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
      } finally {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    };

    fetchPermissions();
  }, [user?.id, profile?.role, profile?.effectiveRole, profile?.is_global_admin]);

  return {
    permissions,
    loading,
    checkModulePermission
  };
};
