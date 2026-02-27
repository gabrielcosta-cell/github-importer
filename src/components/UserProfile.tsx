import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Lock, Shield, Mail, Calendar, Eye, EyeOff, Camera } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const UserProfile = () => {
  const { profile, refreshProfiles } = useAuth()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!profile) return null

  const handleChangePassword = async () => {
    // Validações
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

      // Limpar campos e fechar dialog
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" })
      return
    }

    setUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError

      // Refresh profiles to get updated data
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
    // Se o usuário tem um custom_role, exibir o display_name
    if (profile.customRoleDisplayName) {
      return (
        <Badge variant="secondary" className="bg-purple-600 text-white">
          <User className="h-3 w-3 mr-1" />
          {profile.customRoleDisplayName}
        </Badge>
      )
    }
    
    // Caso contrário, exibir o role base
    if (profile.role === 'admin') {
      return (
        <Badge variant="default" className="bg-primary">
          <Shield className="h-3 w-3 mr-1" />
          Administrador
        </Badge>
      )
    } else if (profile.role === 'sdr') {
      return (
        <Badge variant="secondary" className="bg-blue-600 text-white">
          <User className="h-3 w-3 mr-1" />
          SDR
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-green-600 text-white">
          <User className="h-3 w-3 mr-1" />
          Closer
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize suas informações pessoais
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border">
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
                  <div className="h-6 w-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
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
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getRoleBadge()}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Nome Completo</Label>
              <p className="text-sm text-muted-foreground mt-1">{profile.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Função</Label>
              <div className="mt-1">{getRoleBadge()}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Último Login</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.last_login 
                  ? new Date(profile.last_login).toLocaleDateString('pt-BR') 
                  : 'Nunca'
                }
              </p>
            </div>
            {profile.department && (
              <div>
                <Label className="text-sm font-medium">Departamento</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile.department}</p>
              </div>
            )}
            {profile.phone && (
              <div>
                <Label className="text-sm font-medium">Telefone</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
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
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
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
    </div>
  )
}