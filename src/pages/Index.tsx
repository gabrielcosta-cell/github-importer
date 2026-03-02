import { useState, useEffect } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { CommandPalette } from "@/components/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useInterfacePreferences, ViewType } from "@/hooks/useInterfacePreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserManagement } from "@/components/UserManagement";
import { UserProfile } from "@/components/UserProfile";
import { RoleManagement } from "@/components/RoleManagement";
import { CSMKanban } from "@/components/CSMKanban";
import { CRMOpsKanban } from "@/components/CRMOpsKanban";
import { GestaoProjetosOperacao } from "@/components/GestaoProjetosOperacao";
import { GestaoContratos } from "@/components/GestaoContratos";
import { ProjetosView } from "@/components/ProjetosView";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import { CopyForm } from "@/components/CopyForm";

import { AnaliseBench } from "@/components/AnaliseBench";
import { CustomerSuccessDashboard } from "@/components/CustomerSuccessDashboard";
import { CSATMetricsDashboard } from "@/components/CSATMetricsDashboard";
import { FinancialMetrics } from "@/components/FinancialMetrics";
import { ChurnMetrics } from "@/components/ChurnMetrics";
import { InterfacePreferences } from "@/components/InterfacePreferences";
import "@/utils/updateCategorias";

type ActiveViewType = 'users' | 'profile' | 'gestao-projetos' | 'gestao-contratos' | 'csm' | 'crm-ops' | 'cs' | 'cs-churn' | 'cs-metricas' | 'cs-nps' | 'cs-csat' | 'copy' | 'aprovacao' | 'analise-bench' | 'projetos-operacao' | 'projetos-clientes' | 'projetos-metricas' | 'performance' | 'preferencias-interface' | 'gestao-nps' | 'gestao-csat' | 'cs-cancelamento' | 'gestao-cancelamentos';

const VALID_VIEWS: ActiveViewType[] = ['users', 'profile', 'gestao-projetos', 'gestao-contratos', 'csm', 'crm-ops', 'cs', 'cs-churn', 'cs-metricas', 'cs-nps', 'cs-csat', 'copy', 'aprovacao', 'analise-bench', 'projetos-operacao', 'projetos-clientes', 'projetos-metricas', 'performance', 'preferencias-interface', 'gestao-nps', 'gestao-csat', 'cs-cancelamento', 'gestao-cancelamentos'];

const Index = () => {
  const { profile, signOut } = useAuth();
  const { checkModulePermission, loading: permissionsLoading } = useModulePermissions();
  const { preferences } = useInterfacePreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Obter view da URL ou usar CSM como padrão para todos
  const getInitialView = (): ActiveViewType => {
    const viewFromUrl = searchParams.get('view') as ActiveViewType;
    if (viewFromUrl && VALID_VIEWS.includes(viewFromUrl)) {
      return viewFromUrl;
    }
    // CSM é o padrão para todos os usuários
    return 'csm';
  };

  const [activeView, setActiveViewState] = useState<ActiveViewType>(getInitialView);

  // Função para atualizar view e URL simultaneamente
  const setActiveView = (view: ActiveViewType) => {
    setActiveViewState(view);
    setSearchParams({ view });
  };

  // Sincronizar URL com estado quando URL muda externamente
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as ActiveViewType;
    if (viewFromUrl && VALID_VIEWS.includes(viewFromUrl) && viewFromUrl !== activeView) {
      setActiveViewState(viewFromUrl);
    }
  }, [searchParams]);

  // State para abrir card específico no CSM
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [openCardKey, setOpenCardKey] = useState(0);

  // Handle navigation from other pages with view state
  useEffect(() => {
    if (location.state?.view) {
      setActiveView(location.state.view);
      
      // Se tiver cardId, definir para abrir o card
      if (location.state?.cardId) {
        setOpenCardId(location.state.cardId);
        setOpenCardKey(prev => prev + 1); // Força re-trigger do efeito
      }
      
      // Limpar o state para evitar re-triggers
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    preferences.keyboardShortcutsEnabled,
    () => setCommandPaletteOpen(true),
    (view) => setActiveView(view as any)
  );

  // Definir view inicial baseada nas permissões do usuário
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as ActiveViewType | null;
    const hasValidViewInUrl = !!(viewFromUrl && VALID_VIEWS.includes(viewFromUrl));

    if (!profile) return;

    // Regra: não-admin nunca deve cair em "Usuários" via URL
    if (profile.effectiveRole !== 'admin' && viewFromUrl === 'users') {
      setActiveView('csm');
      return;
    }

    // Enquanto carrega permissões, não forçar redirects baseados em permissões
    if (profile.effectiveRole !== 'admin' && permissionsLoading) {
      return;
    }

    // Se não há view válida na URL, direcionar para CSM (ou primeiro disponível)
    if (profile.effectiveRole !== 'admin' && !hasValidViewInUrl) {
      if (checkModulePermission('csm', 'view')) {
        setActiveView('csm');
        return;
      }

      if (checkModulePermission('gestao_projetos', 'view')) {
        setActiveView('gestao-projetos');
      } else if (checkModulePermission('gestao_contratos', 'view')) {
        setActiveView('gestao-contratos');
      } else if (checkModulePermission('projetos', 'view')) {
        setActiveView('projetos-operacao');
      } else if (checkModulePermission('cs', 'view')) {
        setActiveView('cs');
      } else if (checkModulePermission('copy', 'view')) {
        setActiveView('copy');
      } else if (checkModulePermission('analise_bench', 'view')) {
        setActiveView('analise-bench');
      } else {
        setActiveView('profile');
      }
    }
  }, [profile, permissionsLoading, searchParams, checkModulePermission]);

  // Verificar se o usuário tem permissão para mudar para a view solicitada
  const handleViewChange = (newView: any) => {
    // Redirecionar para páginas com rotas próprias
    if (newView === 'cs-cancelamento') {
      window.location.href = '/solicitacao-cancelamento-interno';
      return;
    }
    if (newView === 'gestao-cancelamentos') {
      window.location.href = '/gestao-cancelamentos';
      return;
    }
    
    const moduleMap = {
      'users': 'users', 
      'profile': 'profile',
      'gestao-projetos': 'gestao_projetos',
      'gestao-contratos': 'gestao_contratos',
      'csm': 'csm',
      'crm-ops': 'csm',
      'cs': 'cs',
      'cs-churn': 'cs',
      'cs-metricas': 'cs',
      'cs-nps': 'cs',
      'cs-csat': 'cs',
      'copy': 'copy',
      'aprovacao': 'aprovacao',
      'analise-bench': 'analise_bench',
      'projetos-operacao': 'projetos',
      'projetos-clientes': 'projetos',
      'projetos-metricas': 'projetos',
      'performance': 'performance',
      'preferencias-interface': 'profile',
    } as const;
    
    const moduleName = moduleMap[newView as keyof typeof moduleMap];
    
    // Admin sempre pode acessar tudo
    if (profile?.effectiveRole === 'admin' || (moduleName && checkModulePermission(moduleName, 'view'))) {
      setActiveView(newView);
    } else if (permissionsLoading) {
      // enquanto carrega permissões, permite a navegação e o conteúdo cuidará do loading
      setActiveView(newView);
    } else {
      toast("Acesso negado", {
        description: "Você não tem permissão para acessar este módulo.",
        position: "top-center",
      });
    }
  };

  const renderContent = () => {
    // Mapear views para nomes de módulos
    const moduleMap = {
      'users': 'users', 
      'profile': 'profile',
      'projetos': 'projetos',
      'gestao-projetos': 'gestao_projetos',
      'gestao-contratos': 'gestao_contratos',
      'csm': 'csm',
      'crm-ops': 'csm',
      'cs': 'cs',
      'cs-churn': 'cs',
      'cs-metricas': 'cs',
      'cs-nps': 'cs',
      'cs-csat': 'cs',
      'copy': 'copy',
      'aprovacao': 'aprovacao',
      'analise-bench': 'analise_bench',
      'projetos-operacao': 'projetos',
      'projetos-clientes': 'projetos',
      'projetos-metricas': 'projetos',
      'performance': 'performance',
      'preferencias-interface': 'preferencias-interface',
    };
    
    const currentModule = moduleMap[activeView as keyof typeof moduleMap];
    
    // Enquanto carrega permissões, mostrar loading (para não bloquear indevidamente)
    if (profile?.effectiveRole !== 'admin' && permissionsLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando permissões...</p>
        </div>
      );
    }
    
    // Verificar permissão (admin sempre tem acesso)
    if (profile?.effectiveRole !== 'admin' && !checkModulePermission(currentModule, 'view')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-muted-foreground">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-md">
            Você não tem permissão para acessar este módulo. Entre em contato com o administrador se precisar de acesso.
          </p>
          <button 
            onClick={() => {
              // Redirecionar para o primeiro módulo com acesso
              if (checkModulePermission('csm', 'view')) {
                setActiveView('csm');
              } else if (checkModulePermission('gestao_projetos', 'view')) {
                setActiveView('gestao-projetos');
              } else if (checkModulePermission('gestao_contratos', 'view')) {
                setActiveView('gestao-contratos');
              } else if (checkModulePermission('profile', 'view')) {
                setActiveView('profile');
              } else if (checkModulePermission('projetos', 'view')) {
                setActiveView('projetos-operacao');
              } else if (checkModulePermission('cs', 'view')) {
                setActiveView('cs');
              } else if (checkModulePermission('copy', 'view')) {
                setActiveView('copy');
              } else if (checkModulePermission('analise_bench', 'view')) {
                setActiveView('analise-bench');
              } else if (checkModulePermission('users', 'view')) {
                setActiveView('users');
              } else {
                setActiveView('profile'); // fallback
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Ir para módulo disponível
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'csm':
        return <CSMKanban openCardId={openCardId} openCardKey={openCardKey} />
      case 'crm-ops':
        return <CRMOpsKanban />
      case 'gestao-projetos':
        return <GestaoProjetosOperacao />
      case 'gestao-contratos':
        return <GestaoContratos />
      case 'cs':
      case 'cs-nps':
        return <CustomerSuccessDashboard />
      case 'cs-csat':
        return <CSATMetricsDashboard />
      case 'cs-churn':
        return <ChurnMetrics />
      case 'cs-metricas':
        return <FinancialMetrics />
      case 'copy':
        return <CopyForm />
      case 'analise-bench':
        return <AnaliseBench />
      case 'users':
        return <UserManagement />
      case 'projetos-operacao':
      case 'projetos-clientes':
        return <ProjetosView initialTab="clientes" />
      case 'projetos-metricas':
        return <ProjetosView initialTab="metricas" />
      case 'performance':
        return <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Performance</h2>
          <p className="text-muted-foreground">Dashboard de Performance em desenvolvimento...</p>
        </div>
      case 'profile':
        return <UserProfile />
      case 'preferencias-interface':
        return <InterfacePreferences />
      default:
        return <CSMKanban openCardId={openCardId} openCardKey={openCardKey} />
    }
  }

  return (
    <>
      <CommandPalette 
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleViewChange}
      />
      <SidebarProvider defaultOpen={true}>
        <div className={(activeView === 'csm' || activeView === 'crm-ops') ? 'fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30 flex w-full' : 'min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex w-full'}>
          <AppSidebar 
            activeView={activeView as any}
            onViewChange={handleViewChange}
          />
          <div className="flex-1 flex h-svh min-h-0 flex-col min-w-0">
            {activeView !== 'csm' && activeView !== 'crm-ops' && <MobileSidebarTrigger />}
            <SidebarInset className="flex-1 min-h-0">
              <main className={(activeView === 'csm' || activeView === 'crm-ops') ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'container py-6 md:py-8 space-y-6 md:space-y-8'}>
                {renderContent()}
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default Index;
