import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StageEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string
  companyName: string
  currentStageName: string
  currentStageId: string
  stages: Array<{ id: string; name: string }>
  userId: string
  userName: string
  onSaved: () => void
}

export const StageEditDialog = ({
  open,
  onOpenChange,
  cardId,
  companyName,
  currentStageName,
  currentStageId,
  stages,
  userId,
  userName,
  onSaved,
}: StageEditDialogProps) => {
  const [newStageId, setNewStageId] = useState<string>(currentStageId)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const newStageName = stages.find(s => s.id === newStageId)?.name || ''

  const handleSave = async () => {
    if (!newStageId || newStageId === currentStageId) {
      toast({ title: 'Selecione uma fase diferente da atual', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('csm_cards')
        .update({ stage_id: newStageId })
        .eq('id', cardId)

      if (error) throw error

      const now = new Date()
      const dateStr = format(now, "dd/MM/yy 'às' HH:mm", { locale: ptBR })
      const description = `Fase do contrato alterada de ${currentStageName} para ${newStageName} por ${userName} - em ${dateStr}`

      await supabase.from('csm_activities').insert({
        card_id: cardId,
        activity_type: 'stage_change',
        title: 'Alteração de Fase do contrato',
        description,
        created_by: userId,
      })

      toast({ title: 'Fase do contrato atualizada com sucesso' })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error saving stage:', err)
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Fase do contrato</DialogTitle>
          <DialogDescription>{companyName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Fase atual</Label>
            <p className="mt-1 text-sm font-medium">{currentStageName || 'Sem fase'}</p>
          </div>

          <div>
            <Label>Nova fase</Label>
            <Select value={newStageId} onValueChange={setNewStageId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a fase" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id} disabled={s.id === currentStageId}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
