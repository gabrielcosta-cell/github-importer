import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DotLogo } from '@/components/DotLogo';
import { Loader2 } from 'lucide-react';

export default function Logout() {
  const navigate = useNavigate();
  const loggedOutRef = useRef(false);
  const [status, setStatus] = useState<'logging_out' | 'done' | 'error'>('logging_out');
  const [details, setDetails] = useState<string>('Encerrando sua sessão...');

  const hardClearAuthStorage = () => {
    // Supabase salva tokens em: sb-<project-ref>-auth-token
    // Em casos raros (iframe/storage/refresh), um signOut pode não limpar o storage corretamente.
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const performLogout = async () => {
      if (loggedOutRef.current) return;
      loggedOutRef.current = true;

      try {
        setStatus('logging_out');
        setDetails('Encerrando sua sessão...');

        // 1) Tenta revogar globalmente (quando possível)
        // 2) Se falhar, ainda assim garante limpeza local
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch {
          await supabase.auth.signOut({ scope: 'local' });
        }

        // Limpeza extra do storage para garantir que não haja restauração automática
        hardClearAuthStorage();

        // Confirma se a sessão realmente foi removida
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          // Último recurso: limpar novamente e seguir para /auth
          hardClearAuthStorage();
        }

        setStatus('done');
        setDetails('Sessão encerrada. Redirecionando...');
      } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
        setStatus('error');
        setDetails('Não foi possível encerrar a sessão automaticamente. Redirecionando para o login...');

        // Mesmo em erro, tentamos impedir restauração por storage
        hardClearAuthStorage();
      }

      // Aguarda um momento para garantir que o estado foi limpo
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Redireciona para a página de autenticação
      navigate('/auth', { replace: true });
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-xl">
            <DotLogo size={48} />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'logging_out' ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-primary/20" />
          )}
          <span className="text-muted-foreground">{details}</span>
        </div>
      </div>
    </div>
  );
}
