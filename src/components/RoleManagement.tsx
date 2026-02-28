import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Edit, Plus, Shield, Eye, PlusCircle, Edit3, Trash } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Module {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  is_active: boolean
}

interface CustomRole {
  id: string
  name: string
  display_name: string
  description: string
  base_role: string
  is_active: boolean
  created_at: string
}

interface RolePermission {
  module_id: string
  module_name: string
  display_name: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export const RoleManagement = () => {
  const [modules, setModules] = useState<Module[]>([])
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const { toast } = useToast()

  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    base_role: 'custom' as const
  })

  useEffect(() => {
    fetchModules()
    fetchCustomRoles()
  }, [])

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
      setModules(data || [])
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

  const fetchRolePermissions = async (roleId: string) => {
    // Buscar todos os módulos
    const { data: allModules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (modulesError) {
      toast({
        title: "Erro ao carregar módulos",
        description: modulesError.message,
        variant: "destructive"
      })
      return
    }

    // Buscar permissões existentes para esta role
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('role_module_permissions')
      .select('*')
      .eq('role_id', roleId)

    if (permissionsError) {
      toast({
        title: "Erro ao carregar permissões",
        description: permissionsError.message,
        variant: "destructive"
      })
      return
    }

    // Combinar todos os módulos com suas permissões (existentes ou padrão)
    const permissions = allModules.map(module => {
      const existingPerm = existingPermissions?.find(p => p.module_id === module.id)
      return {
        module_id: module.id,
        module_name: module.name,
        display_name: module.display_name,
        can_view: existingPerm?.can_view || false,
        can_create: existingPerm?.can_create || false,
        can_edit: existingPerm?.can_edit || false,
        can_delete: existingPerm?.can_delete || false
      }
    })

    setRolePermissions(permissions)
  }

  const createRole = async () => {
    if (!newRole.name || !newRole.display_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e nome de exibição são obrigatórios",
        variant: "destructive"
      })
      return
    }

    // Obter o ID do usuário atual primeiro
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado",
        variant: "destructive"
      })
      return
    }

    const { data, error } = await supabase
      .from('custom_roles')
      .insert([{
        name: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: newRole.display_name,
        description: '',
        base_role: newRole.base_role,
        created_by: user.id
      }])
      .select()
      .single()

    if (error) {
      toast({
        title: "Erro ao criar função",
        description: error.message,
        variant: "destructive"
      })
    } else {
      // Criar permissões padrão para todos os módulos
      const defaultPermissions = modules.map(module => ({
        role_id: data.id,
        module_id: module.id,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      }))

      await supabase
        .from('role_module_permissions')
        .insert(defaultPermissions)

      toast({
        title: "Função criada",
        description: "Nova função criada com sucesso"
      })

      setNewRole({ name: '', display_name: '', base_role: 'custom' })
      setIsCreateRoleOpen(false)
      fetchCustomRoles()
    }
  }

  const updateRole = async () => {
    if (!editingRole || !editingRole.display_name) {
      toast({
        title: "Campo obrigatório",
        description: "Nome de exibição é obrigatório",
        variant: "destructive"
      })
      return
    }

    const { error } = await supabase
      .from('custom_roles')
      .update({ 
        display_name: editingRole.display_name,
        name: editingRole.display_name.toLowerCase().replace(/\s+/g, '_')
      })
      .eq('id', editingRole.id)

    if (error) {
      toast({
        title: "Erro ao atualizar função",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Função atualizada",
        description: "Nome da função foi atualizado com sucesso"
      })
      setIsEditRoleOpen(false)
      setEditingRole(null)
      fetchCustomRoles()
    }
  }

  const updateRolePermissions = async () => {
    if (!selectedRole) return

    const updates = rolePermissions.map(perm => ({
      role_id: selectedRole.id,
      module_id: perm.module_id,
      can_view: perm.can_view,
      can_create: perm.can_create,
      can_edit: perm.can_edit,
      can_delete: perm.can_delete
    }))

    const { error } = await supabase
      .from('role_module_permissions')
      .upsert(updates, { onConflict: 'role_id,module_id' })

    if (error) {
      toast({
        title: "Erro ao atualizar permissões",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Permissões atualizadas",
        description: "Permissões da função foram atualizadas com sucesso"
      })
      setIsEditPermissionsOpen(false)
    }
  }

  const deleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from('custom_roles')
      .update({ is_active: false })
      .eq('id', roleId)

    if (error) {
      toast({
        title: "Erro ao excluir função",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Função excluída",
        description: "Função foi desativada com sucesso"
      })
      fetchCustomRoles()
    }
  }

  const openPermissionsDialog = async (role: CustomRole) => {
    setSelectedRole(role)
    await fetchRolePermissions(role.id)
    setIsEditPermissionsOpen(true)
  }

  const updatePermission = (moduleId: string, permissionType: string, value: boolean) => {
    setRolePermissions(prev => prev.map(perm => 
      perm.module_id === moduleId 
        ? { ...perm, [permissionType]: value }
        : perm
    ))
  }

  const getRoleBadgeColor = (baseRole: string) => {
    switch (baseRole) {
      case 'admin': return 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-300'
      case 'user': return 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-300'
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Funções</h2>
          <p className="text-muted-foreground">Crie e gerencie funções customizadas com permissões específicas</p>
        </div>
        
        <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Nova Função
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Função</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da Função</label>
                <Input
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: vendas_senior"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome de Exibição</label>
                <Input
                  value={newRole.display_name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="ex: Vendas Sênior"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo Base</label>
                <Select value={newRole.base_role} onValueChange={(value) => setNewRole(prev => ({ ...prev, base_role: value as any }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={createRole} className="flex-1 rounded-xl">Criar</Button>
                <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customRoles.map((role) => (
          <Card key={role.id} className="border-border rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{role.display_name}</CardTitle>
                  <Badge className={`mt-1 rounded-full ${getRoleBadgeColor(role.base_role)}`}>
                    {role.base_role.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRole(role);
                      setIsEditRoleOpen(true);
                    }}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openPermissionsDialog(role)}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRole(role.id)}
                    className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {role.description || 'Sem descrição'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Criado em {new Date(role.created_at).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Edição de Permissões */}
      <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões - {selectedRole?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Selecione quais módulos/abas esta função terá acesso:
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm font-medium border-b pb-2">
              <div>Módulo/Aba</div>
              <div className="text-center">Tem Acesso</div>
            </div>
            {rolePermissions.map((permission) => (
              <div key={permission.module_id} className="grid grid-cols-2 gap-4 items-center py-3 border-b">
                <div className="font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  {permission.display_name}
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={permission.can_view}
                    onCheckedChange={(checked) => {
                      const hasAccess = checked as boolean;
                      updatePermission(permission.module_id, 'can_view', hasAccess);
                      updatePermission(permission.module_id, 'can_create', hasAccess);
                      updatePermission(permission.module_id, 'can_edit', hasAccess);
                      updatePermission(permission.module_id, 'can_delete', hasAccess);
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button onClick={updateRolePermissions} className="rounded-xl">
                Salvar Permissões
              </Button>
              <Button variant="outline" onClick={() => setIsEditPermissionsOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição do Nome da Função */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome de Exibição</label>
              <Input
                value={editingRole?.display_name || ''}
                onChange={(e) => setEditingRole(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                placeholder="ex: Vendas Sênior"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={updateRole} className="flex-1 rounded-xl">Salvar</Button>
              <Button variant="outline" onClick={() => setIsEditRoleOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}