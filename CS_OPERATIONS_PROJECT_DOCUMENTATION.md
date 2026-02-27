# Documentação Completa: Projeto CS/Operações DOT

Este documento contém todo o código e instruções necessárias para replicar o projeto CS/Operações em um novo chat do Lovable.

## 📋 Índice

1. [Configuração Inicial](#1-configuração-inicial)
2. [Sistema de Autenticação](#2-sistema-de-autenticação)
3. [Sidebar CS/Operações](#3-sidebar-csoperações)
4. [Componentes Customer Success](#4-componentes-customer-success)
5. [Edge Functions](#5-edge-functions)
6. [Hooks e Utilitários](#6-hooks-e-utilitários)
7. [Páginas de Formulários Públicos](#7-páginas-de-formulários-públicos)
8. [Componentes de Aprovação](#8-componentes-de-aprovação)
9. [Design System](#9-design-system)

---

## 1. Configuração Inicial

### 1.1 Conectar ao Supabase Existente

**URL do Supabase:** `https://yoauzllgwcsrmvkwdcoa.supabase.co`

**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXV6bGxnd2Nzcm12a3dkY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjMwNzUsImV4cCI6MjA3MTYzOTA3NX0.ZJGF9tw5b3XeTLHPByP_a7R2yrgzUae_L1lWC-AJz90`

### 1.2 Dependências Necessárias

```bash
# Core
@tanstack/react-query
react-router-dom
@supabase/supabase-js

# UI
framer-motion
lucide-react
sonner
vaul
recharts

# Forms
react-hook-form
@hookform/resolvers
zod

# Drag and Drop
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities

# Utils
date-fns
xlsx
clsx
tailwind-merge
```

### 1.3 Supabase Client (src/integrations/supabase/client.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yoauzllgwcsrmvkwdcoa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXV6bGxnd2Nzcm12a3dkY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjMwNzUsImV4cCI6MjA3MTYzOTA3NX0.ZJGF9tw5b3XeTLHPByP_a7R2yrgzUae_L1lWC-AJz90";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

---

## 2. Sistema de Autenticação

### 2.1 AuthContext.tsx (ADAPTADO PARA CS)

**IMPORTANTE:** A única mudança necessária é filtrar por `project_scope = 'cs'` ao invés de `'crm'`

```typescript
import { createContext, useContext, useEffect, useState, useMemo, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// Tipos
interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  effectiveRole?: 'admin' | 'manager' | 'user';
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  project_scope: string;
  custom_role_id?: string | null;
  custom_roles?: {
    id: string;
    name: string;
    display_name: string;
    base_role: string;
  } | null;
  selected_celebration_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializationRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          custom_roles (
            id,
            name,
            display_name,
            base_role
          )
        `)
        // IMPORTANTE: Filtrar por project_scope = 'cs' ou 'both'
        .in('project_scope', ['cs', 'both'])
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Calcular effective role
      const effectiveRole = profileData.custom_roles?.base_role || profileData.role;
      
      return {
        ...profileData,
        effectiveRole
      } as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(async () => {
            const userProfile = await fetchProfile(currentSession.user.id);
            
            if (!userProfile || !userProfile.is_active) {
              // Usuário não tem acesso ao projeto CS
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
              setProfile(null);
              navigate('/auth');
              return;
            }
            
            setProfile(userProfile);
          }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user && !profile) {
        fetchProfile(currentSession.user.id).then(userProfile => {
          if (userProfile && userProfile.is_active) {
            setProfile(userProfile);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate('/auth');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }), [user, session, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2.2 ProtectedRoute.tsx

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { DotLogo } from '@/components/DotLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'user')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <DotLogo size={60} animate />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile.is_active) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.effectiveRole || profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
```

### 2.3 Auth.tsx (Página de Login)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DotLogo } from '@/components/DotLogo';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
      setLoading(false);
      return;
    }

    toast.success('Login realizado com sucesso!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <DotLogo size={60} />
          </div>
          <CardTitle className="text-2xl">DOT CS/Operações</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2.4 SetPassword.tsx

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DotLogo } from '@/components/DotLogo';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Link inválido ou expirado');
        navigate('/auth');
        return;
      }
      setSessionChecked(true);
    };
    checkSession();
  }, [navigate]);

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Um número', met: /[0-9]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRequirementsMet) {
      toast.error('A senha não atende aos requisitos mínimos');
      return;
    }

    if (!passwordsMatch) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Erro ao definir senha. Tente novamente.');
      setLoading(false);
      return;
    }

    toast.success('Senha definida com sucesso!');
    navigate('/dashboard');
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DotLogo size={60} animate />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <DotLogo size={60} />
          </div>
          <CardTitle className="text-2xl">Definir Senha</CardTitle>
          <CardDescription>Crie uma senha segura para sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? 'Salvando...' : 'Definir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 3. Sidebar CS/Operações

### 3.1 Estrutura de Navegação

```typescript
// Estrutura de módulos para CS/Operações
const csModules = [
  {
    title: "Customer Success",
    icon: Users,
    children: [
      { title: "CSM", url: "/dashboard", icon: LayoutGrid },
      {
        title: "Dashboards",
        icon: BarChart3,
        children: [
          { title: "NPS", url: "/dashboard-nps", icon: Heart },
          { title: "CSAT", url: "/dashboard-csat", icon: Star },
          { title: "CHURN", url: "/dashboard-churn", icon: TrendingDown },
        ]
      },
      {
        title: "Pipelines",
        icon: Layers,
        children: [
          { title: "Gestão NPS", url: "/gestao-nps", icon: ClipboardList },
          { title: "Gestão CSAT", url: "/gestao-csat", icon: ClipboardCheck },
          { title: "Gestão Cancelamentos", url: "/gestao-cancelamentos", icon: UserX },
        ]
      },
      {
        title: "Formulários",
        icon: FileText,
        children: [
          { title: "Gerar Forms", url: "/gerar-forms", icon: LinkIcon },
          { title: "NPS", url: "/form-nps", icon: Heart },
          { title: "CSAT", url: "/form-csat", icon: Star },
          { title: "CHURN", url: "/solicitar-cancelamento", icon: UserX },
        ]
      }
    ]
  },
  {
    title: "Operação",
    icon: Settings,
    children: [
      {
        title: "Projetos",
        icon: FolderKanban,
        children: [
          { title: "Clientes", url: "/gestao-projetos", icon: Users },
          { title: "Métricas Financeiras", url: "/metricas-financeiras", icon: DollarSign },
        ]
      },
      { title: "Performance", url: "/performance", icon: BarChart },
      {
        title: "Criação",
        icon: Palette,
        children: [
          { title: "Aprovação", url: "/aprovacao", icon: CheckCircle },
          { title: "Copy", url: "/copy", icon: FileText },
          { title: "Análise e Bench", url: "/analise-bench", icon: Search },
        ]
      }
    ]
  },
  {
    title: "Cases de Sucesso",
    icon: Trophy,
    url: "/cases"
  },
  {
    title: "Administração",
    icon: Shield,
    children: [
      { title: "Usuários", url: "/usuarios", icon: Users },
      { title: "Meu Perfil", url: "/meu-perfil", icon: User },
      { title: "Preferências", url: "/preferencias", icon: Settings },
      { title: "Automações", url: "/automacoes", icon: Zap },
    ]
  }
];
```

---

## 4. Componentes Customer Success

### 4.1 CSMKanban.tsx (743 linhas)

Este é o componente principal do módulo CSM. Funcionalidades:
- Kanban com drag and drop de cards
- Filtros por squad, plano, nicho, tags
- Modos Kanban e Lista
- Busca e ordenação
- Edição inline de cards

**Instruções:** Copie o arquivo `src/components/CSMKanban.tsx` do projeto original.

### 4.2 CustomerSuccessDashboard.tsx (529 linhas)

Dashboard NPS com:
- Gauges de NPS
- Gráficos de promotores/neutros/detratores
- Ranking por squad
- Filtro por período

**Instruções:** Copie o arquivo `src/components/CustomerSuccessDashboard.tsx` do projeto original.

### 4.3 CSATMetricsDashboard.tsx

Dashboard CSAT com:
- Métricas de satisfação
- Gráficos radar
- Comparativo por período

### 4.4 ChurnMetrics.tsx

Dashboard de Churn com:
- Métricas de cancelamento
- Análise por motivo
- Tendências

### 4.5 FinancialMetrics.tsx

Métricas financeiras:
- MRR por cliente
- Upsell
- Métricas de receita

---

## 5. Edge Functions

### 5.1 create-user/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, name, role, department, password, project_scope } = await req.json();

    // Verificar se usuário já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users?.find(u => u.email === email);

    if (userExists) {
      // Atualizar profile existente
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ name, role, department, is_active: true, project_scope: project_scope || 'cs' })
        .eq('user_id', userExists.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ message: 'Usuário atualizado', user: userExists }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar novo usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) throw authError;

    // Criar profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: authData.user.id,
      email,
      name,
      role: role || 'user',
      department,
      is_active: true,
      project_scope: project_scope || 'cs' // IMPORTANTE: Default para CS
    });

    if (profileError) throw profileError;

    // Se não tem senha, enviar convite
    if (!password) {
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get('origin')}/set-password`
      });
    }

    return new Response(
      JSON.stringify({ message: 'Usuário criado', user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.2 generate-csm-alerts/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { card_id } = await req.json();

    // Chamar função RPC do banco para gerar alertas
    const { data, error } = await supabase.rpc('generate_csm_alerts_for_card', {
      p_card_id: card_id
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, alerts: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.3 auto-move-cards/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar pipeline "Clientes ativos"
    const { data: pipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('name', 'Clientes ativos')
      .single();

    if (!pipeline) {
      return new Response(
        JSON.stringify({ error: 'Pipeline não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar stages ordenados
    const { data: stages } = await supabase
      .from('crm_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipeline.id)
      .eq('is_active', true)
      .order('position');

    if (!stages || stages.length < 2) {
      return new Response(
        JSON.stringify({ message: 'Não há stages suficientes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstStage = stages[0];
    const secondStage = stages[1];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar cards na primeira etapa há mais de 30 dias
    const { data: cardsToMove } = await supabase
      .from('crm_cards')
      .select('id, title')
      .eq('stage_id', firstStage.id)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (!cardsToMove || cardsToMove.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum card para mover', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mover cards
    const cardIds = cardsToMove.map(c => c.id);
    
    const { error: updateError } = await supabase
      .from('crm_cards')
      .update({ 
        stage_id: secondStage.id,
        updated_at: new Date().toISOString()
      })
      .in('id', cardIds);

    if (updateError) throw updateError;

    // Registrar no histórico
    for (const card of cardsToMove) {
      await supabase.from('crm_card_stage_history').insert({
        card_id: card.id,
        stage_id: secondStage.id,
        event_type: 'auto_move',
        notes: `Movido automaticamente de "${firstStage.name}" para "${secondStage.name}" após 30 dias`
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${cardsToMove.length} cards movidos automaticamente`,
        count: cardsToMove.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.4 generate-case-copy/index.ts

```typescript
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, niche, challenge, solution, results, prompt_type } = await req.json();

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    const systemPrompt = prompt_type === 'blog' 
      ? `Você é um copywriter especializado em criar artigos de blog para cases de sucesso de marketing digital. 
         Escreva um artigo completo, engajador e otimizado para SEO.`
      : `Você é um copywriter especializado em criar posts para redes sociais.
         Crie um post impactante e persuasivo para compartilhar este case de sucesso.`;

    const userPrompt = `
      Crie um ${prompt_type === 'blog' ? 'artigo de blog' : 'post para redes sociais'} sobre o seguinte case:
      
      Cliente: ${clientName}
      Nicho: ${niche}
      Desafio: ${challenge}
      Solução: ${solution}
      Resultados: ${results}
    `;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    return new Response(
      JSON.stringify({ content: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 6. Hooks e Utilitários

### 6.1 usePipelineAutomations.tsx

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Automation {
  id: string;
  source_pipeline_id: string;
  target_pipeline_id: string;
  trigger_event: string;
  archive_to: string | null;
  is_active: boolean;
  require_owner_transfer: boolean;
  target_owner_role: string | null;
}

export const usePipelineAutomations = (sourcePipelineId?: string) => {
  const { user, profile } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const executingRef = useRef(new Set<string>());

  const fetchAutomations = useCallback(async () => {
    if (!sourcePipelineId) {
      setAutomations([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('pipeline_automations')
      .select('*')
      .eq('source_pipeline_id', sourcePipelineId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching automations:', error);
    } else {
      setAutomations(data || []);
    }
    setLoading(false);
  }, [sourcePipelineId]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const executeAutomation = useCallback(async (
    cardId: string,
    triggerEvent: string,
    cardData: any
  ) => {
    // Evitar execução duplicada
    const executionKey = `${cardId}-${triggerEvent}`;
    if (executingRef.current.has(executionKey)) {
      return null;
    }
    executingRef.current.add(executionKey);

    try {
      const automation = automations.find(a => a.trigger_event === triggerEvent);
      
      if (!automation) {
        return null;
      }

      // Buscar primeira etapa do pipeline destino
      const { data: targetStages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', automation.target_pipeline_id)
        .eq('is_active', true)
        .order('position')
        .limit(1);

      if (!targetStages || targetStages.length === 0) {
        console.error('No target stage found');
        return null;
      }

      const targetStageId = targetStages[0].id;

      // Determinar novo responsável se necessário
      let newAssignedTo = cardData.assigned_to;
      
      if (automation.require_owner_transfer && automation.target_owner_role) {
        const { data: targetUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', automation.target_owner_role)
          .eq('is_active', true)
          .limit(1);

        if (targetUsers && targetUsers.length > 0) {
          newAssignedTo = targetUsers[0].user_id;
        }
      }

      // Criar cópia do card no pipeline destino
      const { data: newCard, error: insertError } = await supabase
        .from('crm_cards')
        .insert({
          title: cardData.title,
          company_name: cardData.company_name,
          contact_name: cardData.contact_name,
          contact_email: cardData.contact_email,
          contact_phone: cardData.contact_phone,
          description: cardData.description,
          value: cardData.value,
          monthly_revenue: cardData.monthly_revenue,
          pipeline_id: automation.target_pipeline_id,
          stage_id: targetStageId,
          assigned_to: newAssignedTo,
          created_by: user?.id,
          squad: cardData.squad,
          plano: cardData.plano,
          niche: cardData.niche,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating card:', insertError);
        return null;
      }

      // Registrar no histórico
      await supabase.from('crm_card_stage_history').insert({
        card_id: newCard.id,
        stage_id: targetStageId,
        event_type: 'automation',
        notes: `Card criado via automação: ${triggerEvent}`,
        moved_by: user?.id
      });

      // Se tem archive_to, mover card original para arquivo
      if (automation.archive_to) {
        const { data: archiveStages } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('pipeline_id', automation.archive_to)
          .eq('is_active', true)
          .order('position')
          .limit(1);

        if (archiveStages && archiveStages.length > 0) {
          await supabase
            .from('crm_cards')
            .update({
              pipeline_id: automation.archive_to,
              stage_id: archiveStages[0].id
            })
            .eq('id', cardId);
        }
      }

      toast.success('Automação executada com sucesso!');
      return newCard;
    } catch (error) {
      console.error('Error executing automation:', error);
      return null;
    } finally {
      executingRef.current.delete(executionKey);
    }
  }, [automations, user?.id]);

  return {
    automations,
    loading,
    executeAutomation,
    refetch: fetchAutomations
  };
};
```

### 6.2 useModulePermissions.tsx

```typescript
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
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const checkModulePermission = (
    moduleName: string, 
    permissionType: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean => {
    // Módulos públicos
    const publicModules = ['preferencias-interface', 'preferencias', 'profile', 'meu-perfil'];
    if (publicModules.includes(moduleName)) {
      return true;
    }
    
    const effectiveRole = profile?.effectiveRole || profile?.role;
    
    // Admin tem acesso total
    if (effectiveRole === 'admin') {
      return true;
    }
    
    // Verificar permissões do banco
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

    return false;
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !profile) {
        setPermissions({});
        return;
      }

      const effectiveRole = profile?.effectiveRole || profile.role;
      if (effectiveRole === 'admin') {
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      try {
        if (!hasLoadedRef.current) {
          setLoading(true);
        }

        const { data: modules } = await supabase
          .from('modules')
          .select('id, name')
          .eq('is_active', true);

        const modulePermissions: ModulePermissions = {};
        
        for (const module of modules || []) {
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

          modulePermissions[module.name] = {
            can_view: viewResult.data || false,
            can_create: createResult.data || false,
            can_edit: editResult.data || false,
            can_delete: deleteResult.data || false
          };
        }

        setPermissions(modulePermissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
        hasLoadedRef.current = true;
      }
    };

    fetchPermissions();
  }, [user?.id, profile?.role]);

  return {
    permissions,
    loading,
    checkModulePermission
  };
};
```

### 6.3 findCSMCard.ts (Utilitário)

```typescript
import { supabase } from '@/integrations/supabase/client';

export const findCSMCard = async (
  email: string,
  empresa: string,
  responsavel: string
): Promise<{ cardId: string; stageId: string } | null> => {
  try {
    // Buscar pipelines CSM
    const { data: pipelines } = await supabase
      .from('crm_pipelines')
      .select('id')
      .in('name', ['Clientes ativos', 'Clientes Perdidos']);

    if (!pipelines || pipelines.length === 0) return null;

    const pipelineIds = pipelines.map(p => p.id);

    // Buscar card por email primeiro
    const { data: cardsByEmail } = await supabase
      .from('crm_cards')
      .select('id, stage_id')
      .in('pipeline_id', pipelineIds)
      .ilike('contact_email', email)
      .limit(1);

    if (cardsByEmail && cardsByEmail.length > 0) {
      return { cardId: cardsByEmail[0].id, stageId: cardsByEmail[0].stage_id };
    }

    // Buscar por nome da empresa
    const normalizedEmpresa = empresa.toLowerCase().trim();
    const { data: cardsByCompany } = await supabase
      .from('crm_cards')
      .select('id, stage_id, company_name, title')
      .in('pipeline_id', pipelineIds);

    const matchingCard = cardsByCompany?.find(card => {
      const companyName = (card.company_name || '').toLowerCase().trim();
      const title = (card.title || '').toLowerCase().trim();
      return companyName === normalizedEmpresa || title === normalizedEmpresa;
    });

    if (matchingCard) {
      return { cardId: matchingCard.id, stageId: matchingCard.stage_id };
    }

    return null;
  } catch (error) {
    console.error('Error finding CSM card:', error);
    return null;
  }
};

export const recordFormSubmissionInHistory = async (
  cardId: string,
  stageId: string,
  formType: 'NPS' | 'CSAT' | 'Cancelamento',
  responsavel: string,
  email: string
) => {
  try {
    await supabase.from('crm_card_stage_history').insert({
      card_id: cardId,
      stage_id: stageId,
      event_type: 'form_submission',
      notes: `Formulário ${formType} preenchido por ${responsavel} (${email})`
    });
  } catch (error) {
    console.error('Error recording form submission:', error);
  }
};
```

---

## 7. Páginas de Formulários Públicos

### 7.1 FormNPS.tsx

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DotLogo } from "@/components/DotLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { findCSMCard, recordFormSubmissionInHistory } from "@/utils/findCSMCard";

const formSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  responsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().email("E-mail inválido"),
  recomendacao: z.number().min(0).max(10),
  sentimento_sem_dot: z.string().min(1, "Este campo é obrigatório"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function FormNPS() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recomendacao: 5,
    }
  });

  const recomendacao = watch("recomendacao");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const csmCard = await findCSMCard(data.email, data.empresa, data.responsavel);

      const { error } = await supabase.from("nps_responses").insert({
        empresa: data.empresa,
        responsavel: data.responsavel,
        email: data.email,
        recomendacao: data.recomendacao,
        sentimento_sem_dot: data.sentimento_sem_dot,
        observacoes: data.observacoes || null,
        card_id: csmCard?.cardId || null,
      });

      if (error) throw error;

      if (csmCard) {
        await recordFormSubmissionInHistory(
          csmCard.cardId,
          csmCard.stageId,
          'NPS',
          data.responsavel,
          data.email
        );
      }

      setSubmitted(true);
      toast.success("Pesquisa enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting NPS:", error);
      toast.error("Erro ao enviar pesquisa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <DotLogo size={80} className="mb-8" />
        <Card className="w-full max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Obrigado!</h1>
          <p className="text-muted-foreground text-lg">
            Sua resposta foi registrada com sucesso.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <DotLogo size={80} className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Pesquisa NPS</h1>
          <p className="text-muted-foreground text-lg">
            Sua opinião é muito importante para nós!
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="empresa">Nome da Empresa *</Label>
              <Input id="empresa" {...register("empresa")} />
              {errors.empresa && <p className="text-sm text-destructive">{errors.empresa.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Seu Nome *</Label>
              <Input id="responsavel" {...register("responsavel")} />
              {errors.responsavel && <p className="text-sm text-destructive">{errors.responsavel.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Seu E-mail *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-4">
              <Label>
                De 0 a 10, o quanto você recomendaria a DOT para um amigo ou colega? *
              </Label>
              <div className="flex justify-between gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setValue("recomendacao", num)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      recomendacao === num
                        ? num <= 6
                          ? "bg-red-500 text-white"
                          : num <= 8
                          ? "bg-yellow-500 text-white"
                          : "bg-green-500 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sentimento_sem_dot">
                Como você se sentiria se não pudesse mais contar com a DOT? *
              </Label>
              <Textarea id="sentimento_sem_dot" {...register("sentimento_sem_dot")} rows={3} />
              {errors.sentimento_sem_dot && <p className="text-sm text-destructive">{errors.sentimento_sem_dot.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea id="observacoes" {...register("observacoes")} rows={3} />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

---

## 8. Componentes de Aprovação

### 8.1 ApprovalKanban.tsx (Resumo)

O módulo de aprovação inclui:
- **ApprovalKanban.tsx** - Kanban principal
- **ApprovalJobCard.tsx** - Card individual
- **ApprovalColumn.tsx** - Coluna do kanban
- **JobDialog.tsx** - Dialog de detalhes
- **InstagramPostPreview.tsx** - Preview de posts

Colunas do Kanban:
1. Rascunho
2. Para Aprovação
3. Em Ajustes
4. Aprovado
5. Arquivado

---

## 9. Design System

### 9.1 Cores Principais (index.css)

```css
:root {
  --primary: 0 75% 55%; /* Vermelho DOT */
  --primary-foreground: 0 0% 100%;
  --secondary: 221 54% 14%; /* Azul Escuro DOT #111c36 */
  --secondary-foreground: 0 0% 100%;
  
  --background: 0 0% 100%;
  --foreground: 225 15% 20%;
  
  --sidebar-background: 221 54% 14%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 0 75% 55%;
}

.dark {
  --background: 225 25% 8%;
  --foreground: 0 0% 98%;
  --sidebar-background: 227 22% 8%;
}
```

### 9.2 Tailwind Config (tailwind.config.ts)

```typescript
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
        }
      }
    }
  }
}
```

---

## 🔄 Tabelas Supabase Compartilhadas

O novo projeto CS usa as mesmas tabelas do CRM:

- **profiles** - Usuários (filtrar por `project_scope`)
- **crm_cards** - Cards de clientes
- **crm_pipelines** - Pipelines (CSM usa "Clientes ativos", "Clientes Perdidos")
- **crm_stages** - Etapas dos pipelines
- **crm_tags** - Tags
- **crm_card_tags** - Relação card-tag
- **nps_responses** - Respostas NPS
- **csat_responses** - Respostas CSAT
- **cancellation_requests** - Solicitações de cancelamento
- **approval_jobs** - Jobs de aprovação
- **success_cases** - Cases de sucesso
- **pipeline_automations** - Automações entre pipelines
- **modules** - Módulos do sistema
- **module_permissions** - Permissões por módulo
- **custom_roles** - Cargos customizados
- **squads** - Squads/Times

---

## ⚡ Automações Entre Projetos

A automação principal que conecta CRM e CS:

**Trigger:** Card marcado como "Ganho" no CRM
**Ação:** Cria cópia do card no pipeline "Clientes ativos" do CSM

Isso é gerenciado pelo hook `usePipelineAutomations` e pela tabela `pipeline_automations`.

---

## 📝 Instruções de Implementação

1. **Criar novo projeto Lovable**
2. **Conectar ao Supabase existente** usando URL e Anon Key acima
3. **Instalar dependências**
4. **Copiar design system** (index.css, tailwind.config.ts)
5. **Implementar autenticação** (AuthContext com filtro `project_scope = 'cs'`)
6. **Criar Sidebar** com estrutura de navegação CS
7. **Implementar componentes** por módulo:
   - CSM (Kanban, Dashboard)
   - NPS/CSAT/Churn
   - Cancelamentos
   - Aprovação
   - Cases
8. **Copiar Edge Functions** para `supabase/functions/`
9. **Testar automações** entre CRM e CS

---

## 🔐 Observações de Segurança

1. **Usuários são separados por `project_scope`:**
   - CRM: `project_scope = 'crm'`
   - CS: `project_scope = 'cs'`
   - Ambos: `project_scope = 'both'`

2. **RLS já está configurado** no Supabase

3. **Permissões de módulo** são gerenciadas pela tabela `module_permissions`

---

*Este documento foi gerado automaticamente para migração do projeto CS/Operações da DOT.*
