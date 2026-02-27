import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface PublicPageWithSidebarProps {
  children: React.ReactNode;
}

// Mapeamento de views para rotas
const viewToRouteMap: Record<string, string> = {
  'dashboard': '/dashboard',
  'crm': '/dashboard',
  'csm': '/dashboard',
  'cs-churn': '/dashboard',
  'cs-metricas': '/dashboard',
  'cs-nps': '/dashboard',
  'cs-csat': '/dashboard',
  'cs-cancelamento': '/solicitacao-cancelamento-interno',
  'gestao-cancelamentos': '/gestao-cancelamentos',
  'gestao-nps': '/gestao-nps',
  'gestao-csat': '/gestao-csat',
  'copy': '/dashboard',
  'aprovacao': '/aprovacao',
  'analise-bench': '/dashboard',
  'wallet': '/dashboard',
  'lista-espera': '/dashboard',
  'gestao-projetos': '/dashboard',
  'gestao-contratos': '/dashboard',
  'projetos-operacao': '/dashboard',
  'performance': '/dashboard',
  'users': '/dashboard',
  'profile': '/dashboard',
  'preferencias-interface': '/dashboard'
};

export function PublicPageWithSidebar({ children }: PublicPageWithSidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<any>(() => {
    // Detectar view inicial baseado na rota atual
    if (location.pathname.includes('gestao-cancelamentos')) return 'gestao-cancelamentos';
    if (location.pathname.includes('gestao-nps')) return 'gestao-nps';
    if (location.pathname.includes('gestao-csat')) return 'gestao-csat';
    if (location.pathname.includes('solicitacao-cancelamento')) return 'cs-cancelamento';
    if (location.pathname.includes('cases-sucesso')) return 'cases-sucesso';
    if (location.pathname.includes('pesquisa-csat')) return 'cs-csat';
    if (location.pathname.includes('pesquisa-nps')) return 'cs-nps';
    if (location.pathname.includes('gerar-forms')) return 'gerar-forms';
    return 'profile'; // fallback neutro que não abre nenhum submenu
  });

  // Detectar qual página está ativa baseado na rota
  useEffect(() => {
    if (location.pathname.includes('gestao-cancelamentos')) {
      setActiveView('gestao-cancelamentos');
    } else if (location.pathname.includes('gestao-nps')) {
      setActiveView('gestao-nps');
    } else if (location.pathname.includes('gestao-csat')) {
      setActiveView('gestao-csat');
    } else if (location.pathname.includes('solicitacao-cancelamento')) {
      setActiveView('cs-cancelamento');
    } else if (location.pathname.includes('cases-sucesso')) {
      setActiveView('cases-sucesso');
    } else if (location.pathname.includes('pesquisa-csat')) {
      setActiveView('cs-csat');
    } else if (location.pathname.includes('pesquisa-nps')) {
      setActiveView('cs-nps');
    } else if (location.pathname.includes('gerar-forms')) {
      setActiveView('gerar-forms');
    }
  }, [location.pathname]);

  // Handler para mudança de view que navega corretamente
  const handleViewChange = (view: any) => {
    const route = viewToRouteMap[view];
    if (route) {
      if (route === '/dashboard') {
        // Para views que ficam dentro do dashboard, navega com state
        navigate(route, { state: { view } });
      } else {
        // Para rotas específicas, navega diretamente
        navigate(route);
      }
    }
  };

  // Se não estiver autenticado, renderiza sem sidebar
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Se estiver autenticado, renderiza com sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex w-full">
        <MobileSidebarTrigger />
        <AppSidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
        />
        <div className="flex-1 flex h-svh min-h-0 flex-col min-w-0">
          <SidebarInset className="flex-1 min-h-0">
            <main className="h-full">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

