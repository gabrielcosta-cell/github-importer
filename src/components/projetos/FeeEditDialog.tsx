import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { MRRInput } from '@/components/kanban/MRRInput'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/utils/formatCurrency'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { generateAffectedMonths, getPropagationDescription, MONTHS_FULL, type PropagationMode } from '@/utils/generateAffectedMonths'

interface FeeEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string
  companyName: string
  currentFee: number
  selectedMonth: number // 0-indexed
  selectedYear: number
  dataInicio?: string | null
  dataPerda?: string | null
  userId: string
  userName: string
  onSaved: () => void
}


export const FeeEditDialog = ({
  open,
  onOpenChange,
  cardId,
  companyName,
  currentFee,
  selectedMonth,
  selectedYear,
  dataInicio,
  dataPerda,
  userId,
  userName,
  onSaved,
}: FeeEditDialogProps) => {
  const [newFee, setNewFee] = useState<number | null>(currentFee)
  const [mode, setMode] = useState<PropagationMode>('only_this')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (newFee === null || newFee === currentFee) {
      toast({ title: 'Informe um valor diferente do atual', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const affectedMonths = generateAffectedMonths(mode, selectedMonth, selectedYear, dataInicio, dataPerda)

      // Batch upsert snapshots
      const rows = affectedMonths.map(m => ({
        card_id: cardId,
        snapshot_month: m.month + 1, // DB uses 1-indexed months
        snapshot_year: m.year,
        monthly_revenue: newFee,
        company_name: companyName,
      }))

      const { error } = await supabase
        .from('csm_project_snapshots')
        .upsert(rows, { onConflict: 'card_id,snapshot_month,snapshot_year' })

      if (error) throw error

      // Create audit log in csm_activities
      const propagationDesc = getPropagationDescription(mode, selectedMonth, selectedYear)
      const now = new Date()
      const dateStr = format(now, "dd/MM/yy", { locale: ptBR })
      const description = `MRR alterado de ${formatCurrency(currentFee)} para ${formatCurrency(newFee)} ${propagationDesc} por ${userName} - em ${dateStr}`

      await supabase.from('csm_activities').insert({
        card_id: cardId,
        activity_type: 'fee_change',
        title: 'Alteração de Fee (MRR)',
        description,
        created_by: userId,
      })

      toast({ title: 'Fee atualizado com sucesso', description: `${affectedMonths.length} mês(es) afetado(s)` })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error saving fee:', err)
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
          <DialogTitle>Editar Fee (MRR)</DialogTitle>
          <DialogDescription>
            {companyName} — {monthLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Valor atual</Label>
            <p className="text-sm font-medium">{formatCurrency(currentFee)}</p>
          </div>

          <div>
            <Label>Novo valor</Label>
            <MRRInput value={newFee} onChange={setNewFee} />
          </div>

          <div className="space-y-2">
            <Label>Aplicar este valor para:</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as PropagationMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="only_this" id="only_this" />
                <Label htmlFor="only_this" className="font-normal cursor-pointer">
                  Apenas {monthLabel}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_and_previous" id="this_and_previous" />
                <Label htmlFor="this_and_previous" className="font-normal cursor-pointer">
                  {monthLabel} e todos os anteriores
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_and_next" id="this_and_next" />
                <Label htmlFor="this_and_next" className="font-normal cursor-pointer">
                  {monthLabel} e todos os seguintes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
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
