import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/external-client';
import { Loader2 } from 'lucide-react';

export default function AuthHandoff() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Validando token...');

  useEffect(() => {
    // Limpar flags de loop ao entrar
    try {
      sessionStorage.removeItem('leaving_to_modules');
      sessionStorage.removeItem('leaving_to_modules_started_at');
    } catch {
      // ignore
    }

    const token = searchParams.get('token');
    console.log('AuthHandoff: token recebido =', token);

    if (!token) {
      setStatus('Token não fornecido. Voltando para o login...');
      setTimeout(() => navigate('/auth?error=missing_token', { replace: true }), 600);
      return;
    }

    const validateAndLogin = async () => {
      try {
        console.log('Chamando edge function...');

        const response = await fetch(
          'https://yoauzllgwcsrmvkwdcoa.supabase.co/functions/v1/validate-handoff-token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          }
        );

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok || !data.success) {
          setStatus('Token inválido ou expirado. Voltando para o login...');
          setTimeout(() => navigate('/auth', { replace: true }), 2000);
          return;
        }

        // Verificar usando token_hash
        if (data.token_hash) {
          console.log('Verificando OTP...');
          const { data: sessionData, error } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'magiclink',
          });

          console.log('VerifyOtp result:', { sessionData, error });

          if (!error && sessionData.session) {
            setStatus('Login bem sucedido! Verificando preferências...');

            // Buscar preferência de módulo do usuário
            const { data: profileData } = await supabase
              .from('profiles')
              .select('preferred_module')
              .eq('user_id', sessionData.session.user.id)
              .single();

            // Redireciona direto para o dashboard de Operação
            setStatus('Entrando no SKALA Operação...');
            navigate('/dashboard?view=csm', { replace: true });
            return;
          }
        }

        setStatus('Erro na autenticação. Voltando para o login...');
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      } catch (err) {
        console.error('Erro:', err);
        setStatus('Erro de conexão. Voltando para o login...');
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      }
    };

    validateAndLogin();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-lg text-foreground">{status}</div>
    </div>
  );
}
