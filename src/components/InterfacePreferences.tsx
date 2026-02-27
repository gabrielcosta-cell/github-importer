import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Keyboard, Home, GripVertical, Info, RotateCcw, UserCheck, FolderCheck, TrendingDown, DollarSign, Heart, FolderOpen, Activity, CheckCircle, Copy, BarChart2, AlertCircle, FileText } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useInterfacePreferences, ViewType } from "@/hooks/useInterfacePreferences";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SidebarPreview } from "@/components/SidebarPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border"
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
};

export const InterfacePreferences = () => {
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences, DEFAULT_PREFERENCES } = useInterfacePreferences();
  const { checkModulePermission } = useModulePermissions();
  const { toast } = useToast();
  
  // Estado local para as mudanças pendentes
  const [pendingMenuOrder, setPendingMenuOrder] = useState(preferences.sidebarMenuOrder);
  const [pendingDefaultPage, setPendingDefaultPage] = useState(preferences.defaultPage);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mapa de ícones para cada página (mesmos do menu lateral)
  const pageIcons: Record<ViewType, React.ComponentType<{ className?: string }>> = {
    'csm': UserCheck,
    'cs-churn': TrendingDown,
    'cs-metricas': DollarSign,
    'cs-nps': Heart,
    'cs-csat': Heart,
    'cs-cancelamento': AlertCircle,
    'gestao-cancelamentos': FileText,
    'projetos-operacao': FolderOpen,
    'gestao-projetos': FolderCheck,
    'gestao-contratos': FileText,
    'performance': Activity,
    'aprovacao': CheckCircle,
    'copy': Copy,
    'analise-bench': BarChart2,
    'users': UserCheck,
    'profile': UserCheck,
    'preferencias-interface': Monitor,
  };

  const allPages: { value: ViewType; label: string; moduleName?: string }[] = [
    { value: 'csm', label: 'CSM', moduleName: 'csm' },
    { value: 'cs-churn', label: 'CS - Churn', moduleName: 'cs' },
    { value: 'cs-metricas', label: 'CS - Métricas Financeiras', moduleName: 'cs' },
    { value: 'cs-nps', label: 'CS - NPS', moduleName: 'cs' },
    { value: 'cs-csat', label: 'CS - CSAT', moduleName: 'cs' },
    { value: 'cs-cancelamento', label: 'CS - Solicitação de Cancelamento', moduleName: 'cs' },
    { value: 'gestao-cancelamentos', label: 'CS - Gestão de Cancelamentos', moduleName: 'cs' },
    { value: 'projetos-operacao', label: 'Projetos', moduleName: 'projetos' },
    { value: 'gestao-projetos', label: 'Gestão de Projetos', moduleName: 'gestao_projetos' },
    { value: 'gestao-contratos', label: 'Gestão de Contratos', moduleName: 'gestao_contratos' },
    { value: 'performance', label: 'Performance', moduleName: 'performance' },
    { value: 'aprovacao', label: 'Criação - Aprovação', moduleName: 'aprovacao' },
    { value: 'copy', label: 'Criação - Copy', moduleName: 'copy' },
    { value: 'analise-bench', label: 'Criação - Análise e Bench', moduleName: 'analise_bench' },
  ];
  
  const availablePages = allPages.filter(page => !page.moduleName || checkModulePermission(page.moduleName, 'view'));

  const submenuLabels: Record<string, string> = {
    'cs-churn': 'Churn',
    'cs-metricas': 'Métricas Financeiras',
    'cs-nps': 'NPS',
    'cs-csat': 'CSAT',
    'cs-cancelamento': 'Solicitação de Cancelamento',
    'gestao-cancelamentos': 'Gestão de Cancelamentos',
    'aprovacao': 'Aprovação',
    'copy': 'Copy',
    'analise-bench': 'Análise e Bench'
  };

  const mainMenuLabels: Record<string, string> = {
    'csm': 'CSM',
    'projetos-operacao': 'Projetos',
    'gestao-projetos': 'Gestão de Projetos',
    'gestao-contratos': 'Gestão de Contratos',
    'performance': 'Performance'
  };

  // Mapeamento de IDs de menu para nomes de módulos no sistema de permissões
  const menuToModuleMap: Record<string, string> = {
    'csm': 'csm',
    'projetos-operacao': 'gestao_projetos',
    'gestao-projetos': 'gestao_projetos',
    'gestao-contratos': 'gestao_contratos',
    'performance': 'performance',
    'cs-churn': 'cs_churn',
    'cs-metricas': 'cs_metricas_financeiras',
    'cs-nps': 'cs_nps',
    'cs-csat': 'cs_csat',
    'cs-cancelamento': 'cs_formularios',
    'gestao-cancelamentos': 'cs_formularios',
    'aprovacao': 'aprovacao',
    'copy': 'copy',
    'analise-bench': 'analise_bench'
  };

  // Filtrar menus principais com base nas permissões
  const filteredMainMenu = pendingMenuOrder.main_menu.filter(menuId => {
    const moduleName = menuToModuleMap[menuId];
    return moduleName ? checkModulePermission(moduleName, 'view') : true;
  });

  // Filtrar submenu CS com base nas permissões
  const filteredCSSubmenu = pendingMenuOrder.cs_submenu.filter(menuId => {
    const moduleName = menuToModuleMap[menuId];
    return moduleName ? checkModulePermission(moduleName, 'view') : true;
  });

  // Filtrar submenu Criação com base nas permissões
  const filteredCriacaoSubmenu = pendingMenuOrder.criacao_submenu.filter(menuId => {
    const moduleName = menuToModuleMap[menuId];
    return moduleName ? checkModulePermission(moduleName, 'view') : true;
  });

  const handleDragEndCS = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredCSSubmenu.indexOf(active.id as string);
      const newIndex = filteredCSSubmenu.indexOf(over.id as string);
      const newFilteredOrder = arrayMove(filteredCSSubmenu, oldIndex, newIndex);
      
      // Reconstruir a ordem completa mantendo itens sem permissão em suas posições
      const newFullOrder = pendingMenuOrder.cs_submenu.filter(id => !filteredCSSubmenu.includes(id));
      newFilteredOrder.forEach((id, idx) => {
        newFullOrder.splice(idx, 0, id);
      });
      
      setPendingMenuOrder({
        ...pendingMenuOrder,
        cs_submenu: newFilteredOrder
      });
      setHasChanges(true);
    }
  };

  const handleDragEndCriacao = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredCriacaoSubmenu.indexOf(active.id as string);
      const newIndex = filteredCriacaoSubmenu.indexOf(over.id as string);
      const newFilteredOrder = arrayMove(filteredCriacaoSubmenu, oldIndex, newIndex);
      
      setPendingMenuOrder({
        ...pendingMenuOrder,
        criacao_submenu: newFilteredOrder
      });
      setHasChanges(true);
    }
  };

  const handleDragEndMain = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredMainMenu.indexOf(active.id as string);
      const newIndex = filteredMainMenu.indexOf(over.id as string);
      const newFilteredOrder = arrayMove(filteredMainMenu, oldIndex, newIndex);
      
      setPendingMenuOrder({
        ...pendingMenuOrder,
        main_menu: newFilteredOrder
      });
      setHasChanges(true);
    }
  };

  const handleDefaultPageChange = (value: ViewType) => {
    setPendingDefaultPage(value);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    updatePreference('sidebarMenuOrder', pendingMenuOrder);
    updatePreference('defaultPage', pendingDefaultPage);
    setHasChanges(false);
    toast({
      title: "Preferências salvas",
      description: "Suas alterações foram aplicadas com sucesso!",
    });
  };

  const handleResetPreferences = () => {
    resetPreferences();
    setPendingMenuOrder(DEFAULT_PREFERENCES.sidebarMenuOrder);
    setPendingDefaultPage(DEFAULT_PREFERENCES.defaultPage);
    setHasChanges(false);
    toast({
      title: "Preferências resetadas",
      description: "Todas as configurações foram restauradas para os valores padrão.",
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="p-6 space-y-6 max-w-7xl">
      <div className="space-y-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preferências da Interface</h1>
          <p className="text-muted-foreground">
            Personalize a aparência do Pipedrive e o comportamento de navegação. Essas configurações são pessoais e não afetam outros usuários na conta da sua empresa.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="whitespace-nowrap">Resetar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar todas as preferências?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá restaurar todas as configurações para os valores padrão. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetPreferences}>
                Resetar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="theme">Tema</Label>
            <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Claro</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Escuro</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <Card>
        <CardHeader>
          <CardTitle>Navegação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="keyboard-shortcuts">Atalhos do teclado</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center justify-center hover:opacity-70 transition-opacity">
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Com essa opção habilitada, você pode navegar entre recursos e usar ações de edição rápida usando seu teclado.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <Switch
              id="keyboard-shortcuts"
              checked={preferences.keyboardShortcutsEnabled}
              onCheckedChange={(checked) => updatePreference('keyboardShortcutsEnabled', checked)}
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="default-page">Página inicial padrão</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center justify-center hover:opacity-70 transition-opacity">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>A página inicial padrão abre na primeira vez que você inicia o sistema. Você também pode acessá-la clicando no logotipo do sistema no canto superior esquerdo.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select 
              value={pendingDefaultPage} 
              onValueChange={handleDefaultPageChange}
            >
              <SelectTrigger id="default-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePages.map(page => {
                  const Icon = pageIcons[page.value];
                  return (
                    <SelectItem key={page.value} value={page.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{page.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side - Ordering controls */}
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-1">Reordenar menus</p>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte os itens para reordená-los conforme sua preferência.
                </p>
              </div>

              {/* Main Menu Order */}
              {filteredMainMenu.length > 0 && (
                <div className="space-y-3">
                  <Label>Ordem dos menus principais</Label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndMain}
                  >
                    <SortableContext
                      items={filteredMainMenu}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {filteredMainMenu.map((itemId) => (
                          <SortableItem key={itemId} id={itemId}>
                            <span className="text-sm">{mainMenuLabels[itemId]}</span>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* CS Submenu Order */}
              {filteredCSSubmenu.length > 0 && (
                <div className="space-y-3">
                  <Label>Ordem do submenu Customer Experience</Label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndCS}
                  >
                    <SortableContext
                      items={filteredCSSubmenu}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {filteredCSSubmenu.map((itemId) => (
                          <SortableItem key={itemId} id={itemId}>
                            <span className="text-sm">{submenuLabels[itemId]}</span>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Criação Submenu Order */}
              {filteredCriacaoSubmenu.length > 0 && (
                <div className="space-y-3">
                  <Label>Ordem do submenu Operação (Criação)</Label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndCriacao}
                  >
                    <SortableContext
                      items={filteredCriacaoSubmenu}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {filteredCriacaoSubmenu.map((itemId) => (
                          <SortableItem key={itemId} id={itemId}>
                            <span className="text-sm">{submenuLabels[itemId]}</span>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={!hasChanges}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Salvar alterações
                </Button>
              </div>
            </div>

            {/* Right side - Preview */}
            <div className="space-y-3">
              <Label>Preview em tempo real</Label>
              <SidebarPreview 
                mainMenuOrder={pendingMenuOrder.main_menu}
                csSubmenuOrder={pendingMenuOrder.cs_submenu}
                criacaoSubmenuOrder={pendingMenuOrder.criacao_submenu}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};
