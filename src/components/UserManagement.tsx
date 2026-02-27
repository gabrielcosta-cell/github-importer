import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserPermissions } from '@/components/UserPermissions';
import { UserPlus, Trash2, Edit, Shield, User, UserCheck, ChevronDown, ChevronRight, Settings, Users, Plus, Upload, Camera, DollarSign, BarChart3, FolderCheck, Wallet, Trophy, BarChart2, ClipboardList, FileText, FolderOpen, Activity, Sparkles, Eye, PenLine, Trash, PlusCircle, Crown, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  base_role: string;
}

interface Module {
  id: string;
  name: string;
  display_name: string;
}

interface RolePermission {
  module_id: string;
  module_name: string;
  display_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Estrutura do menu para organizar permissões
interface MenuModule {
  name: string;
  displayName: string;
  icon: React.ElementType;
  submodules?: {
    name: string;
    displayName: string;
    icon: React.ElementType;
  }[];
}

interface MenuSection {
  title: string;
  color: string;
  icon: React.ElementType;
  modules: MenuModule[];
}

const menuStructure: MenuSection[] = [
  {
    title: 'Comercial',
    color: '#ec4a55',
    icon: DollarSign,
    modules: [
      { name: 'crm', displayName: 'CRM', icon: DollarSign },
      { name: 'dashboard', displayName: 'Quadro de vendas', icon: BarChart3 },
      { name: 'projetos', displayName: 'Lista de espera', icon: FolderCheck },
      { name: 'wallet', displayName: 'Wallet', icon: Wallet },
    ]
  },
  {
    title: 'Customer Success',
    color: '#ec4a55',
    icon: UserCheck,
    modules: [
      { name: 'csm', displayName: 'CSM', icon: UserCheck },
      { name: 'cs', displayName: 'Cases de sucesso', icon: Trophy },
    ]
  },
  {
    title: 'Customer Experience',
    color: '#ec4a55',
    icon: BarChart2,
    modules: [
      { 
        name: 'dashboards_cx', 
        displayName: 'Dashboards', 
        icon: BarChart2,
        submodules: [
          { name: 'csat', displayName: 'CSAT', icon: ClipboardList },
          { name: 'nps', displayName: 'NPS', icon: ClipboardList },
          { name: 'churn', displayName: 'CHURN', icon: BarChart2 },
        ]
      },
      { 
        name: 'pipelines_cx', 
        displayName: 'Pipelines', 
        icon: ClipboardList,
        submodules: [
          { name: 'csat', displayName: 'CSAT', icon: ClipboardList },
          { name: 'nps', displayName: 'NPS', icon: ClipboardList },
          { name: 'churn', displayName: 'CHURN', icon: BarChart2 },
        ]
      },
      { 
        name: 'formularios_cx', 
        displayName: 'Formulários', 
        icon: FileText,
        submodules: [
          { name: 'formularios', displayName: 'Gerar Forms', icon: FileText },
          { name: 'csat', displayName: 'CSAT', icon: ClipboardList },
          { name: 'nps', displayName: 'NPS', icon: ClipboardList },
          { name: 'churn', displayName: 'CHURN', icon: BarChart2 },
        ]
      },
    ]
  },
  {
    title: 'Operação',
    color: '#ec4a55',
    icon: FolderOpen,
    modules: [
      { 
        name: 'projetos_op', 
        displayName: 'Projetos', 
        icon: FolderOpen,
        submodules: [
          { name: 'projetos_clientes', displayName: 'Clientes', icon: Users },
          { name: 'metricas_financeiras', displayName: 'Métricas Financeiras', icon: BarChart3 },
        ]
      },
      { name: 'performance', displayName: 'Performance', icon: Activity },
      { 
        name: 'criacao_op', 
        displayName: 'Criação', 
        icon: Sparkles,
        submodules: [
          { name: 'aprovacao', displayName: 'Aprovação', icon: Sparkles },
          { name: 'copy', displayName: 'Copy', icon: Sparkles },
          { name: 'analise_bench', displayName: 'Análise e Bench', icon: Sparkles },
        ]
      },
    ]
  },
  {
    title: 'Configurações',
    color: '#ec4a55',
    icon: Settings,
    modules: [
      { name: 'users', displayName: 'Usuários', icon: Users },
    ]
  },
];

// Componente para edição de permissões com estrutura de menu
interface RolePermissionsEditorProps {
  permissions: RolePermission[];
  onPermissionsChange: React.Dispatch<React.SetStateAction<RolePermission[]>>;
  onSave: () => void;
  onCancel: () => void;
}

const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({
  permissions,
  onPermissionsChange,
  onSave,
  onCancel
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const getPermissionForModule = (moduleName: string) => {
    return permissions.find(p => p.module_name === moduleName);
  };

  const updatePermission = (moduleName: string, field: keyof RolePermission, value: boolean) => {
    onPermissionsChange(prev => prev.map(p => {
      if (p.module_name === moduleName) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const toggleAllForModule = (moduleName: string, value: boolean) => {
    onPermissionsChange(prev => prev.map(p => {
      if (p.module_name === moduleName) {
        return { ...p, can_view: value, can_create: value, can_edit: value, can_delete: value };
      }
      return p;
    }));
  };

  const hasAnyPermission = (moduleName: string) => {
    const perm = getPermissionForModule(moduleName);
    return perm && (perm.can_view || perm.can_create || perm.can_edit || perm.can_delete);
  };

  const hasAllPermissions = (moduleName: string) => {
    const perm = getPermissionForModule(moduleName);
    return perm && perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
  };

  // Helper para obter todos os módulos reais de uma seção (incluindo submodules)
  const getAllModulesFromSection = (section: MenuSection): string[] => {
    const modules: string[] = [];
    section.modules.forEach(m => {
      if (m.submodules && m.submodules.length > 0) {
        m.submodules.forEach(sub => modules.push(sub.name));
      } else {
        modules.push(m.name);
      }
    });
    return [...new Set(modules)]; // Remove duplicatas
  };

  // Helper para verificar se há permissão para algum módulo da seção
  const hasPermissionsInSection = (section: MenuSection): boolean => {
    const allModules = getAllModulesFromSection(section);
    return allModules.some(m => getPermissionForModule(m));
  };

  // Renderizar módulo com ou sem submodules
  const renderModule = (module: MenuModule) => {
    const ModuleIcon = module.icon;

    // Se tem submodules, renderizar como categoria com filhos
    if (module.submodules && module.submodules.length > 0) {
      const isModuleExpanded = expandedModules.has(module.name);
      const submodulesWithPerms = module.submodules.filter(sub => getPermissionForModule(sub.name));
      
      if (submodulesWithPerms.length === 0) return null;

      return (
        <div key={module.name} className="border-b last:border-b-0">
          <Collapsible open={isModuleExpanded} onOpenChange={() => toggleModule(module.name)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 pl-8 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {isModuleExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{module.displayName}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {submodulesWithPerms.filter(sub => hasAnyPermission(sub.name)).length}/{submodulesWithPerms.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6">
                {submodulesWithPerms.map((submodule) => {
                  const permission = getPermissionForModule(submodule.name);
                  if (!permission) return null;
                  
                  const isSubExpanded = expandedModules.has(`${module.name}-${submodule.name}`);
                  const SubIcon = submodule.icon;

                  return (
                    <div key={submodule.name} className="border-b last:border-b-0">
                      <Collapsible open={isSubExpanded} onOpenChange={() => toggleModule(`${module.name}-${submodule.name}`)}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-2 pl-8 cursor-pointer hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3">
                              {isSubExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <SubIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{submodule.displayName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={hasAllPermissions(submodule.name)}
                                onCheckedChange={(checked) => {
                                  toggleAllForModule(submodule.name, checked as boolean);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">Todos</span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2 pl-20 bg-muted/10">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={permission.can_view}
                                onCheckedChange={(checked) => updatePermission(submodule.name, 'can_view', checked as boolean)}
                              />
                              <span className="text-xs flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Visualizar
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={permission.can_create}
                                onCheckedChange={(checked) => updatePermission(submodule.name, 'can_create', checked as boolean)}
                              />
                              <span className="text-xs flex items-center gap-1">
                                <PlusCircle className="h-3 w-3" />
                                Criar
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={permission.can_edit}
                                onCheckedChange={(checked) => updatePermission(submodule.name, 'can_edit', checked as boolean)}
                              />
                              <span className="text-xs flex items-center gap-1">
                                <PenLine className="h-3 w-3" />
                                Editar
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={permission.can_delete}
                                onCheckedChange={(checked) => updatePermission(submodule.name, 'can_delete', checked as boolean)}
                              />
                              <span className="text-xs flex items-center gap-1">
                                <Trash className="h-3 w-3" />
                                Excluir
                              </span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    }

    // Módulo simples sem submodules
    const permission = getPermissionForModule(module.name);
    if (!permission) return null;

    const isModuleExpanded = expandedModules.has(module.name);

    return (
      <div key={module.name} className="border-b last:border-b-0">
        <Collapsible open={isModuleExpanded} onOpenChange={() => toggleModule(module.name)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 pl-8 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {isModuleExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{module.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={hasAllPermissions(module.name)}
                  onCheckedChange={(checked) => {
                    toggleAllForModule(module.name, checked as boolean);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-muted-foreground">Todos</span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 pl-16 bg-muted/10">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${module.name}-view`}
                  checked={permission.can_view}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_view', checked as boolean)}
                />
                <label htmlFor={`${module.name}-view`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <Eye className="h-3 w-3" />
                  Visualizar
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${module.name}-create`}
                  checked={permission.can_create}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_create', checked as boolean)}
                />
                <label htmlFor={`${module.name}-create`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <PlusCircle className="h-3 w-3" />
                  Criar
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${module.name}-edit`}
                  checked={permission.can_edit}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_edit', checked as boolean)}
                />
                <label htmlFor={`${module.name}-edit`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <PenLine className="h-3 w-3" />
                  Editar
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${module.name}-delete`}
                  checked={permission.can_delete}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_delete', checked as boolean)}
                />
                <label htmlFor={`${module.name}-delete`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <Trash className="h-3 w-3" />
                  Excluir
                </label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {menuStructure.map((section) => {
        const isSectionExpanded = expandedSections.has(section.title);
        
        if (!hasPermissionsInSection(section)) return null;

        const SectionIcon = section.icon;

        return (
          <div key={section.title} className="border rounded-lg overflow-hidden">
            <Collapsible open={isSectionExpanded} onOpenChange={() => toggleSection(section.title)}>
              <CollapsibleTrigger asChild>
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ borderLeft: `4px solid ${section.color}` }}
                >
                  <div className="flex items-center gap-3">
                    {isSectionExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <SectionIcon className="h-4 w-4" style={{ color: section.color }} />
                    <span className="font-semibold" style={{ color: section.color }}>
                      {section.title}
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  {section.modules.map((module) => renderModule(module))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
      {/* Módulos que não estão na estrutura do menu - filtrados para ocultar módulos escondidos */}
      {(() => {
        // Módulos ocultos que não devem aparecer nas permissões
        const hiddenModules = ['gestao_contratos', 'cs_dashboards', 'cs_pipelines', 'dashboards_cx', 'pipelines_cx', 'formularios_cx', 'projetos_op', 'criacao_op'];
        
        // Coletar todos os módulos mapeados (incluindo submodules)
        const allMappedModules: string[] = [];
        menuStructure.forEach(section => {
          section.modules.forEach(m => {
            allMappedModules.push(m.name);
            if (m.submodules) {
              m.submodules.forEach(sub => allMappedModules.push(sub.name));
            }
          });
        });
        
        const unmappedModules = permissions.filter(p => 
          !allMappedModules.includes(p.module_name) &&
          !hiddenModules.includes(p.module_name)
        );
        
        if (unmappedModules.length === 0) return null;

        return (
          <div className="border rounded-lg overflow-hidden">
            <Collapsible open={expandedSections.has('outros')} onOpenChange={() => toggleSection('outros')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-muted-foreground">
                  <div className="flex items-center gap-3">
                    {expandedSections.has('outros') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-muted-foreground">Outros Módulos</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {unmappedModules.filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete).length}/{unmappedModules.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  {unmappedModules.map((permission) => {
                    const isModuleExpanded = expandedModules.has(permission.module_name);

                    return (
                      <div key={permission.module_name} className="border-b last:border-b-0">
                        <Collapsible open={isModuleExpanded} onOpenChange={() => toggleModule(permission.module_name)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 pl-8 cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3">
                                {isModuleExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <span className="text-sm font-medium">{permission.display_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={permission.can_view && permission.can_create && permission.can_edit && permission.can_delete}
                                  onCheckedChange={(checked) => {
                                    toggleAllForModule(permission.module_name, checked as boolean);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs text-muted-foreground">Todos</span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 pl-16 bg-muted/10">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={permission.can_view}
                                  onCheckedChange={(checked) => updatePermission(permission.module_name, 'can_view', checked as boolean)}
                                />
                                <span className="text-xs flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Visualizar
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={permission.can_create}
                                  onCheckedChange={(checked) => updatePermission(permission.module_name, 'can_create', checked as boolean)}
                                />
                                <span className="text-xs flex items-center gap-1">
                                  <PlusCircle className="h-3 w-3" />
                                  Criar
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={permission.can_edit}
                                  onCheckedChange={(checked) => updatePermission(permission.module_name, 'can_edit', checked as boolean)}
                                />
                                <span className="text-xs flex items-center gap-1">
                                  <PenLine className="h-3 w-3" />
                                  Editar
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={permission.can_delete}
                                  onCheckedChange={(checked) => updatePermission(permission.module_name, 'can_delete', checked as boolean)}
                                />
                                <span className="text-xs flex items-center gap-1">
                                  <Trash className="h-3 w-3" />
                                  Excluir
                                </span>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })()}

      <div className="flex gap-2 pt-4">
        <Button onClick={onSave}>
          Salvar Permissões do Grupo
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

// Using Profile type from AuthContext
type UserProfile = {
  user_id: string;
  name: string;
  email: string;
  role: 'workspace_admin' | 'admin' | 'sdr' | 'closer';
  department?: string | null;
  phone?: string | null;
  is_active: boolean;
  last_login?: string | null;
  custom_role_id?: string | null;
  avatar_url?: string | null;
};

export const UserManagement = () => {
  const { profile, profiles, addUser, removeUser, activateUser, updateUser, refreshProfiles } = useAuth();
  const { checkModulePermission } = useModulePermissions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(null);
  const [permissionsUserName, setPermissionsUserName] = useState<string>('');
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [editingRolePermissions, setEditingRolePermissions] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', base_role: 'custom' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sdr' as 'workspace_admin' | 'admin' | 'sdr' | 'closer',
    department: '',
    phone: '',
    customRoleId: 'sdr',
    avatar_url: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (checkModulePermission('users', 'view')) {
      refreshProfiles();
      fetchCustomRoles();
      fetchModules();
    }
  }, []);

  const fetchCustomRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Erro ao buscar roles:', error);
        setCustomRoles([]);
      } else {
        setCustomRoles(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      setCustomRoles([]);
    }
  };

  // Módulos com acesso padrão para todos usuários
  const publicModuleNames = ['meu_perfil', 'preferencias', 'profile', 'preferences'];

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('display_name');

    if (!error && data) {
      // Filtrar módulos públicos da lista de permissões
      const filteredModules = data.filter(m => !publicModuleNames.includes(m.name.toLowerCase()));
      setModules(filteredModules);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    const { data: allModules } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    const { data: existingPermissions } = await supabase
      .from('role_module_permissions')
      .select('*')
      .eq('role_id', roleId);

    // Filtrar módulos públicos da lista de permissões
    const filteredModules = (allModules || []).filter(m => !publicModuleNames.includes(m.name.toLowerCase()));

    const permissions = filteredModules.map(module => {
      const existingPerm = existingPermissions?.find(p => p.module_id === module.id);
      return {
        module_id: module.id,
        module_name: module.name,
        display_name: module.display_name,
        can_view: existingPerm?.can_view || false,
        can_create: existingPerm?.can_create || false,
        can_edit: existingPerm?.can_edit || false,
        can_delete: existingPerm?.can_delete || false
      };
    });

    setRolePermissions(permissions);
  };

  const saveRolePermissions = async (roleId: string) => {
    const updates = rolePermissions.map(perm => ({
      role_id: roleId,
      module_id: perm.module_id,
      can_view: perm.can_view,
      can_create: perm.can_create,
      can_edit: perm.can_edit,
      can_delete: perm.can_delete
    }));

    const { error } = await supabase
      .from('role_module_permissions')
      .upsert(updates, { onConflict: 'role_id,module_id' });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar permissões do grupo",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Permissões do grupo atualizadas. Todos os usuários deste grupo foram afetados."
      });
      setEditingRolePermissions(null);
    }
  };

  const createRole = async () => {
    if (!newRole.name || !newRole.display_name) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_roles')
      .insert([{
        name: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: newRole.display_name,
        base_role: newRole.base_role as 'admin' | 'closer' | 'custom' | 'manager' | 'sdr',
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      // Create default permissions
      const defaultPerms = modules.map(m => ({
        role_id: data.id,
        module_id: m.id,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      }));
      await supabase.from('role_module_permissions').insert(defaultPerms);

      toast({ title: "Sucesso", description: "Grupo criado com sucesso" });
      setNewRole({ name: '', display_name: '', base_role: 'custom' });
      setIsCreateRoleOpen(false);
      fetchCustomRoles();
    }
  };

  const deleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from('custom_roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (!error) {
      toast({ title: "Sucesso", description: "Grupo desativado" });
      fetchCustomRoles();
    }
  };

  if (!checkModulePermission('users', 'view')) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar o gerenciamento de usuários.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group users by their custom_role_id
  const getUsersByRole = (roleId: string) => {
    return profiles.filter(u => u.custom_role_id === roleId && u.is_active);
  };

  // Users without custom role (legacy base roles)
  const getLegacyUsers = () => {
    return profiles.filter(u => !u.custom_role_id && u.is_active);
  };

  const toggleRoleExpanded = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const getRoleBadgeColor = (baseRole: string) => {
    switch (baseRole) {
      case 'admin': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'closer': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'sdr': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update form data and preview
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setAvatarPreview(publicUrl);

      toast({ title: "Sucesso", description: "Foto de perfil carregada" });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Erro", description: error.message || "Erro ao carregar foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Erro", description: "Nome, email e senha são obrigatórios", variant: "destructive" });
      return;
    }

    const isBaseRole = ['workspace_admin', 'admin', 'sdr', 'closer'].includes(formData.customRoleId);
    const role = isBaseRole ? formData.customRoleId as 'workspace_admin' | 'admin' | 'sdr' | 'closer' : 'sdr';
    const customRoleId = isBaseRole ? undefined : formData.customRoleId;

    const result = await addUser({ ...formData, role, customRoleId });
    
    if (result.success) {
      setFormData({ name: '', email: '', password: '', role: 'sdr', department: '', phone: '', customRoleId: 'sdr', avatar_url: '' });
      setAvatarPreview(null);
      setIsAddDialogOpen(false);
      toast({ title: "Sucesso", description: `${formData.name} foi adicionado ao sistema.` });
    } else {
      toast({ title: "Erro", description: result.message || "Erro ao criar usuário", variant: "destructive" });
    }
  };

  const handleEditUser = (userId: string) => {
    const user = profiles.find(u => u.user_id === userId);
    if (user) {
      // Garantir que o role seja um dos valores válidos
      const userRole: 'workspace_admin' | 'admin' | 'sdr' | 'closer' = 
        (user.role === 'workspace_admin' || user.role === 'admin' || user.role === 'sdr' || user.role === 'closer') 
          ? user.role as 'workspace_admin' | 'admin' | 'sdr' | 'closer'
          : 'sdr';
      
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: userRole,
        department: user.department || '',
        phone: user.phone || '',
        customRoleId: user.custom_role_id || '',
        avatar_url: (user as any).avatar_url || ''
      });
      setAvatarPreview((user as any).avatar_url || null);
      setEditingUser(userId);
    }
  };

  const handleUpdateUser = async () => {
    if (!formData.name || !formData.email || !editingUser) return;

    setIsUpdating(true);
    
    const isBaseRole = ['workspace_admin', 'admin', 'sdr', 'closer'].includes(formData.customRoleId);
    const role = isBaseRole ? formData.customRoleId as 'workspace_admin' | 'admin' | 'sdr' | 'closer' : formData.role;
    const customRoleId = isBaseRole ? null : formData.customRoleId;

    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        email: formData.email,
        role: role,
        department: formData.department,
        phone: formData.phone,
        custom_role_id: customRoleId,
        avatar_url: formData.avatar_url || null
      })
      .eq('user_id', editingUser);

    if (!error) {
      setFormData({ name: '', email: '', password: '', role: 'sdr', department: '', phone: '', customRoleId: 'sdr', avatar_url: '' });
      setAvatarPreview(null);
      setEditingUser(null);
      refreshProfiles();
      toast({ title: "Sucesso", description: "Usuário atualizado" });
    } else {
      toast({ title: "Erro", description: "Erro ao atualizar usuário", variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === profile?.user_id) {
      toast({ title: "Erro", description: "Você não pode remover sua própria conta", variant: "destructive" });
      return;
    }
    const success = await removeUser(userId);
    if (success) toast({ title: "Sucesso", description: "Usuário desativado" });
  };

  const handleActivateUser = async (userId: string) => {
    const success = await activateUser(userId);
    if (success) toast({ title: "Sucesso", description: "Usuário reativado" });
  };

  // Função para obter o nome do cargo do usuário
  const getUserCargoName = (user: any): string => {
    if (user.custom_role_id) {
      const role = customRoles.find(r => r.id === user.custom_role_id);
      if (role?.display_name) return role.display_name;
    }
    // Roles base que não são admin
    if (user.role && !['admin', 'workspace_admin'].includes(user.role)) {
      const roleNames: Record<string, string> = {
        'sdr': 'SDR',
        'closer': 'Closer',
        'manager': 'Gerente'
      };
      if (roleNames[user.role]) return roleNames[user.role];
      if (user.role !== 'custom') return user.role.toUpperCase();
    }
    return 'Sem função';
  };

  // Obter todos os usuários comuns (não-admin) incluindo os sem grupo
  const getAllCommonUsers = () => {
    return profiles.filter(u => {
      if (u.role === 'workspace_admin') return false;
      const baseRole = (u as any).custom_roles?.base_role;
      const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : u.role;
      return effectiveRole !== 'admin' && u.is_active;
    });
  };

  const renderUserRow = (user: any, showCargo: boolean = false) => (
    <div key={user.user_id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{user.name}</p>
            {showCargo && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getUserCargoName(user) === 'Sem função' ? 'border-muted-foreground/30 text-muted-foreground' : ''}`}
              >
                {getUserCargoName(user)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {checkModulePermission('users', 'edit') && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPermissionsUserId(user.user_id);
                setPermissionsUserName(user.name);
                setCurrentUserRoleId(user.custom_role_id || undefined);
              }}
              title="Permissões individuais"
            >
              <Shield className="h-4 w-4" />
            </Button>
            <Dialog open={editingUser === user.user_id} onOpenChange={(open) => !open && setEditingUser(null)}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => handleEditUser(user.user_id)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <Label>Foto de Perfil</Label>
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-2 border-border">
                        <AvatarImage src={avatarPreview || undefined} />
                        <AvatarFallback className="text-xl bg-primary/10">
                          {formData.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <label 
                        htmlFor={`avatar-upload-${user.user_id}`}
                        className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors"
                      >
                        {uploadingAvatar ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <Camera className="h-4 w-4 text-primary-foreground" />
                        )}
                      </label>
                      <input
                        id={`avatar-upload-${user.user_id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(e, user.user_id)}
                        disabled={uploadingAvatar}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Clique no ícone para alterar</p>
                  </div>

                  <Separator />

                  <div>
                    <Label>Nome</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                  </div>
                  <div>
                    <Label>Grupo/Função</Label>
                    <Select value={formData.customRoleId} onValueChange={(value) => setFormData({ ...formData, customRoleId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sdr">SDR</SelectItem>
                        <SelectItem value="closer">Closer</SelectItem>
                        {customRoles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                    <Button onClick={handleUpdateUser} disabled={isUpdating}>
                      {isUpdating ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        {checkModulePermission('users', 'delete') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação desativará {user.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRemoveUser(user.user_id)} className="bg-red-600 hover:bg-red-700">
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

  // Hierarquia de níveis de admin:
  // 1. workspace_admin - podem alterar qualquer usuário, incluindo outros workspace_admins
  // 2. admin - só podem alterar usuários comuns (não workspace_admins nem outros admins)
  // 3. usuários comuns (sdr, closer, custom roles)
  
  // Determinar o nível do usuário
  const getUserLevel = (user: any): 'workspace_admin' | 'admin' | 'user' => {
    const baseRole = (user as any).custom_roles?.base_role;
    const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : user.role;
    
    // Workspace admins são identificados por role === 'workspace_admin'
    if (user.role === 'workspace_admin') return 'workspace_admin';
    if (effectiveRole === 'admin') return 'admin';
    return 'user';
  };
  
  // Verificar se o usuário atual pode editar o usuário alvo
  const canEditUser = (targetUser: any): boolean => {
    if (!profile) return false;
    
    // Usuário pode editar a si mesmo
    if (targetUser.user_id === profile.user_id) return true;
    
    const currentLevel = getUserLevel(profile);
    const targetLevel = getUserLevel(targetUser);
    
    // Workspace admins podem editar qualquer um
    if (currentLevel === 'workspace_admin') return true;
    
    // Admins só podem editar usuários comuns
    if (currentLevel === 'admin' && targetLevel === 'user') return true;
    
    return false;
  };

  // Função para promover/remover workspace admin (usa edge function para bypass RLS)
  const toggleWorkspaceAdmin = async (userId: string, currentlyWorkspaceAdmin: boolean) => {
    const newRole = currentlyWorkspaceAdmin ? 'admin' : 'workspace_admin';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: "Erro", 
          description: "Você precisa estar logado", 
          variant: "destructive" 
        });
        return;
      }

      const response = await fetch(
        'https://yoauzllgwcsrmvkwdcoa.supabase.co/functions/v1/update-user-role',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ targetUserId: userId, newRole }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Erro", 
          description: result.error || "Erro ao atualizar status de administrador", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Sucesso", 
          description: currentlyWorkspaceAdmin 
            ? "Usuário removido dos administradores do workspace" 
            : "Usuário promovido a administrador do workspace"
        });
        refreshProfiles();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao atualizar status de administrador", 
        variant: "destructive" 
      });
    }
  };
  
  // Função para promover/remover admin completo (usa edge function para bypass RLS)
  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    const newRole = currentlyAdmin ? 'sdr' : 'admin';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: "Erro", 
          description: "Você precisa estar logado", 
          variant: "destructive" 
        });
        return;
      }

      const response = await fetch(
        'https://yoauzllgwcsrmvkwdcoa.supabase.co/functions/v1/update-user-role',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ targetUserId: userId, newRole }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Erro", 
          description: result.error || "Erro ao atualizar status de administrador", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Sucesso", 
          description: currentlyAdmin 
            ? "Usuário removido dos administradores" 
            : "Usuário promovido a administrador completo"
        });
        refreshProfiles();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao atualizar status de administrador", 
        variant: "destructive" 
      });
    }
  };

  // Verificar se o usuário atual é workspace admin
  const isCurrentUserWorkspaceAdmin = () => {
    if (!profile) return false;
    return profile.role === 'workspace_admin';
  };
  
  // Verificar se o usuário atual é admin (para bootstrap)
  const isCurrentUserAdmin = () => {
    if (!profile) return false;
    const baseRole = (profile as any).custom_roles?.base_role;
    const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : profile.role;
    return effectiveRole === 'admin' || profile.role === 'workspace_admin';
  };
  
  // Verificar se não há workspace admins (modo bootstrap)
  const isBootstrapMode = () => {
    return getWorkspaceAdmins().length === 0;
  };
  
  // Pode promover workspace admin: ou é workspace_admin, ou é admin em modo bootstrap
  const canPromoteWorkspaceAdmin = () => {
    return isCurrentUserWorkspaceAdmin() || (isCurrentUserAdmin() && isBootstrapMode());
  };

  // Obter todos os administradores do workspace (role = workspace_admin)
  const getWorkspaceAdmins = () => {
    return profiles.filter(u => u.role === 'workspace_admin' && u.is_active);
  };
  
  // Obter administradores completos (role = admin ou custom_role base_role = admin, mas não workspace_admin)
  const getFullAdmins = () => {
    return profiles.filter(u => {
      if (u.role === 'workspace_admin') return false;
      const baseRole = (u as any).custom_roles?.base_role;
      const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : u.role;
      return effectiveRole === 'admin' && u.is_active;
    });
  };

  // Obter usuários não-admin ativos (para promover a admin)
  const getNonAdminUsers = () => {
    return profiles.filter(u => {
      if (u.role === 'workspace_admin') return false;
      const baseRole = (u as any).custom_roles?.base_role;
      const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : u.role;
      return effectiveRole !== 'admin' && u.is_active;
    });
  };
  
  // Obter usuários que não são workspace admin (para promover a workspace admin)
  const getNonWorkspaceAdminUsers = () => {
    return profiles.filter(u => u.role !== 'workspace_admin' && u.is_active);
  };

  return (
    <div className="space-y-6">
      {/* Seção Administradores do Workspace - visível para quem tem permissão de ver users, mas só workspace_admins podem editar */}
      {checkModulePermission('users', 'view') && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Administradores do Workspace
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Podem gerenciar qualquer usuário, incluindo outros administradores. Nível máximo de permissão.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Lista de workspace admins atuais */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Workspace Admins ({getWorkspaceAdmins().length})
                </Label>
                <div className="grid gap-2">
                  {getWorkspaceAdmins().map(admin => (
                    <div 
                      key={admin.user_id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{admin.name}</p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      {admin.user_id !== profile?.user_id && isCurrentUserWorkspaceAdmin() && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Remover Workspace Admin?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{admin.name}</strong> será rebaixado para Admin Completo.
                                Não poderá mais gerenciar outros Workspace Admins.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => toggleWorkspaceAdmin(admin.user_id, true)}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {admin.user_id === profile?.user_id && (
                        <Badge variant="secondary" className="text-xs">Você</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Promover a workspace admin - workspace admins OU admins em modo bootstrap */}
              {canPromoteWorkspaceAdmin() && getNonWorkspaceAdminUsers().length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Promover a Workspace Admin
                  </Label>
                  {isBootstrapMode() && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-2">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ <strong>Modo de configuração inicial:</strong> Como não há Workspace Admins cadastrados, 
                        você pode promover o primeiro. Após isso, apenas Workspace Admins poderão gerenciar outros.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Select onValueChange={(userId) => {
                      if (userId) {
                        toggleWorkspaceAdmin(userId, false);
                      }
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar usuário..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getNonWorkspaceAdminUsers().map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Workspace Admins têm controle total sobre todos os usuários e configurações.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários por Grupo
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em um grupo para ver seus usuários. Configure acessos do grupo ou individualmente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {checkModulePermission('users', 'create') && (
                <>
                  <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Grupo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Grupo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome do Grupo</Label>
                          <Input
                            value={newRole.name}
                            onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="ex: vendas_senior"
                          />
                        </div>
                        <div>
                          <Label>Nome de Exibição</Label>
                          <Input
                            value={newRole.display_name}
                            onChange={(e) => setNewRole(prev => ({ ...prev, display_name: e.target.value }))}
                            placeholder="ex: Vendas Sênior"
                          />
                        </div>
                        <div>
                          <Label>Tipo Base</Label>
                          <Select value={newRole.base_role} onValueChange={(value) => setNewRole(prev => ({ ...prev, base_role: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="closer">Closer</SelectItem>
                              <SelectItem value="sdr">SDR</SelectItem>
                              <SelectItem value="custom">Personalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={createRole} className="flex-1">Criar</Button>
                          <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>Cancelar</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome *</Label>
                          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
                        </div>
                        <div>
                          <Label>Senha *</Label>
                          <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Senha" minLength={6} />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
                        </div>
                        <div>
                          <Label>Departamento</Label>
                          <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Ex: Vendas" />
                        </div>
                        <div>
                          <Label>Grupo/Função *</Label>
                          <Select value={formData.customRoleId} onValueChange={(value) => setFormData({ ...formData, customRoleId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="sdr">SDR</SelectItem>
                              <SelectItem value="closer">Closer</SelectItem>
                              {customRoles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.display_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={handleAddUser}>Adicionar</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seção 1: Workspace Admins */}
          <Card className="border-amber-500/30">
            <Collapsible open={expandedRoles.has('workspace_admins')} onOpenChange={() => toggleRoleExpanded('workspace_admins')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {expandedRoles.has('workspace_admins') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Workspace Admin</h3>
                        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                          MÁXIMO
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getWorkspaceAdmins().length} usuário{getWorkspaceAdmins().length !== 1 ? 's' : ''} • Controle total do sistema
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {getWorkspaceAdmins().length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhum Workspace Admin cadastrado
                    </div>
                  ) : (
                    getWorkspaceAdmins().map(user => renderUserRow(user))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Seção 2: Administradores Completos */}
          <Card className="border-blue-500/30">
            <Collapsible open={expandedRoles.has('full_admins')} onOpenChange={() => toggleRoleExpanded('full_admins')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {expandedRoles.has('full_admins') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Administrador Completo</h3>
                        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                          ADMIN
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getFullAdmins().length} usuário{getFullAdmins().length !== 1 ? 's' : ''} • Acesso administrativo
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {getFullAdmins().length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhum Administrador Completo cadastrado
                    </div>
                  ) : (
                    getFullAdmins().map(user => renderUserRow(user))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Seção 3: Usuários Comuns (agrupa todos que não são admin) */}
          <Card className="border-border">
            <Collapsible open={expandedRoles.has('common_users')} onOpenChange={() => toggleRoleExpanded('common_users')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {expandedRoles.has('common_users') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Usuários Comuns</h3>
                        <Badge variant="secondary">
                          EQUIPE
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getAllCommonUsers().length} usuário{getAllCommonUsers().length !== 1 ? 's' : ''} • Closer, Copy, Designer, PO, SDR, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {getAllCommonUsers().length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhum usuário comum cadastrado
                    </div>
                  ) : (
                    getAllCommonUsers().map(user => renderUserRow(user, true))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </CardContent>
      </Card>

      {/* Modal de Permissões do Grupo */}
      <Dialog open={!!editingRolePermissions} onOpenChange={(open) => !open && setEditingRolePermissions(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configurar Acessos do Grupo
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              As alterações afetarão <strong>todos os usuários</strong> deste grupo.
            </p>
          </DialogHeader>
          <RolePermissionsEditor 
            permissions={rolePermissions} 
            onPermissionsChange={setRolePermissions}
            onSave={() => editingRolePermissions && saveRolePermissions(editingRolePermissions)}
            onCancel={() => setEditingRolePermissions(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Permissões Individuais do Usuário */}
      {permissionsUserId && (
        <UserPermissions
          userId={permissionsUserId}
          userName={permissionsUserName}
          currentRoleId={currentUserRoleId}
          isOpen={!!permissionsUserId}
          onClose={() => {
            setPermissionsUserId(null);
            setPermissionsUserName('');
            setCurrentUserRoleId(undefined);
          }}
          onSave={() => {}}
        />
      )}
    </div>
  );
};
