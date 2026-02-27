import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Shield, User, ChevronDown, ChevronRight, Settings, Users, DollarSign, BarChart3, FolderCheck, Wallet, Trophy, BarChart2, ClipboardList, FileText, FolderOpen, Activity, Sparkles, Eye, PenLine, Trash, PlusCircle, UserCheck } from 'lucide-react'
import { supabase } from '@/integrations/supabase/external-client'
import { useToast } from '@/hooks/use-toast'

interface UserPermissionsProps {
  userId: string
  userName: string
  currentRoleId?: string
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface Module {
  id: string
  name: string
  display_name: string
}

interface CustomRole {
  id: string
  name: string
  display_name: string
}

interface UserPermission {
  module_id: string
  module_name: string
  display_name: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

// Estrutura do menu para organizar permissões (idêntica ao UserManagement)
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

export const UserPermissions = ({ 
  userId, 
  userName, 
  currentRoleId, 
  isOpen, 
  onClose, 
  onSave 
}: UserPermissionsProps) => {
  const [modules, setModules] = useState<Module[]>([])
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>(currentRoleId || '')
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const publicModuleNames = ['meu_perfil', 'preferencias', 'profile', 'preferences']

  useEffect(() => {
    if (isOpen) {
      fetchModules()
      fetchCustomRoles()
      setSelectedRoleId(currentRoleId || '')
    }
  }, [isOpen, userId, currentRoleId])

  useEffect(() => {
    if (modules.length > 0 && isOpen) {
      fetchUserPermissions()
    }
  }, [modules, isOpen, userId, currentRoleId])

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      toast({
        title: "Erro ao carregar módulos",
        description: error.message,
        variant: "destructive"
      })
    } else {
      const filteredModules = (data || []).filter(m => !publicModuleNames.includes(m.name.toLowerCase()))
      setModules(filteredModules)
    }
  }

  const fetchCustomRoles = async () => {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      toast({
        title: "Erro ao carregar funções",
        description: error.message,
        variant: "destructive"
      })
    } else {
      setCustomRoles(data || [])
    }
  }

  const fetchUserPermissions = async () => {
    const { data: userPerms, error: userError } = await supabase
      .from('user_module_permissions')
      .select(`
        module_id,
        can_view,
        can_create,
        can_edit,
        can_delete,
        modules!inner(name, display_name)
      `)
      .eq('user_id', userId)

    if (userError) {
      console.error('Erro ao buscar permissões do usuário:', userError)
    }

    let rolePerms: any[] = []
    if (currentRoleId) {
      const { data, error: roleError } = await supabase
        .from('role_module_permissions')
        .select(`
          module_id,
          can_view,
          can_create,
          can_edit,
          can_delete,
          modules!inner(name, display_name)
        `)
        .eq('role_id', currentRoleId)

      if (roleError) {
        console.error('Erro ao buscar permissões da role:', roleError)
      } else {
        rolePerms = data || []
      }
    }

    const permissions: UserPermission[] = modules.map(module => {
      const userPerm = userPerms?.find(p => p.module_id === module.id)
      const rolePerm = rolePerms.find(p => p.module_id === module.id)

      return {
        module_id: module.id,
        module_name: module.name,
        display_name: module.display_name,
        can_view: userPerm?.can_view ?? rolePerm?.can_view ?? false,
        can_create: userPerm?.can_create ?? rolePerm?.can_create ?? false,
        can_edit: userPerm?.can_edit ?? rolePerm?.can_edit ?? false,
        can_delete: userPerm?.can_delete ?? rolePerm?.can_delete ?? false
      }
    })

    setUserPermissions(permissions)
  }

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName)
    } else {
      newExpanded.add(moduleName)
    }
    setExpandedModules(newExpanded)
  }

  const getPermissionForModule = (moduleName: string) => {
    return userPermissions.find(p => p.module_name === moduleName)
  }

  const updatePermission = (moduleName: string, field: keyof UserPermission, value: boolean) => {
    setUserPermissions(prev => prev.map(p => {
      if (p.module_name === moduleName) {
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  const toggleAllForModule = (moduleName: string, value: boolean) => {
    setUserPermissions(prev => prev.map(p => {
      if (p.module_name === moduleName) {
        return { ...p, can_view: value, can_create: value, can_edit: value, can_delete: value }
      }
      return p
    }))
  }

  const hasAnyPermission = (moduleName: string) => {
    const perm = getPermissionForModule(moduleName)
    return perm && (perm.can_view || perm.can_create || perm.can_edit || perm.can_delete)
  }

  const hasAllPermissions = (moduleName: string) => {
    const perm = getPermissionForModule(moduleName)
    return perm && perm.can_view && perm.can_create && perm.can_edit && perm.can_delete
  }

  const getAllModulesFromSection = (section: MenuSection): string[] => {
    const mods: string[] = []
    section.modules.forEach(m => {
      if (m.submodules && m.submodules.length > 0) {
        m.submodules.forEach(sub => mods.push(sub.name))
      } else {
        mods.push(m.name)
      }
    })
    return [...new Set(mods)]
  }

  const hasPermissionsInSection = (section: MenuSection): boolean => {
    const allMods = getAllModulesFromSection(section)
    return allMods.some(m => getPermissionForModule(m))
  }

  const handleSave = async () => {
    setLoading(true)
    
    try {
      if (selectedRoleId !== currentRoleId) {
        const roleValue = (selectedRoleId === 'none' || selectedRoleId === '') ? null : selectedRoleId
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ custom_role_id: roleValue })
          .eq('user_id', userId)

        if (profileError) throw profileError
      }

      const permissionsToSave = userPermissions.map(perm => ({
        user_id: userId,
        module_id: perm.module_id,
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete
      }))

      const { error: permError } = await supabase
        .from('user_module_permissions')
        .upsert(permissionsToSave, { onConflict: 'user_id,module_id' })

      if (permError) throw permError

      toast({
        title: "Permissões atualizadas",
        description: "As permissões do usuário foram salvas com sucesso"
      })

      onSave()
      onClose()
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const applyRolePermissions = async (roleId: string) => {
    if (!roleId || roleId === 'none') {
      setUserPermissions(prev => prev.map(perm => ({
        ...perm,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      })))
      return
    }

    const { data, error } = await supabase
      .from('role_module_permissions')
      .select(`
        module_id,
        can_view,
        can_create,
        can_edit,
        can_delete
      `)
      .eq('role_id', roleId)

    if (error) {
      toast({
        title: "Erro ao aplicar permissões da função",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    setUserPermissions(prev => prev.map(perm => {
      const rolePerm = data?.find(rp => rp.module_id === perm.module_id)
      return rolePerm ? {
        ...perm,
        can_view: rolePerm.can_view,
        can_create: rolePerm.can_create,
        can_edit: rolePerm.can_edit,
        can_delete: rolePerm.can_delete
      } : perm
    }))
  }

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId)
    applyRolePermissions(roleId)
  }

  // Renderizar módulo com ou sem submodules
  const renderModule = (module: MenuModule) => {
    const ModuleIcon = module.icon

    if (module.submodules && module.submodules.length > 0) {
      const isModuleExpanded = expandedModules.has(module.name)
      const submodulesWithPerms = module.submodules.filter(sub => getPermissionForModule(sub.name))
      
      if (submodulesWithPerms.length === 0) return null

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
                  const permission = getPermissionForModule(submodule.name)
                  if (!permission) return null
                  
                  const isSubExpanded = expandedModules.has(`${module.name}-${submodule.name}`)
                  const SubIcon = submodule.icon

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
                                  toggleAllForModule(submodule.name, checked as boolean)
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
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )
    }

    // Módulo simples sem submodules
    const permission = getPermissionForModule(module.name)
    if (!permission) return null

    const isModuleExpanded = expandedModules.has(module.name)

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
                    toggleAllForModule(module.name, checked as boolean)
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
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_view', checked as boolean)}
                />
                <span className="text-xs flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Visualizar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={permission.can_create}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_create', checked as boolean)}
                />
                <span className="text-xs flex items-center gap-1">
                  <PlusCircle className="h-3 w-3" />
                  Criar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={permission.can_edit}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_edit', checked as boolean)}
                />
                <span className="text-xs flex items-center gap-1">
                  <PenLine className="h-3 w-3" />
                  Editar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={permission.can_delete}
                  onCheckedChange={(checked) => updatePermission(module.name, 'can_delete', checked as boolean)}
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
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Permissões - {userName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Seleção de Função */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Função do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRoleId} onValueChange={handleRoleChange}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecionar função..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem função específica</SelectItem>
                  {customRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Selecione uma função para aplicar permissões padrão, ou configure individualmente abaixo.
              </p>
            </CardContent>
          </Card>

          {/* Permissões organizadas por seção do menu */}
          <div className="space-y-3">
            {menuStructure.map((section) => {
              const isSectionExpanded = expandedSections.has(section.title)
              
              if (!hasPermissionsInSection(section)) return null

              const SectionIcon = section.icon

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
              )
            })}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="rounded-xl">
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
