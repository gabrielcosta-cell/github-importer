import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SQUAD_COLORS } from '@/components/GestaoProjetosOperacao'
import { generateAffectedMonths, getPropagationDescription, MONTHS_FULL, type PropagationMode } from '@/utils/generateAffectedMonths'

interface SquadEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string
  companyName: string
  currentSquad: string
  selectedMonth: number
  selectedYear: number
  dataInicio?: string | null
  dataPerda?: string | null
  userId: string
  userName: string
  squads: Array<{ id: string; name: string }>
  onSaved: () => void
}

export const SquadEditDialog = ({
  open,
  onOpenChange,
  cardId,
  companyName,
  currentSquad,
  selectedMonth,
  selectedYear,
  dataInicio,
  dataPerda,
  userId,
  userName,
  squads,
  onSaved,
}: SquadEditDialogProps) => {
  const [newSquad, setNewSquad] = useState<string>(currentSquad)
  const [mode, setMode] = useState<PropagationMode>('only_this')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!newSquad || newSquad === currentSquad) {
      toast({ title: 'Selecione um squad diferente do atual', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const affectedMonths = generateAffectedMonths(mode, selectedMonth, selectedYear, dataInicio, dataPerda)

      const rows = affectedMonths.map(m => ({
        card_id: cardId,
        snapshot_month: m.month + 1,
        snapshot_year: m.year,
        squad: newSquad,
        company_name: companyName,
      }))

      const { error } = await supabase
        .from('csm_project_snapshots')
        .upsert(rows, { onConflict: 'card_id,snapshot_month,snapshot_year' })

      if (error) throw error

      const propagationDesc = getPropagationDescription(mode, selectedMonth, selectedYear)
      const now = new Date()
      const dateStr = format(now, "dd/MM/yy 'às' HH:mm", { locale: ptBR })
      const description = `Squad alterado de ${currentSquad} para ${newSquad} ${propagationDesc} por ${userName} - em ${dateStr}`

      await supabase.from('csm_activities').insert({
        card_id: cardId,
        activity_type: 'squad_change',
        title: 'Alteração de Squad',
        description,
        created_by: userId,
      })

      toast({ title: 'Squad atualizado com sucesso', description: `${affectedMonths.length} mês(es) afetado(s)` })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error saving squad:', err)
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const monthLabel = `${MONTHS_FULL[selectedMonth]}/${selectedYear}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Squad</DialogTitle>
          <DialogDescription>
            {companyName} — {monthLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Squad atual</Label>
            <div className="mt-1">
              <Badge className={`text-xs ${SQUAD_COLORS[currentSquad] || 'bg-muted text-muted-foreground'}`}>
                {currentSquad || 'Sem squad'}
              </Badge>
            </div>
          </div>

          <div>
            <Label>Novo squad</Label>
            <Select value={newSquad} onValueChange={setNewSquad}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o squad" />
              </SelectTrigger>
              <SelectContent>
                {squads.map(s => (
                  <SelectItem key={s.id} value={s.name} disabled={s.name === currentSquad}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aplicar esta alteração para:</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as PropagationMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="only_this" id="sq_only_this" />
                <Label htmlFor="sq_only_this" className="font-normal cursor-pointer">
                  Apenas {monthLabel}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_and_previous" id="sq_this_and_previous" />
                <Label htmlFor="sq_this_and_previous" className="font-normal cursor-pointer">
                  {monthLabel} e todos os anteriores
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_and_next" id="sq_this_and_next" />
                <Label htmlFor="sq_this_and_next" className="font-normal cursor-pointer">
                  {monthLabel} e todos os seguintes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="sq_all" />
                <Label htmlFor="sq_all" className="font-normal cursor-pointer">
                  Todos os meses
                </Label>
              </div>
            </RadioGroup>
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
