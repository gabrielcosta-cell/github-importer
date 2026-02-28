import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DotLogo } from '@/components/DotLogo';
import { Loader2, ArrowRight, Mail, Chrome } from 'lucide-react';
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

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth?next=' + encodeURIComponent(nextUrl),
          queryParams: {
            hd: 'dotconceito.com',
          },
        },
      });
      if (error) {
        toast.error('Erro ao iniciar login com Google: ' + error.message);
      }
    } catch {
      toast.error('Erro inesperado ao fazer login com Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

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

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card/50 px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
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
