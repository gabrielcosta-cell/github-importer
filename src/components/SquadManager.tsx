import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { IconPicker } from '@/components/IconPicker'
import * as LucideIcons from 'lucide-react'
import { Label } from '@/components/ui/label'

interface Squad {
  id: string
  name: string
  color: string
  icon: string
  position: number
  is_active: boolean
}

interface SquadManagerProps {
  open: boolean
  onClose: () => void
  onRefresh?: () => void
}

export const SquadManager = ({ open, onClose, onRefresh }: SquadManagerProps) => {
  const [squads, setSquads] = useState<Squad[]>([])
  const [newSquadName, setNewSquadName] = useState('')
  const [newSquadColor, setNewSquadColor] = useState('#6366f1')
  const [newSquadIcon, setNewSquadIcon] = useState('Users')
  const [editingSquad, setEditingSquad] = useState<{ id: string; name: string; color: string; icon: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSquads()
    }
  }, [open])

  const loadSquads = async () => {
    try {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true })

      if (error) throw error
      setSquads(data || [])
    } catch (error) {
      console.error('Erro ao carregar squads:', error)
      toast({
        title: "Erro ao carregar squads",
        description: "Não foi possível carregar a lista de squads.",
        variant: "destructive"
      })
    }
  }

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o squad.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      const maxPosition = squads.length > 0 ? Math.max(...squads.map(s => s.position)) : -1

      const { error } = await supabase
        .from('squads')
        .insert({
          name: newSquadName.trim(),
          color: newSquadColor,
          icon: newSquadIcon,
          position: maxPosition + 1,
          is_active: true
        })

      if (error) throw error

      toast({
        title: "Squad criado",
        description: `O squad "${newSquadName}" foi criado com sucesso.`
      })

      setNewSquadName('')
      setNewSquadColor('#6366f1')
      setNewSquadIcon('Users')
      await loadSquads()
      onRefresh?.()
    } catch (error: any) {
      console.error('Erro ao criar squad:', error)
      toast({
        title: "Erro ao criar squad",
        description: error.message || "Não foi possível criar o squad.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSquad = async () => {
    if (!editingSquad || !editingSquad.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o squad.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('squads')
        .update({
          name: editingSquad.name.trim(),
          color: editingSquad.color,
          icon: editingSquad.icon
        })
        .eq('id', editingSquad.id)

      if (error) throw error

      toast({
        title: "Squad atualizado",
        description: "O squad foi atualizado com sucesso."
      })

      setEditingSquad(null)
      await loadSquads()
      onRefresh?.()
    } catch (error: any) {
      console.error('Erro ao atualizar squad:', error)
      toast({
        title: "Erro ao atualizar squad",
        description: error.message || "Não foi possível atualizar o squad.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSquad = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o squad "${name}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Squad excluído",
        description: `O squad "${name}" foi excluído com sucesso.`
      })

      await loadSquads()
      onRefresh?.()
    } catch (error: any) {
      console.error('Erro ao deletar squad:', error)
      toast({
        title: "Erro ao deletar squad",
        description: error.message || "Não foi possível deletar o squad.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Squads</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Criar novo squad */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Criar Novo Squad</h3>
            <div className="grid gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do squad"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSquad()}
                  />
                </div>
                <div className="w-24">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={newSquadColor}
                    onChange={(e) => setNewSquadColor(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Ícone</Label>
                <IconPicker value={newSquadIcon} onChange={setNewSquadIcon} />
              </div>
              <Button onClick={handleCreateSquad} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Squad
              </Button>
            </div>
          </div>

          {/* Lista de squads existentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Squads Existentes</h3>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {squads.map((squad) => {
                const SquadIcon = (LucideIcons as any)[squad.icon] || LucideIcons.Users
                
                return (
                  <div
                    key={squad.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {editingSquad?.id === squad.id ? (
                      <div className="flex-1 grid gap-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              value={editingSquad.name}
                              onChange={(e) => setEditingSquad({ ...editingSquad, name: e.target.value })}
                              placeholder="Nome"
                            />
                          </div>
                          <Input
                            type="color"
                            value={editingSquad.color}
                            onChange={(e) => setEditingSquad({ ...editingSquad, color: e.target.value })}
                            className="w-20"
                          />
                        </div>
                        <IconPicker 
                          value={editingSquad.icon} 
                          onChange={(icon) => setEditingSquad({ ...editingSquad, icon })} 
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={handleUpdateSquad} disabled={loading} className="flex-1">
                            <Check className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSquad(null)}
                            disabled={loading}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: squad.color }}
                        >
                          <SquadIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="flex-1 font-medium">{squad.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSquad({ id: squad.id, name: squad.name, color: squad.color, icon: squad.icon })}
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSquad(squad.id, squad.name)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
