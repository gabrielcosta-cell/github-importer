import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DotLogo } from '@/components/DotLogo';
import { Loader2, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('Verificando sessão...');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectedRef = useRef(false);

  // Detectar se está no ambiente de preview do Lovable
  const isProductionDomain = window.location.host.includes('dotconceito.com');
  const isPreviewEnvironment = !isProductionDomain && (
    window.self !== window.top ||
    window.location.host.includes('id-preview--') ||
    window.location.host.includes('lovable.app')
  );

  // Rota para redirecionar após login
  const nextUrl = searchParams.get('next') || '/dashboard';

  // Redireciona após login direto para Operação (sem seleção de módulos)
  const redirectAfterLogin = () => {
    const cleanNext = nextUrl?.split('?')[0];

    // IMPORTANT: no ambiente de preview, o acesso pode depender do __lovable_token.
    // Se ele existir no `next`, preservamos ao redirecionar para o dashboard.
    const nextQuery = (() => {
      const idx = (nextUrl || '').indexOf('?');
      return idx >= 0 ? (nextUrl || '').slice(idx + 1) : '';
    })();
    const lovableToken = new URLSearchParams(nextQuery).get('__lovable_token');
    const tokenSuffix = lovableToken ? `&__lovable_token=${encodeURIComponent(lovableToken)}` : '';

    // Se o next aponta para outra rota (ex.: aprovação, formulários), respeitar 100%.
    if (nextUrl && cleanNext !== '/dashboard' && cleanNext !== '/selecionar-modulo') {
      navigate(nextUrl, { replace: true });
      return;
    }

    // Caso o next seja /dashboard (com qualquer view), sempre entrar no CSM.
    navigate(`/dashboard?view=csm${tokenSuffix}`, { replace: true });
  };

  useEffect(() => {
    try {
      sessionStorage.removeItem('leaving_to_modules');
      sessionStorage.removeItem('auth_portal_redirect_attempted');
    } catch {
      // ignore
    }

    if (!loading && !user) {
      redirectedRef.current = false;
    }

    if (loading) return;

    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      setStatus('Sessão encontrada. Entrando...');
      setIsRedirecting(true);
      redirectAfterLogin();
      return;
    }

    if (!user) {
      if (isPreviewEnvironment) {
        setStatus('Ambiente de preview detectado');
        setShowLocalLogin(true);
      } else {
        setStatus('Faça login para continuar');
        setShowLocalLogin(true);
        setIsRedirecting(false);
      }
    }
  }, [loading, user, navigate, nextUrl, isPreviewEnvironment]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Erro ao fazer login: ' + error.message);
      } else {
        toast.success('Login realizado com sucesso!');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          redirectAfterLogin();
        } else {
          navigate(nextUrl);
        }
      }
    } catch (err) {
      toast.error('Erro inesperado ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo with glow effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-xl">
            <DotLogo size={64} />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            DOT Operação
          </h1>
          <p className="text-muted-foreground text-sm">
            Plataforma de gestão de clientes
          </p>
        </div>

        {/* Loading indicator */}
        {!showLocalLogin && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              {isRedirecting && (
                <div className="absolute inset-0 animate-ping">
                  <div className="h-8 w-8 rounded-full bg-primary/30" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{status}</span>
              {isRedirecting && (
                <ArrowRight className="h-4 w-4 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Login form */}
        {showLocalLogin && (
          <div className="mt-4 w-full max-w-sm animate-fade-in">
            <div className="bg-card/50 backdrop-blur-sm px-6 py-6 rounded-xl border border-border/50 space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Faça login para acessar o sistema.
                </p>
              </div>

              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Portal info */}
        {isRedirecting && !isPreviewEnvironment && (
          <div className="mt-8 animate-fade-in bg-card/50 backdrop-blur-sm px-6 py-4 rounded-xl border border-border/50">
            <p className="text-sm text-center text-muted-foreground">
              Você será direcionado para o
            </p>
            <p className="text-sm text-center font-semibold text-primary mt-1">
              DOT Operação
            </p>
          </div>
        )}
      </div>

      {/* Bottom brand footer */}
      <div className="absolute bottom-8 text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <p className="text-xs text-muted-foreground/60">
          Powered by DOT Conceito
        </p>
      </div>
    </div>
  );
}
