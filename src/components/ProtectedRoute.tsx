import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const isProductionDomain = window.location.host.includes('dotconceito.com');
  const isPreviewEnvironment = !isProductionDomain && (
    window.self !== window.top ||
    window.location.host.includes('id-preview--') ||
    window.location.host.includes('lovable.app')
  );

  // In preview environment, skip all auth checks
  if (isPreviewEnvironment) {
    return <>{children}</>;
  }

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        const currentPath = window.location.pathname + window.location.search;
        navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      if (profile && !profile.is_active) {
        console.warn('Usuário desativado tentou acessar:', profile.email);
        navigate('/auth');
        return;
      }

      if (requireAdmin) {
        const isGlobalAdmin = profile?.is_global_admin || false;
        const effectiveRole = profile?.role;
        if (!isGlobalAdmin && effectiveRole !== 'admin') {
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

  if (!user) return null;
  if (profile && !profile.is_active) return null;

  if (requireAdmin) {
    const isGlobalAdmin = profile?.is_global_admin || false;
    const effectiveRole = profile?.role;
    if (!isGlobalAdmin && effectiveRole !== 'admin') return null;
  }

  return <>{children}</>;
};
