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
  role: 'admin' | 'user';
  is_active: boolean;
  is_global_admin: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  custom_role_id?: string;
  selected_celebration_id?: string;
  project_scope?: 'csm' | 'cs' | 'both';
  custom_roles?: {
    base_role: string;
    display_name?: string;
  };
  effectiveRole?: string;
  customRoleDisplayName?: string;
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
  addUser: (userData: { name: string; email: string; password: string; role: 'admin' | 'user'; department?: string; phone?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
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
              role: 'user',
              is_active: true,
              is_global_admin: false,
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
              role: newProfile.role as 'admin' | 'user',
              is_global_admin: newProfile.is_global_admin || false,
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

          // Determinar role efetivo
          const isGlobalAdmin = profileData.is_global_admin || false;
          const effectiveRole = isGlobalAdmin ? 'admin' : (profileData.role === 'admin' ? 'admin' : profileData.role);
          
          const userProfile: Profile = {
            ...profileData,
            role: profileData.role as 'admin' | 'user',
            is_global_admin: isGlobalAdmin,
            project_scope: profileData.project_scope as 'csm' | 'cs' | 'both',
            effectiveRole,
            customRoleDisplayName: profileData.custom_roles?.display_name,
          };

          if (!cancelled) setProfile(userProfile);

          // Buscar todos os perfis se for admin ou global admin
          if (effectiveRole === 'admin' || isGlobalAdmin) {
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

      const safetyTimeout = globalThis.setTimeout(() => {
        console.warn('AuthContext: timeout ao carregar perfil; liberando loading para evitar travamento.');
        finishLoading();
      }, 8000);

      setTimeout(() => {
        void loadProfileForUser(u).finally(() => {
          globalThis.clearTimeout(safetyTimeout);
          finishLoading();
        });
      }, 0);
    };

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*, custom_roles(base_role, display_name)')
        .in('project_scope', ['csm', 'both'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar perfis:', error);
      } else {
        const typedProfiles: Profile[] = (data || []).map(p => {
          const isGlobalAdmin = p.is_global_admin || false;
          const effectiveRole = isGlobalAdmin ? 'admin' : p.role;
          return {
            ...p,
            role: p.role as 'admin' | 'user',
            is_global_admin: isGlobalAdmin,
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
        const isGlobalAdmin = profileData.is_global_admin || false;
        const effectiveRole = isGlobalAdmin ? 'admin' : profileData.role;
        const userProfile: Profile = {
          ...profileData,
          role: profileData.role as 'admin' | 'user',
          is_global_admin: isGlobalAdmin,
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

  const addUser = async (userData: { name: string; email: string; password: string; role: 'admin' | 'user'; department?: string; phone?: string }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      console.log('=== INICIANDO CRIAÇÃO DE USUÁRIO ===');
      
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
          is_global_admin: false,
          project_scope: 'csm'
        }
      };
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: requestBody,
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error('Erro ao chamar função create-user:', error);
        const status = (error as any)?.status;
        const message = (error as any)?.message || 'Falha ao comunicar com o servidor';
        return { success: false, error: `HTTP_${status ?? 'ERROR'}`, message };
      }

      if (data?.error) {
        console.error('Erro retornado pela função:', data.error);
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
