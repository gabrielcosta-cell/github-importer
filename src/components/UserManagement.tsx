import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserPermissions } from '@/components/UserPermissions';
import { UserPlus, Trash2, Edit, Shield, User, UserCheck, ChevronDown, ChevronRight, Settings, Users, Camera, Crown, RefreshCw, Eye, EyeOff, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type UserProfile = {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_global_admin: boolean;
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
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(null);
  const [permissionsUserName, setPermissionsUserName] = useState<string>('');
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    phone: '',
    avatar_url: '',
    userType: 'dot' as 'dot' | 'external',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Auto-detect user type based on email domain
  const isDotEmail = formData.email.trim().toLowerCase().endsWith('@dotconceito.com');
  const effectiveUserType = isDotEmail ? 'dot' : formData.userType;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const isGlobalAdmin = profile?.is_global_admin || false;
  const isAdmin = profile?.role === 'admin' || isGlobalAdmin;

  useEffect(() => {
    if (checkModulePermission('users', 'view')) {
      refreshProfiles();
    }
  }, []);

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

  const toggleRoleExpanded = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  // Helpers para hierarquia
  const getGlobalAdmin = () => profiles.filter(u => u.is_global_admin && u.is_active);
  const getAdmins = () => profiles.filter(u => u.role === 'admin' && !u.is_global_admin && u.is_active);
  const getCommonUsers = () => profiles.filter(u => u.role === 'user' && !u.is_global_admin && u.is_active);
  const getInactiveUsers = () => profiles.filter(u => !u.is_active);

  // Admin pode ver: apenas comuns. Global admin: todos.
  const getVisibleProfiles = () => {
    if (isGlobalAdmin) return profiles;
    if (isAdmin) return profiles.filter(u => (u.role === 'user' && !u.is_global_admin) || u.user_id === profile?.user_id);
    return [];
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setAvatarPreview(publicUrl);
      toast({ title: "Sucesso", description: "Foto de perfil carregada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao carregar foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" });
      return;
    }

    // External users require password
    if (effectiveUserType === 'external' && !formData.password) {
      toast({ title: "Erro", description: "Senha é obrigatória para usuários externos", variant: "destructive" });
      return;
    }

    // Admin normal só pode criar usuário comum
    let role = formData.role;
    if (!isGlobalAdmin && role === 'admin') {
      toast({ title: "Erro", description: "Apenas o Admin Global pode criar administradores", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      role,
      password: effectiveUserType === 'external' ? formData.password : '',
      require_password_change: effectiveUserType === 'external',
    };

    const result = await addUser(payload);
    
    if (result.success) {
      // If external user, show the generated/typed password so admin can share it
      if (effectiveUserType === 'external' && formData.password) {
        toast({ 
          title: "Usuário externo criado", 
          description: `Senha temporária: ${formData.password} — O usuário deverá alterá-la no primeiro login.`,
          duration: 15000,
        });
      } else {
        toast({ title: "Sucesso", description: `${formData.name} foi adicionado ao sistema.` });
      }
      setFormData({ name: '', email: '', password: '', role: 'user', phone: '', avatar_url: '', userType: 'dot' });
      setAvatarPreview(null);
      setShowPassword(false);
      setIsAddDialogOpen(false);
    } else {
      toast({ title: "Erro", description: result.message || "Erro ao criar usuário", variant: "destructive" });
    }
  };

  const handleEditUser = (userId: string) => {
    const user = profiles.find(u => u.user_id === userId);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role as 'admin' | 'user',
        phone: user.phone || '',
        avatar_url: (user as any).avatar_url || ''
      });
      setAvatarPreview((user as any).avatar_url || null);
      setEditingUser(userId);
    }
  };

  const handleUpdateUser = async () => {
    if (!formData.name || !formData.email || !editingUser) return;

    setIsUpdating(true);
    
    // Verificar permissão de alterar role
    const targetUser = profiles.find(u => u.user_id === editingUser);
    let role = formData.role;
    
    // Admin normal não pode promover para admin
    if (!isGlobalAdmin && role === 'admin' && targetUser?.role !== 'admin') {
      toast({ title: "Erro", description: "Apenas o Admin Global pode promover a administrador", variant: "destructive" });
      setIsUpdating(false);
      return;
    }

    // Admin normal não pode editar admins
    if (!isGlobalAdmin && targetUser?.role === 'admin') {
      toast({ title: "Erro", description: "Apenas o Admin Global pode editar administradores", variant: "destructive" });
      setIsUpdating(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        email: formData.email,
        role: role,
        phone: formData.phone,
        avatar_url: formData.avatar_url || null
      })
      .eq('user_id', editingUser);

    if (!error) {
      setFormData({ name: '', email: '', password: '', role: 'user', phone: '', avatar_url: '', userType: 'dot' });
      setAvatarPreview(null);
      setShowPassword(false);
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
    
    const targetUser = profiles.find(u => u.user_id === userId);
    
    // Admin normal não pode desativar admins
    if (!isGlobalAdmin && targetUser?.role === 'admin') {
      toast({ title: "Erro", description: "Apenas o Admin Global pode desativar administradores", variant: "destructive" });
      return;
    }

    // Ninguém pode desativar o Admin Global
    if (targetUser?.is_global_admin) {
      toast({ title: "Erro", description: "O Admin Global não pode ser desativado", variant: "destructive" });
      return;
    }

    const success = await removeUser(userId);
    if (success) toast({ title: "Sucesso", description: "Usuário desativado" });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isGlobalAdmin) {
      toast({ title: "Erro", description: "Apenas o Admin Global pode excluir usuários permanentemente", variant: "destructive" });
      return;
    }

    const targetUser = profiles.find(u => u.user_id === userId);
    if (targetUser?.is_global_admin) {
      toast({ title: "Erro", description: "O Admin Global não pode ser excluído", variant: "destructive" });
      return;
    }

    // Exclusão permanente do perfil
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (!error) {
      refreshProfiles();
      toast({ title: "Sucesso", description: "Usuário excluído permanentemente" });
    } else {
      toast({ title: "Erro", description: "Erro ao excluir usuário", variant: "destructive" });
    }
  };

  const handleActivateUser = async (userId: string) => {
    const success = await activateUser(userId);
    if (success) toast({ title: "Sucesso", description: "Usuário reativado" });
  };

  const canEditTargetUser = (targetUser: any): boolean => {
    if (!profile) return false;
    if (isGlobalAdmin) return true;
    if (isAdmin && targetUser.role === 'user' && !targetUser.is_global_admin) return true;
    return false;
  };

  const canDeactivateTargetUser = (targetUser: any): boolean => {
    if (targetUser.user_id === profile?.user_id) return false;
    if (targetUser.is_global_admin) return false;
    if (isGlobalAdmin) return true;
    if (isAdmin && targetUser.role === 'user') return true;
    return false;
  };

  const renderUserRow = (user: any) => (
    <div key={user.user_id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {user.is_global_admin ? (
            <Crown className="h-5 w-5 text-amber-500" />
          ) : user.role === 'admin' ? (
            <Shield className="h-5 w-5 text-primary" />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{user.name}</p>
            {user.is_global_admin && (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                ADMIN GLOBAL
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canEditTargetUser(user) && (
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
                {/* Role select - apenas Global Admin pode alterar para Admin */}
                {isGlobalAdmin && (
                  <div>
                    <Label>Nível de Acesso</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'user' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="user">Usuário Comum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                  <Button onClick={handleUpdateUser} disabled={isUpdating}>
                    {isUpdating ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Permissões individuais */}
        {canEditTargetUser(user) && (
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
        )}

        {/* Desativar (Admin e Global Admin) */}
        {canDeactivateTargetUser(user) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                <UserCheck className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação desativará {user.name}. O usuário não poderá mais acessar o sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRemoveUser(user.user_id)} className="bg-orange-600 hover:bg-orange-700">
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Excluir permanentemente (apenas Global Admin) */}
        {isGlobalAdmin && !user.is_global_admin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação excluirá {user.name} permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive hover:bg-destructive/90">
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isGlobalAdmin 
                  ? 'Admin Global: controle total sobre todos os usuários.' 
                  : 'Administrador: gerencie usuários comuns.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                      <Label>Telefone</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
                    </div>
                    {/* Role select - apenas Global Admin pode criar Admin */}
                    <div>
                      <Label>Nível de Acesso *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'user' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isGlobalAdmin && (
                            <SelectItem value="admin">Administrador</SelectItem>
                          )}
                          <SelectItem value="user">Usuário Comum</SelectItem>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seção: Admin Global */}
          {isGlobalAdmin && (
            <Card className="border-amber-500/30">
              <Collapsible open={expandedRoles.has('global_admin')} onOpenChange={() => toggleRoleExpanded('global_admin')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {expandedRoles.has('global_admin') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Crown className="h-5 w-5 text-amber-500" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Admin Global</h3>
                          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">GLOBAL</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getGlobalAdmin().length} usuário • Controle total do sistema
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {getGlobalAdmin().map(user => renderUserRow(user))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Seção: Administradores */}
          {isGlobalAdmin && (
            <Card className="border-blue-500/30">
              <Collapsible open={expandedRoles.has('admins')} onOpenChange={() => toggleRoleExpanded('admins')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {expandedRoles.has('admins') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Administradores</h3>
                          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">ADMIN</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getAdmins().length} usuário{getAdmins().length !== 1 ? 's' : ''} • Acesso administrativo
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {getAdmins().length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        Nenhum administrador cadastrado
                      </div>
                    ) : (
                      getAdmins().map(user => renderUserRow(user))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Seção: Usuários Comuns */}
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
                        <Badge variant="secondary">EQUIPE</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getCommonUsers().length} usuário{getCommonUsers().length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {getCommonUsers().length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhum usuário comum cadastrado
                    </div>
                  ) : (
                    getCommonUsers().map(user => renderUserRow(user))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Seção: Inativos (apenas Global Admin) */}
          {isGlobalAdmin && getInactiveUsers().length > 0 && (
            <Card className="border-muted-foreground/20">
              <Collapsible open={expandedRoles.has('inactive')} onOpenChange={() => toggleRoleExpanded('inactive')}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {expandedRoles.has('inactive') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground">Inativos</h3>
                        <p className="text-sm text-muted-foreground">
                          {getInactiveUsers().length} usuário{getInactiveUsers().length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {getInactiveUsers().map(user => (
                      <div key={user.user_id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleActivateUser(user.user_id)}>
                            Reativar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação excluirá {user.name} permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Modal de Permissões Individuais */}
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
