import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: 'workspace_admin' | 'admin' | 'sdr' | 'closer';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  custom_role_id?: string;
  selected_celebration_id?: string;
  project_scope?: 'csm' | 'cs' | 'both'; // Define qual projeto o usuário pertence
  custom_roles?: {
    base_role: string;
    display_name?: string;
  };
  effectiveRole?: string; // Role efetiva considerando custom_role
  customRoleDisplayName?: string; // Nome de exibição do custom_role
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addUser: (userData: { name: string; email: string; password: string; role: 'workspace_admin' | 'admin' | 'sdr' | 'closer'; department?: string; phone?: string; customRoleId?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateUser: (userId: string, userData: Partial<Profile>) => Promise<boolean>;
  removeUser: (userId: string) => Promise<boolean>;
  activateUser: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const clearAuthState = () => {
      if (cancelled) return;
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfiles([]);
      setLoading(false);
    };

    const loadProfileForUser = async (u: User) => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*, custom_roles(base_role, display_name)')
          .eq('user_id', u.id)
          .single();

        if (cancelled) return;

        if (error && (error as any).code === 'PGRST116') {
          // Perfil não existe - criar para usuário OAuth (primeiro login via Google)
          const userEmail = u.email;
          const userName =
            (u.user_metadata as any)?.full_name ||
            (u.user_metadata as any)?.name ||
            userEmail?.split('@')[0] ||
            'Usuário';

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: u.id,
              email: userEmail,
              name: userName,
              role: 'sdr',
              is_active: true,
              project_scope: 'csm',
            })
            .select('*, custom_roles(base_role, display_name)')
            .single();

          if (cancelled) return;

          if (insertError) {
            console.error('Erro ao criar perfil para usuário OAuth:', insertError);
          } else if (newProfile) {
            const userProfile: Profile = {
              ...newProfile,
              role: newProfile.role as 'workspace_admin' | 'admin' | 'sdr' | 'closer',
              project_scope: newProfile.project_scope as 'csm' | 'cs' | 'both',
              effectiveRole: newProfile.role,
              customRoleDisplayName: undefined,
            };
            setProfile(userProfile);
          }
          return;
        }

        if (error) {
          console.error('Erro ao buscar perfil:', error);
          return;
        }

        if (profileData) {
          // CRÍTICO: Verificar se usuário está ativo
          if (!profileData.is_active) {
            console.warn('Usuário desativado tentou acessar o sistema:', profileData.email);
            await supabase.auth.signOut();
            clearAuthState();
            return;
          }

          const baseRole = profileData.custom_roles?.base_role;
          const effectiveRole = baseRole && baseRole !== 'custom' ? baseRole : profileData.role;
          const userProfile: Profile = {
            ...profileData,
            role: profileData.role as 'workspace_admin' | 'admin' | 'sdr' | 'closer',
            project_scope: profileData.project_scope as 'csm' | 'cs' | 'both',
            effectiveRole,
            customRoleDisplayName: profileData.custom_roles?.display_name,
          };

          if (!cancelled) setProfile(userProfile);

          // Buscar todos os perfis se for admin ou workspace_admin
          if (userProfile.effectiveRole === 'admin' || userProfile.role === 'workspace_admin') {
            // Não bloquear o fluxo de autenticação/rotas esperando essa listagem
            // (evita que /auth fique preso em loading se essa query demorar/falhar).
            void refreshProfiles();
          }
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
      }
    };

    const startProfileLoad = (u: User) => {
      if (cancelled) return;
      setLoading(true);

      // Safety net: evita ficar preso em loading infinito caso alguma request trave
      // (isso impacta diretamente a tela /auth que depende de `loading` para liberar o form).
      const safetyTimeout = globalThis.setTimeout(() => {
        console.warn('AuthContext: timeout ao carregar perfil; liberando loading para evitar travamento.');
        finishLoading();
      }, 8000);

      // Importante: não chamar Supabase dentro do callback do onAuthStateChange; deferimos.
      setTimeout(() => {
        void loadProfileForUser(u).finally(() => {
          globalThis.clearTimeout(safetyTimeout);
          finishLoading();
        });
      }, 0);
    };

    // Configurar listener de autenticação (callback síncrono)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        startProfileLoad(nextSession.user);
      } else {
        clearAuthState();
      }
    });

    // Verificar sessão inicial (IMPORTANTE: pode existir sessão sem disparar onAuthStateChange)
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (cancelled) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          startProfileLoad(initialSession.user);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao restaurar sessão:', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfiles = async () => {
    try {
      // Filtrar apenas usuários do projeto CSM (project_scope = 'csm' ou 'both')
      const { data, error } = await supabase
        .from('profiles')
        .select('*, custom_roles(base_role, display_name)')
        .in('project_scope', ['csm', 'both'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar perfis:', error);
      } else {
        // Garantir que roles sejam do tipo correto
        const typedProfiles: Profile[] = (data || []).map(p => {
          const baseRole = p.custom_roles?.base_role;
          const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : p.role;
          return {
            ...p,
            role: p.role as 'workspace_admin' | 'admin' | 'sdr' | 'closer',
            project_scope: p.project_scope as 'csm' | 'cs' | 'both',
            effectiveRole,
            customRoleDisplayName: p.custom_roles?.display_name
          };
        });
        setProfiles(typedProfiles);
      }
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, custom_roles(base_role, display_name)')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', error);
      } else if (profileData) {
        const baseRole = profileData.custom_roles?.base_role;
        const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : profileData.role;
        const userProfile: Profile = {
          ...profileData,
          role: profileData.role as 'workspace_admin' | 'admin' | 'sdr' | 'closer',
          project_scope: profileData.project_scope as 'csm' | 'cs' | 'both',
          effectiveRole,
          customRoleDisplayName: profileData.custom_roles?.display_name
        };
        setProfile(userProfile);
        console.log('Profile refreshed:', userProfile);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const addUser = async (userData: { name: string; email: string; password: string; role: 'workspace_admin' | 'admin' | 'sdr' | 'closer'; department?: string; phone?: string; customRoleId?: string }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      console.log('=== INICIANDO CRIAÇÃO DE USUÁRIO ===');
      console.log('Dados enviados:', userData);
      
      // Formato para a nova função create-user
      // Novos usuários criados neste projeto pertencem ao CSM
      const requestBody = {
        email: userData.email,
        password: userData.password,
        profile: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department || null,
          phone: userData.phone || null,
          is_active: true,
          custom_role_id: userData.customRoleId || null,
          project_scope: 'csm' // Usuários criados neste projeto pertencem ao CSM
        }
      };
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: requestBody,
        // Garantir envio do token JWT (supabase já faz isso, mas adicionamos por redundância)
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      console.log('=== RESPOSTA DA EDGE FUNCTION ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Erro ao chamar função create-user:', error);
        const status = (error as any)?.status;
        const message = (error as any)?.message || 'Falha ao comunicar com o servidor';
        return { success: false, error: `HTTP_${status ?? 'ERROR'}`, message };
      }

      if (data?.error) {
        console.error('Erro retornado pela função:', data.error);
        // Retornar objeto com informações do erro para melhor tratamento
        return { success: false, error: data.error, message: data.message };
      }

      console.log('User created successfully:', data);
      await refreshProfiles();
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      return { success: false, error: 'UNEXPECTED_ERROR', message: 'Erro inesperado ao criar usuário' };
    }
  };

  const updateUser = async (userId: string, userData: Partial<Profile>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        return false;
      }

      await refreshProfiles();
      
      // Atualizar perfil atual se for o mesmo usuário
      if (profile?.user_id === userId) {
        setProfile({ ...profile, ...userData });
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return false;
    }
  };

  const removeUser = async (userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao desativar usuário:', error);
        return false;
      }

      await refreshProfiles();
      return true;
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      return false;
    }
  };

  const activateUser = async (userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao ativar usuário:', error);
        return false;
      }

      await refreshProfiles();
      return true;
    } catch (error) {
      console.error('Erro ao ativar usuário:', error);
      return false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    profiles,
    loading,
    signOut,
    refreshProfiles,
    refreshProfile,
    addUser,
    updateUser,
    removeUser,
    activateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};