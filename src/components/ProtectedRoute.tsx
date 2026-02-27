import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {

        // Preservar a rota original para retornar após login
        const currentPath = window.location.pathname + window.location.search;

        navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      // CRÍTICO: Verificar se usuário está ativo
      if (profile && !profile.is_active) {
        console.warn('Usuário desativado tentou acessar:', profile.email);
        navigate('/auth');
        return;
      }

      if (requireAdmin) {
        // Verificar custom_role base_role ou role direto
        const effectiveRole = profile?.custom_roles?.base_role || profile?.role;
        if (effectiveRole !== 'admin') {
          navigate('/dashboard');
          return;
        }
      }
    }
  }, [user, profile, loading, navigate, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // CRÍTICO: Bloquear acesso se usuário está desativado
  if (profile && !profile.is_active) {
    return null;
  }

  if (requireAdmin) {
    const effectiveRole = profile?.custom_roles?.base_role || profile?.role;
    if (effectiveRole !== 'admin') {
      return null;
    }
  }

  return <>{children}</>;
};
