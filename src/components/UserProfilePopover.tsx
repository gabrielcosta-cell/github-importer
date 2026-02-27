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
import { useTheme } from '@/components/ui/theme-provider'

interface UserProfilePopoverProps {
  children: React.ReactNode
  onLogout: () => void | Promise<void>
}

export const UserProfilePopover = ({ children, onLogout }: UserProfilePopoverProps) => {
  const { profile, refreshProfiles } = useAuth()
  const { theme, setTheme } = useTheme()
  const effectiveTheme = (
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme
  ) as "dark" | "light"
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
                  {effectiveTheme === 'dark' ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Tema</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 cursor-pointer hover:bg-accent"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')
                  }}
                >
                  {effectiveTheme === 'dark' ? 'Escuro' : 'Claro'}
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
