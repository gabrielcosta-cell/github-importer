# Documentação de Sincronização: SKALA Operação → SKALA CRM

**Data de criação:** Janeiro 2026  
**Objetivo:** Replicar todas as mudanças de UX feitas no SKALA Operação para o SKALA CRM

---

## Resumo das Mudanças

1. **Sidebar (app-sidebar.tsx):** Remoção do submenu "Configurações", exibição direta do botão "Usuários" acima de "Voltar aos Módulos"
2. **Página Inicial (Index.tsx):** CSM como tela inicial padrão para todos os usuários
3. **Gerenciamento de Usuários (UserManagement.tsx):** Reorganização em 3 seções colapsáveis com badge de cargo

---

## 1. Modificações no Sidebar (`src/components/app-sidebar.tsx`)

### 1.1 Localização da Mudança
Linhas finais do componente, antes do `SidebarFooter` (aproximadamente linhas 817-884)

### 1.2 Código Anterior (REMOVER)
Se existir um submenu de "Configurações" ou "Preferências" com submenus, remova toda essa estrutura.

### 1.3 Código Novo (ADICIONAR)
Substitua a seção de configurações/preferências pelo seguinte código, que fica logo antes do `</SidebarContent>`:

```tsx
{/* Botão Voltar aos Módulos e Usuários */}
<div className="mt-auto pt-4">
<SidebarGroup>
  <SidebarGroupContent>
    <SidebarMenu>
      {/* Usuários - visível apenas para workspace_admin e admin */}
      {(profile?.role === 'workspace_admin' || profile?.effectiveRole === 'admin') && checkModulePermission('users', 'view') && (
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

      {/* Voltar aos Módulos */}
      <SidebarMenuItem>
        {!shouldShowText ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                onClick={handleBackToModules}
                className="w-full justify-center transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Voltar aos Módulos</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <SidebarMenuButton
            onClick={handleBackToModules}
            className="w-full justify-start transition-all duration-200 hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs">Voltar aos Módulos</span>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
</div>
```

### 1.4 Imports Necessários
Certifique-se de que estes imports existem no topo do arquivo:
```tsx
import { Users, ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
```

### 1.5 Condição de Visibilidade
O botão "Usuários" só aparece para:
- `workspace_admin` (verificado via `profile?.role === 'workspace_admin'`)
- OU administradores completos (verificado via `profile?.effectiveRole === 'admin'`)
- E que tenham permissão de visualização (`checkModulePermission('users', 'view')`)

---

## 2. Modificações na Página Inicial (`src/pages/Index.tsx`)

### 2.1 Localização da Mudança
Função `getInitialView()` (aproximadamente linhas 43-51)

### 2.2 Código Anterior (REMOVER)
```tsx
const getInitialView = (): ActiveViewType => {
  const viewFromUrl = searchParams.get('view') as ActiveViewType;
  if (viewFromUrl && VALID_VIEWS.includes(viewFromUrl)) {
    return viewFromUrl;
  }
  // Qualquer lógica que usava preferences.defaultPage
  return preferences?.defaultPage || 'csm';
};
```

### 2.3 Código Novo (SUBSTITUIR)
```tsx
// Obter view da URL ou usar CSM como padrão para todos
const getInitialView = (): ActiveViewType => {
  const viewFromUrl = searchParams.get('view') as ActiveViewType;
  if (viewFromUrl && VALID_VIEWS.includes(viewFromUrl)) {
    return viewFromUrl;
  }
  // CSM é o padrão para todos os usuários
  return 'csm';
};
```

### 2.4 Resultado
- Todos os usuários, independente de cargo ou configuração, terão o CSM como tela inicial
- A URL ainda pode sobrescrever este padrão (ex: `?view=users`)

---

## 3. Modificações no Gerenciamento de Usuários (`src/components/UserManagement.tsx`)

### 3.1 Visão Geral
O componente foi reorganizado para exibir usuários em **3 seções colapsáveis**:
1. **Workspace Admin** (badge MÁXIMO, cor amber/laranja)
2. **Administrador Completo** (badge ADMIN, cor blue/azul)
3. **Usuários Comuns** (badge EQUIPE, inclui Closer, Copy, Designer, PO, SDR, etc.)

### 3.2 Função `getUserCargoName`
Adicione esta função para obter o nome do cargo do usuário:

```tsx
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
```

### 3.3 Função `getAllCommonUsers`
Adicione esta função para obter todos os usuários comuns:

```tsx
// Obter todos os usuários comuns (não-admin) incluindo os sem grupo
const getAllCommonUsers = () => {
  return profiles.filter(u => {
    if (u.role === 'workspace_admin') return false;
    const baseRole = (u as any).custom_roles?.base_role;
    const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : u.role;
    return effectiveRole !== 'admin' && u.is_active;
  });
};
```

### 3.4 Função `renderUserRow` Atualizada
Modifique a função para aceitar o parâmetro `showCargo`:

```tsx
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
    {/* ... resto dos botões de ação ... */}
  </div>
);
```

### 3.5 Estrutura das 3 Seções Colapsáveis
Adicione no CardContent do card de gerenciamento:

```tsx
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
```

### 3.6 State para Controle das Seções Expandidas
Adicione este state no início do componente:

```tsx
const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['workspace_admins', 'full_admins', 'common_users']));

const toggleRoleExpanded = (roleKey: string) => {
  setExpandedRoles(prev => {
    const newSet = new Set(prev);
    if (newSet.has(roleKey)) {
      newSet.delete(roleKey);
    } else {
      newSet.add(roleKey);
    }
    return newSet;
  });
};
```

### 3.7 Imports Necessários
Certifique-se de que estes imports existem:
```tsx
import { Crown, ChevronDown, ChevronRight, Shield, Users, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
```

---

## 4. Checklist de Verificação

Após aplicar as mudanças, verifique:

### Sidebar
- [ ] Botão "Usuários" aparece diretamente (sem submenu)
- [ ] Botão "Usuários" está posicionado acima de "Voltar aos Módulos"
- [ ] Botão "Usuários" só aparece para workspace_admin e admin
- [ ] Ambos os botões funcionam quando sidebar está colapsada (tooltip visível)

### Página Inicial
- [ ] Todos os usuários são direcionados para CSM ao fazer login
- [ ] URL com `?view=xxx` ainda funciona para navegação direta

### Gerenciamento de Usuários
- [ ] 3 seções colapsáveis visíveis (Workspace Admin, Administrador Completo, Usuários Comuns)
- [ ] Cores corretas: amber para Workspace, blue para Admin, default para Comuns
- [ ] Badge de cargo aparece apenas na seção "Usuários Comuns"
- [ ] "Sem função" exibido com estilo mais discreto
- [ ] Contagem de usuários atualizada em cada seção

---

## 5. Notas Importantes

1. **Hierarquia de permissões:**
   - Workspace Admin > Administrador Completo > Usuários Comuns
   - Workspace Admins podem editar qualquer usuário
   - Admins só podem editar usuários comuns

2. **Edge Function necessária:**
   - A função `update-user-role` deve existir no Supabase para permitir alterações de cargo

3. **URL do Supabase:**
   - O SKALA CRM deve usar sua própria URL do Supabase (diferente do Operação)
   - Verifique se a constante de URL está correta nos arquivos

---

## 6. Popover de Perfil do Usuário (`src/components/UserProfilePopover.tsx`)

### 6.1 Visão Geral
O UserProfilePopover é um popover compacto que aparece ao clicar no avatar do usuário na sidebar. Ele exibe:
- Avatar com opção de upload de foto
- Nome editável inline
- Email
- Badge do cargo (Administrador Completo, SDR, Closer, etc.)
- Data de membro
- Departamento
- Telefone editável inline
- Toggle de tema claro/escuro
- Botão de alterar senha

### 6.2 Código Completo do Componente

Crie o arquivo `src/components/UserProfilePopover.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { User, Lock, Shield, Mail, Calendar, Eye, EyeOff, Camera, Building2, Phone, Pencil, Check, X, Moon, Sun } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useTheme } from 'next-themes'

interface UserProfilePopoverProps {
  children: React.ReactNode
  onLogout: () => void | Promise<void>
}

export const UserProfilePopover = ({ children, onLogout }: UserProfilePopoverProps) => {
  const { profile, refreshProfiles } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados de edição
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar estados quando profile muda
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '')
      setEditPhone(profile.phone || '')
    }
  }, [profile])

  if (!profile) return <>{children}</>

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive"
      })
      return
    }

    setIsChangingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso"
      })

      setNewPassword('')
      setConfirmPassword('')
      setIsPasswordDialogOpen(false)
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Ocorreu um erro ao alterar sua senha",
        variant: "destructive"
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" })
      return
    }

    setUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      if (refreshProfiles) {
        await refreshProfiles()
      }

      toast({ title: "Sucesso", description: "Foto de perfil atualizada" })
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast({ title: "Erro", description: error.message || "Erro ao carregar foto", variant: "destructive" })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getRoleBadge = () => {
    if (profile.customRoleDisplayName) {
      return (
        <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
          <User className="h-3 w-3 mr-1" />
          {profile.customRoleDisplayName}
        </Badge>
      )
    }
    
    if (profile.role === 'admin') {
      return (
        <Badge variant="default" className="bg-primary text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Administrador
        </Badge>
      )
    } else if (profile.role === 'sdr') {
      return (
        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
          <User className="h-3 w-3 mr-1" />
          SDR
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-green-600 text-white text-xs">
          <User className="h-3 w-3 mr-1" />
          Closer
        </Badge>
      )
    }
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: editName.trim(),
          phone: editPhone.trim() || null
        })
        .eq('user_id', profile.user_id)

      if (error) throw error

      if (refreshProfiles) {
        await refreshProfiles()
      }

      toast({
        title: "Sucesso",
        description: "Informações atualizadas"
      })

      setIsEditing(false)
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar informações",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditName(profile.name || '')
    setEditPhone(profile.phone || '')
    setIsEditing(false)
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="start" 
          className="w-80 p-0"
          sideOffset={8}
        >
          <div className="p-4 space-y-4">
            {/* Header com Avatar e Nome */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src={(profile as any).avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm font-semibold"
                    placeholder="Seu nome"
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <h4 className="font-semibold text-sm truncate">{profile.name}</h4>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="mt-1">{getRoleBadge()}</div>
              </div>
            </div>

            <Separator />

            {/* Informações do Usuário */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Membro desde:</span>
                <span className="font-medium">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              
              {profile.department && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Departamento:</span>
                  <span className="font-medium">{profile.department}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Telefone:</span>
                {isEditing ? (
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-6 text-sm flex-1"
                    placeholder="(00) 00000-0000"
                  />
                ) : (
                  <span className="font-medium">{profile.phone || '-'}</span>
                )}
              </div>

              {/* Botões de Salvar/Cancelar quando em modo edição */}
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSaveProfile}
                    disabled={isSaving || !editName.trim()}
                  >
                    {isSaving ? (
                      <div className="h-3 w-3 border-2 border-white border-t-transparent animate-spin rounded-full mr-1" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Ações */}
            <div className="space-y-2">
              {/* Toggle de Tema */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Tema</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? 'Claro' : 'Escuro'}
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  setIsOpen(false)
                  setIsPasswordDialogOpen(true)
                }}
              >
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog de Alteração de Senha */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription>
              Crie uma nova senha com no mínimo 6 caracteres
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password-popover">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password-popover"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-destructive">A senha deve ter no mínimo 6 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password-popover">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password-popover"
                type={showPassword ? "text" : "password"}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false)
                setNewPassword('')
                setConfirmPassword('')
              }}
              disabled={isChangingPassword}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {isChangingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### 6.3 Como Usar o Componente na Sidebar

No `app-sidebar.tsx`, envolva o botão/avatar do usuário com o `UserProfilePopover`:

```tsx
import { UserProfilePopover } from '@/components/UserProfilePopover'

// No SidebarFooter:
<SidebarFooter className="border-t">
  <SidebarMenu>
    <SidebarMenuItem>
      <UserProfilePopover onLogout={handleLogout}>
        <SidebarMenuButton className="w-full" tooltip={profile?.name}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback>{profile?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </SidebarMenuButton>
      </UserProfilePopover>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

### 6.4 Campos do Profile Necessários

O componente espera que o `profile` do AuthContext tenha os seguintes campos:
- `user_id`: string (UUID)
- `name`: string
- `email`: string
- `phone`: string | null
- `department`: string | null
- `role`: 'admin' | 'sdr' | 'closer' | etc.
- `customRoleDisplayName`: string | null (nome do cargo customizado)
- `avatar_url`: string | null
- `created_at`: string (ISO date)

### 6.5 Bucket de Storage Necessário

Certifique-se de que existe um bucket `avatars` no Supabase Storage:

```sql
-- Criar bucket de avatars se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload de avatar (usuário só pode fazer upload do próprio avatar)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy para visualização pública
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### 6.6 Mini Preview do Usuário (Footer)

A imagem mostra também um mini preview do usuário no canto inferior. Este é o trigger do popover que aparece no `SidebarFooter`. Certifique-se de incluir o avatar e nome resumido como trigger.

---

## 7. Arquivos Modificados (Resumo)

| Arquivo | Mudança Principal |
|---------|-------------------|
| `src/components/app-sidebar.tsx` | Botão Usuários direto + ordem correta + UserProfilePopover |
| `src/pages/Index.tsx` | CSM como padrão para todos |
| `src/components/UserManagement.tsx` | 3 seções colapsáveis + badges |
| `src/components/UserProfilePopover.tsx` | **NOVO** - Popover de perfil com edição inline |

---

## 8. Dependências Necessárias

Verifique se estas dependências estão instaladas:
- `next-themes` - para o toggle de tema
- `@radix-ui/react-popover` - já incluído com shadcn/ui

---

*Documentação gerada automaticamente para sincronização entre projetos SKALA.*
