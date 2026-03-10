import { Users, Settings, User, FolderOpen, FileText, Copy, CheckCircle, BarChart2, TrendingDown, DollarSign, Heart, Activity, Sparkles, ChevronRight, UserCheck, Sliders, AlertCircle, Star, MessageSquare, ClipboardList, Trophy, LogOut, TrendingUp, Shield, Briefcase, Columns3 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserProfilePopover } from "./UserProfilePopover"
import { useAuth } from "@/contexts/AuthContext"
import { useModulePermissions } from "@/hooks/useModulePermissions"
import { useInterfacePreferences } from "@/hooks/useInterfacePreferences"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useState, useMemo, useEffect } from "react"
// SSO config não usada diretamente - seleção de módulos agora é interna
// import { getCRMModuleSelectUrl, getCRMLoginUrl } from "@/config/sso"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface AppSidebarProps {
  activeView: 'users' | 'profile' | 'gestao-projetos' | 'gestao-contratos' | 'csm' | 'crm-ops' | 'cs' | 'cs-churn' | 'cs-metricas' | 'cs-nps' | 'cs-csat' | 'cs-cancelamento' | 'gestao-cancelamentos' | 'gestao-nps' | 'gestao-csat' | 'copy' | 'aprovacao' | 'analise-bench' | 'projetos-operacao' | 'projetos-clientes' | 'projetos-metricas' | 'performance' | 'preferencias-interface' | 'cases-sucesso' | 'pipelines' | 'dashboards'
  onViewChange: (view: 'users' | 'profile' | 'gestao-projetos' | 'gestao-contratos' | 'csm' | 'crm-ops' | 'cs' | 'cs-churn' | 'cs-metricas' | 'cs-nps' | 'cs-csat' | 'cs-cancelamento' | 'gestao-cancelamentos' | 'gestao-nps' | 'gestao-csat' | 'copy' | 'aprovacao' | 'analise-bench' | 'projetos-operacao' | 'projetos-clientes' | 'projetos-metricas' | 'performance' | 'preferencias-interface' | 'cases-sucesso' | 'pipelines' | 'dashboards') => void
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const { state, open, openMobile, isMobile } = useSidebar()
  const { profile, signOut } = useAuth()
  const { checkModulePermission, loading: permissionsLoading } = useModulePermissions()
  const { preferences } = useInterfacePreferences()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Debug log
  console.log('🎮 AppSidebar render - permissions loading:', permissionsLoading);
  console.log('🎮 AppSidebar render - profile:', profile?.name, profile?.role);
  
  // Item CSM para a seção CS
  const csmItem = {
    title: "CSM",
    icon: UserCheck,
    view: 'csm' as const,
    moduleName: 'csm',
    available: checkModulePermission('csm', 'view')
  }

  // Item CRM Ops
  const crmOpsItem = {
    title: "CRM Ops",
    icon: Briefcase,
    view: 'crm-ops' as const,
    moduleName: 'csm',
    available: checkModulePermission('csm', 'view')
  }

  // Check if any submenu item is active to keep section open
  const isCSFormulariosActive = ['/gerar-forms'].includes(location.pathname)
  const isCSATActive = activeView === 'cs-csat' || activeView === 'gestao-csat' || 
    ['/gestao-csat', '/pesquisa-csat-interno'].includes(location.pathname)
  const isNPSActive = activeView === 'cs-nps' || activeView === 'gestao-nps' || 
    ['/gestao-nps', '/pesquisa-nps-interno'].includes(location.pathname)
  const isChurnActive = activeView === 'cs-churn' || activeView === 'cs-cancelamento' || activeView === 'gestao-cancelamentos' ||
    ['/gestao-cancelamentos', '/solicitacao-cancelamento-interno'].includes(location.pathname)
  const isCriacaoActive = ['aprovacao', 'copy', 'analise-bench'].includes(activeView) || location.pathname === '/aprovacao'
  const isSettingsActive = ['users', 'profile', 'preferencias-interface'].includes(activeView)
  const isProjetosActive = ['projetos-clientes', 'projetos-metricas'].includes(activeView)
  
  // Start menus closed - only open when user clicks or navigates to an item inside
  const [openCSFormularios, setOpenCSFormularios] = useState(false)
  const [openCSAT, setOpenCSAT] = useState(false)
  const [openNPS, setOpenNPS] = useState(false)
  const [openChurn, setOpenChurn] = useState(false)
  const [openCriacao, setOpenCriacao] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [openProjetos, setOpenProjetos] = useState(false)
  
  
  // Auto-open sections when navigating to an item within them
  useEffect(() => {
    if (isCSFormulariosActive) setOpenCSFormularios(true)
  }, [isCSFormulariosActive])
  
  useEffect(() => {
    if (isCSATActive) setOpenCSAT(true)
  }, [isCSATActive])
  
  useEffect(() => {
    if (isNPSActive) setOpenNPS(true)
  }, [isNPSActive])

  useEffect(() => {
    if (isChurnActive) setOpenChurn(true)
  }, [isChurnActive])
  
  useEffect(() => {
    if (isCriacaoActive) setOpenCriacao(true)
  }, [isCriacaoActive])
  
  useEffect(() => {
    if (isSettingsActive) setOpenSettings(true)
  }, [isSettingsActive])
  
  useEffect(() => {
    if (isProjetosActive) setOpenProjetos(true)
  }, [isProjetosActive])

  // Definir submenus base para CS - Formulários
  const csFormulariosSubmenuBase = [
    {
      id: 'gerar-forms',
      title: "Gerar Forms",
      view: 'cs' as const,
      icon: FileText,
      route: '/gerar-forms',
    },
  ];

  // Submenu CHURN (agrupa dashboard, pipeline e formulário)
  const churnSubmenuBase = [
    {
      id: 'cs-churn',
      title: "Dashboard",
      view: 'cs-churn' as const,
      icon: TrendingDown,
    },
    {
      id: 'gestao-cancelamentos',
      title: "Pipeline",
      view: 'gestao-cancelamentos' as const,
      icon: ClipboardList,
      route: '/gestao-cancelamentos',
    },
    {
      id: 'cs-cancelamento',
      title: "Formulário",
      view: 'cs-cancelamento' as const,
      icon: FileText,
      route: '/solicitacao-cancelamento-interno',
    },
  ];

  // Submenu NPS (agrupa dashboard, pipeline e formulário)
  const npsSubmenuBase = [
    {
      id: 'cs-nps',
      title: "Dashboard",
      view: 'cs-nps' as const,
      icon: Heart,
    },
    {
      id: 'gestao-nps',
      title: "Pipeline",
      view: 'gestao-nps' as const,
      icon: ClipboardList,
      route: '/gestao-nps',
    },
    {
      id: 'pesquisa-nps',
      title: "Formulário",
      view: 'cs' as const,
      icon: FileText,
      route: '/pesquisa-nps-interno',
    },
  ];

  // Submenu CSAT (agrupa dashboard, pipeline e formulário)
  const csatSubmenuBase = [
    {
      id: 'cs-csat',
      title: "Dashboard",
      view: 'cs-csat' as const,
      icon: Star,
    },
    {
      id: 'gestao-csat',
      title: "Pipeline",
      view: 'gestao-csat' as const,
      icon: ClipboardList,
      route: '/gestao-csat',
    },
    {
      id: 'pesquisa-csat',
      title: "Formulário",
      view: 'cs' as const,
      icon: FileText,
      route: '/pesquisa-csat-interno',
    },
  ];

  const projetosSubmenuBase = [
    {
      id: 'projetos-clientes',
      title: "Clientes",
      view: 'projetos-clientes' as const,
      icon: Users,
    },
    {
      id: 'projetos-metricas',
      title: "Métricas Financeiras",
      view: 'projetos-metricas' as const,
      icon: DollarSign,
    }
  ];

  const criacaoSubmenuBase = [
    {
      id: 'aprovacao',
      title: "Aprovação",
      view: 'aprovacao' as const,
      icon: CheckCircle,
      route: '/aprovacao'
    },
    {
      id: 'copy',
      title: "Copy",
      view: 'copy' as const,
      icon: Copy,
    },
    {
      id: 'analise-bench',
      title: "Análise e Bench",
      view: 'analise-bench' as const,
      icon: BarChart2,
    }
  ];

  // Submenus para a seção CS
  const csFormulariosSubmenu = useMemo(() => csFormulariosSubmenuBase, []);
  const csatSubmenu = useMemo(() => csatSubmenuBase, []);
  const npsSubmenu = useMemo(() => npsSubmenuBase, []);
  const churnSubmenu = useMemo(() => churnSubmenuBase, []);

  const criacaoSubmenu = useMemo(() => {
    const order = preferences.sidebarMenuOrder.criacao_submenu;
    const orderedItems = order
      .map(id => criacaoSubmenuBase.find(item => item.id === id))
      .filter(Boolean) as typeof criacaoSubmenuBase;
    
    // Adicionar itens que não estão na ordem de preferências (novos itens)
    const newItems = criacaoSubmenuBase.filter(item => !order.includes(item.id));
    return [...orderedItems, ...newItems];
  }, [preferences.sidebarMenuOrder.criacao_submenu]);

  const projetosSubmenu = useMemo(() => {
    return projetosSubmenuBase;
  }, []);

  // Item Cases de Sucesso
  const casesSuccessoItem = {
    title: "Cases de sucesso",
    icon: Trophy,
    view: 'cases-sucesso' as const,
    moduleName: 'cs',
    available: !permissionsLoading && checkModulePermission('cs', 'view'),
    route: '/cases-sucesso'
  }

  // Itens da seção CS
  const csItems: any[] = []

  // Item Formulários (botão único, sem submenu - navega direto para Gerar Forms)
  const formulariosItem = {
    title: "Formulários",
    icon: FileText,
    view: 'cs' as const,
    route: '/gerar-forms',
    moduleName: 'cs',
    available: !permissionsLoading && checkModulePermission('cs', 'view'),
  }

  // Item Projetos (botão único, sem submenu)
  const projetosItem = {
    title: "Projetos",
    icon: FolderOpen,
    view: 'projetos-clientes' as const,
    moduleName: 'projetos',
    available: checkModulePermission('projetos', 'view'),
  }

  const operacaoItems = [
    {
      title: "Performance",
      icon: Activity,
      view: 'performance' as const,
      moduleName: 'performance',
      available: false, // Oculto temporariamente — restaurar: checkModulePermission('performance', 'view')
    },
    {
      title: "Criação",
      icon: Sparkles,
      moduleName: 'criacao',
      available: false, // Oculto temporariamente — restaurar condição original: !permissionsLoading && (checkModulePermission('copy', 'view') || checkModulePermission('aprovacao', 'view') || checkModulePermission('analise_bench', 'view'))
      hasSubmenu: true,
      isOpen: openCriacao,
      setIsOpen: setOpenCriacao,
      submenu: criacaoSubmenu
    }
  ]

  // Debug log dos itens
  console.log('🎮 Operação items availability:', {
    gestao_projetos: checkModulePermission('gestao_projetos', 'view'),
    gestao_contratos: checkModulePermission('gestao_contratos', 'view'),
    copy: checkModulePermission('copy', 'view'),
    analise_bench: checkModulePermission('analise_bench', 'view'),
    permissionsLoading
  });

  const profileItems = [
    {
      title: "Usuários",
      icon: Users,
      view: 'users' as const,
      moduleName: 'users',
      available: checkModulePermission('users', 'view')
    }
    // "Preferências da Interface" removido - toggle de tema agora fica no popover do usuário
  ]

  const isCollapsed = state === "collapsed"
  const shouldShowText = isMobile ? openMobile : open
  const shouldShowIcons = true // Ícones sempre visíveis


  const handleLogout = () => {
    // Adiciona animação de fade out suave
    document.body.style.transition = 'opacity 0.3s ease-out';
    document.body.style.opacity = '0';

    // Navega para a página de logout dedicada (que faz o signOut e redireciona)
    setTimeout(() => {
      document.body.style.opacity = '1';
      navigate('/logout');
    }, 150);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Sidebar side="left" collapsible="icon" className="border-r transition-all duration-300 ease-in-out">
      <SidebarHeader className={shouldShowText ? "p-4" : "py-4"}>
        {shouldShowText ? (
          <div className="flex items-center justify-between w-full px-4">
            <img 
              src="/lovable-uploads/7c396b9b-c7c8-460d-9683-1d9c1a265bd8.png"
              alt="DOT Logo"
              className="h-8 w-auto transition-all duration-500 ease-in-out"
              key="logo-expanded"
            />
            <SidebarTrigger className="touch-target" />
          </div>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-center h-8 hover:bg-transparent cursor-default p-2">
                  <img 
                    src="/dot-o-icon.png"
                    alt="DOT"
                    className="h-5 w-5 transition-all duration-500 ease-in-out"
                    key="logo-collapsed"
                    style={{ 
                      animation: 'spin 0.5s ease-in-out',
                    }}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-center h-8 p-2">
                  <SidebarTrigger />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>

        {/* Seção Customer Success */}
        {(csmItem.available || projetosItem.available) && (
          <SidebarGroup className="py-0">
            {/* Label oculta temporariamente */}
            <SidebarGroupContent>
              <SidebarMenu>
                {/* CSM como primeiro item */}
                {csmItem.available && (() => {
                  const isActive = activeView === csmItem.view
                  return (
                    <SidebarMenuItem key={csmItem.view}>
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => onViewChange(csmItem.view)}
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <csmItem.icon className="h-4 w-4 flex-shrink-0" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{csmItem.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => onViewChange(csmItem.view)}
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <csmItem.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">{csmItem.title}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })()}
                {/* CRM Ops - abaixo do CSM */}
                {crmOpsItem.available && (() => {
                  const isActive = activeView === crmOpsItem.view
                  return (
                    <SidebarMenuItem key={crmOpsItem.view}>
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => onViewChange(crmOpsItem.view)}
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <crmOpsItem.icon className="h-4 w-4 flex-shrink-0" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{crmOpsItem.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => onViewChange(crmOpsItem.view)}
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <crmOpsItem.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">{crmOpsItem.title}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })()}
                {/* Pipelines - Churn/CSAT/NPS pipelines */}
                {(!permissionsLoading && checkModulePermission('cs', 'view')) && (() => {
                  const isActive = activeView === 'pipelines'
                  return (
                    <SidebarMenuItem key="pipelines">
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => onViewChange('pipelines')}
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <Columns3 className="h-4 w-4 flex-shrink-0" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Pipelines</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => onViewChange('pipelines')}
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <Columns3 className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">Pipelines</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })()}
                {/* Dashboards - Churn/NPS/CSAT dashboards */}
                {(!permissionsLoading && checkModulePermission('cs', 'view')) && (() => {
                  const isActive = activeView === 'dashboards'
                  return (
                    <SidebarMenuItem key="dashboards">
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => onViewChange('dashboards')}
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <BarChart2 className="h-4 w-4 flex-shrink-0" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Dashboards</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => onViewChange('dashboards')}
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <BarChart2 className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">Dashboards</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })()}
                {/* Projetos - botão único */}
                {projetosItem.available && (() => {
                  const isActive = ['projetos-clientes', 'projetos-metricas', 'projetos-operacao'].includes(activeView)
                  return (
                    <SidebarMenuItem key="projetos">
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => onViewChange(projetosItem.view)}
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <projetosItem.icon className="h-4 w-4 flex-shrink-0" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{projetosItem.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => onViewChange(projetosItem.view)}
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <projetosItem.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">{projetosItem.title}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Seção Customer Experience */}
        {(csItems.some(item => item.available) || (!permissionsLoading && checkModulePermission('cs', 'view'))) && (
          <SidebarGroup className="py-0">
            {/* Label oculta temporariamente */}
            <SidebarGroupContent>
              <SidebarMenu>
                {csItems.map((item) => {
                  if (!item.available) return null
                  
                  // Se tem submenu
                  if (item.hasSubmenu && item.submenu) {
                    // Quando colapsado, mostrar popover com submenus
                    if (!shouldShowText) {
                      // Verificar se algum submenu está ativo
                      const hasActiveSubmenu = item.submenu.some(subItem => 
                        subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                      )
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <SidebarMenuButton 
                                    className={`w-full justify-center transition-all duration-200 relative ${
                                      hasActiveSubmenu ? 'bg-[#ec4a55] text-white' : ''
                                    }`}
                                  >
                                    <item.icon className="h-4 w-4" />
                                    <ChevronRight className="h-3 w-3 absolute bottom-0.5 right-0.5 opacity-70" />
                                  </SidebarMenuButton>
                                </PopoverTrigger>
                                <PopoverContent side="right" align="start" className="w-48 p-2 bg-background border z-50">
                                  <div className="space-y-1">
                                    <div className="px-2 py-1.5 text-xs font-semibold">{item.title}</div>
                                    {item.submenu.map((subItem) => {
                                      const isSubActive = subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                                      return (
                                        <button
                                          key={subItem.id || subItem.view}
                                          onClick={() => {
                                            if (subItem.route) {
                                              navigate(subItem.route)
                                            } else {
                                              onViewChange(subItem.view)
                                            }
                                          }}
                                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${
                                            isSubActive ? 'bg-[#ec4a55] text-white' : 'hover:bg-muted'
                                          }`}
                                        >
                                          <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                          <span>{subItem.title}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{item.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      )
                    }
                    
                    // Quando expandido, mostrar collapsible normal
                    const isSectionActive = item.title === "Csat" ? isCSATActive : item.title === "Nps" ? isNPSActive : item.title === "Churn" ? isChurnActive : false
                    
                    return (
                      <Collapsible
                        key={item.title}
                        open={item.isOpen}
                        onOpenChange={item.setIsOpen}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton 
                              className={`w-full justify-start transition-all duration-200 hover:bg-white/10 ${
                                isSectionActive ? 'bg-white/10 border-l-2 border-primary' : ''
                              }`}
                            >
                              <item.icon className={`h-4 w-4 flex-shrink-0 ${isSectionActive ? 'text-primary' : ''}`} />
                              <span className={`text-xs ${isSectionActive ? 'font-medium text-primary' : ''}`}>{item.title}</span>
                              <ChevronRight className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 ${isSectionActive ? 'text-primary' : 'text-sidebar-foreground/70'}`} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            <SidebarMenuSub>
                              {item.submenu.map((subItem) => {
                                const isSubActive = subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                                return (
                                  <SidebarMenuSubItem key={subItem.id || subItem.view}>
                                    {subItem.route ? (
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                        style={isSubActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                                      >
                                        <Link to={subItem.route}>
                                          <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                          <span className="text-xs">{subItem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    ) : (
                                      <SidebarMenuSubButton
                                        onClick={() => onViewChange(subItem.view)}
                                        isActive={isSubActive}
                                        className="transition-all duration-200"
                                        style={isSubActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-xs">{subItem.title}</span>
                                      </SidebarMenuSubButton>
                                    )}
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }
                  
                  return null
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Formulários - botão único que navega direto para Gerar Forms */}
        {formulariosItem.available && (() => {
          const isActive = location.pathname === '/gerar-forms'
          return (
            <div className="px-2 py-0.5">
              {!shouldShowText ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/gerar-forms'); }}
                      className={`flex items-center justify-center w-full rounded-md p-2 text-sm transition-all duration-200 ${
                        isActive ? 'text-white' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      style={isActive ? { backgroundColor: '#ec4a55' } : {}}
                    >
                      <formulariosItem.icon className="h-4 w-4 flex-shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{formulariosItem.title}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/gerar-forms'); }}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  style={isActive ? { backgroundColor: '#ec4a55' } : {}}
                >
                  <formulariosItem.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{formulariosItem.title}</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* Cases de Sucesso - após Formulários (isolado para não afetar Collapsible de Formulários) */}
        {casesSuccessoItem.available && (() => {
          const isActive = activeView === casesSuccessoItem.view || location.pathname === casesSuccessoItem.route
          return (
            <div className="px-2 py-0.5">
              {!shouldShowText ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenCSFormularios(false); navigate(casesSuccessoItem.route); }}
                      className={`flex items-center justify-center w-full rounded-md p-2 text-sm transition-all duration-200 ${
                        isActive ? 'text-white' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      style={isActive ? { backgroundColor: '#ec4a55' } : {}}
                    >
                      <casesSuccessoItem.icon className="h-4 w-4 flex-shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{casesSuccessoItem.title}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenCSFormularios(false); navigate(casesSuccessoItem.route); }}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  style={isActive ? { backgroundColor: '#ec4a55' } : {}}
                >
                  <casesSuccessoItem.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{casesSuccessoItem.title}</span>
                </button>
              )}
            </div>
          )
        })()}

        <SidebarGroup className="py-0">
          {/* Label oculta temporariamente */}
          <SidebarGroupContent>
            <SidebarMenu>
              {operacaoItems.map((item) => {
                if (!item.available) return null
                
                // Se tem submenu
                if (item.hasSubmenu && item.submenu) {
                  // Quando colapsado, mostrar popover com submenus
                  if (!shouldShowText) {
                    // Verificar se algum submenu está ativo
                    const hasActiveSubmenu = item.submenu.some(subItem => 
                      subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                    )
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Popover>
                              <PopoverTrigger asChild>
                                <SidebarMenuButton 
                                  className={`w-full justify-center transition-all duration-200 relative ${
                                    hasActiveSubmenu ? 'bg-[#ec4a55] text-white' : ''
                                  }`}
                                >
                                  <item.icon className="h-4 w-4" />
                                  <ChevronRight className="h-3 w-3 absolute bottom-0.5 right-0.5 opacity-70" />
                                </SidebarMenuButton>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="start" className="w-48 p-2 bg-background border z-50">
                                <div className="space-y-1">
                                  <div className="px-2 py-1.5 text-xs font-semibold">{item.title}</div>
                                  {item.submenu.map((subItem) => {
                                    const isSubActive = subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                                    return (
                                      <button
                                        key={subItem.view}
                                        onClick={() => {
                                          if (subItem.route) {
                                            navigate(subItem.route)
                                          } else {
                                            onViewChange(subItem.view)
                                          }
                                        }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${
                                          isSubActive ? 'bg-[#ec4a55] text-white' : 'hover:bg-muted'
                                        }`}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span>{subItem.title}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    )
                  }
                  
                  // Quando expandido, mostrar collapsible normal
                  const isSectionActive = item.title === "Criação" ? isCriacaoActive : item.title === "Projetos" ? isProjetosActive : false
                  
                  return (
                    <Collapsible
                      key={item.title}
                      open={item.isOpen}
                      onOpenChange={item.setIsOpen}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            className={`w-full justify-start transition-all duration-200 hover:bg-white/10 ${
                              isSectionActive ? 'bg-white/10 border-l-2 border-primary' : ''
                            }`}
                          >
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isSectionActive ? 'text-primary' : ''}`} />
                            <span className={`text-xs ${isSectionActive ? 'font-medium text-primary' : ''}`}>{item.title}</span>
                            <ChevronRight className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 ${isSectionActive ? 'text-primary' : 'text-sidebar-foreground/70'}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => {
                              const isSubActive = subItem.route ? location.pathname === subItem.route : activeView === subItem.view
                              return (
                                <SidebarMenuSubItem key={subItem.view}>
                                  {subItem.route ? (
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      style={isSubActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                                    >
                                      <Link to={subItem.route}>
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-xs">{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  ) : (
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className="transition-all duration-200 cursor-pointer"
                                      style={isSubActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                                    >
                                      <button onClick={() => onViewChange(subItem.view)} type="button">
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-xs">{subItem.title}</span>
                                      </button>
                                    </SidebarMenuSubButton>
                                  )}
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }
                
                // Se tem route, usar Link
                if ('route' in item && item.route) {
                  const isActive = location.pathname === item.route
                  return (
                    <SidebarMenuItem key={item.view}>
                      {!shouldShowText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className="w-full transition-all duration-200 justify-center"
                              style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                            >
                              <Link to={item.route}>
                                <item.icon className="h-4 w-4 flex-shrink-0" />
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="w-full transition-all duration-200 justify-start"
                          style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                        >
                          <Link to={item.route}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                }
                
                // Senão, usar onClick
                const isActive = activeView === item.view
                return (
                  <SidebarMenuItem key={item.view}>
                    {!shouldShowText ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => onViewChange(item.view)}
                            isActive={isActive}
                            className="w-full transition-all duration-200 justify-center"
                            style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton
                        onClick={() => onViewChange(item.view)}
                        isActive={isActive}
                        className="w-full transition-all duration-200 justify-start"
                        style={isActive ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

          {/* Botão Voltar aos Módulos e Usuários */}
          <div className="mt-auto pt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
              {/* Usuários - visível apenas para admin */}
                {profile?.effectiveRole === 'admin' && checkModulePermission('users', 'view') && (
                  <SidebarMenuItem>
                    {!shouldShowText ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => onViewChange('users')}
                            isActive={activeView === 'users'}
                            className="w-full justify-center transition-all duration-200"
                            style={activeView === 'users' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                          >
                            <Users className="h-4 w-4" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Usuários</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton
                        onClick={() => onViewChange('users')}
                        isActive={activeView === 'users'}
                        className="w-full justify-start transition-all duration-200"
                        style={activeView === 'users' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
                      >
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">Usuários</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )}

                {/* Botão Sair */}
                <SidebarMenuItem>
                  {!shouldShowText ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={handleLogout}
                          className="w-full justify-center transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Sair</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="w-full justify-start transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">Sair</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          </div>
      </SidebarContent>

      <SidebarFooter className={shouldShowText ? "p-4" : "py-4"}>
        <UserProfilePopover onLogout={handleLogout}>
          {shouldShowText ? (
            <div className="flex items-center gap-3 p-3 transition-all duration-200 cursor-pointer hover:bg-accent rounded-md">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {profile?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{profile?.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {profile?.email}
                </span>
              </div>
            </div>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-center h-8 p-2 cursor-pointer">
                  <Avatar className="h-6 w-6 min-h-6 min-w-6 flex-shrink-0">
                    <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                      {profile?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </UserProfilePopover>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  )
}