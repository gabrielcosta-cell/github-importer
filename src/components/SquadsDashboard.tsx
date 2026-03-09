import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/utils/formatCurrency'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import { differenceInMonths, parseISO } from 'date-fns'
import { SQUAD_COLORS, type ProjetoRow } from '@/components/GestaoProjetosOperacao'
import { wasRelevantInMonth, isChurnedInMonth, isActiveInMonth } from '@/hooks/useProjetosData'

interface SquadsDashboardProps {
  liveData: ProjetoRow[]
  loading: boolean
  selectedPeriod: { month: number; year: number }
  onPeriodChange: (period: { month: number; year: number }) => void
}

interface SquadMetrics {
  squad: string
  baseNovosChurn: number
  mrrRecorrente: number
  mrrBase: number
  mrrVendido: number
  mrrVendidoOperacao: number
  comissoes: number
  ltMedio: number
  revenueChurn: number
  revenueChurnPercent: number
  tmChurn: number
  logoChurnPercent: number
  vmInvestida: number
  vendasGeradas: number
  roi: number
  mpa: number
  mrrFinal: number
  receitaLiquida: number
}

const calcTempoDOTMonths = (dataInicio?: string | null, dataPerda?: string | null): number => {
  if (!dataInicio) return 0
  try {
    const start = parseISO(dataInicio)
    const end = dataPerda ? parseISO(dataPerda) : new Date()
    return Math.max(0, differenceInMonths(end, start))
  } catch { return 0 }
}

export const SquadsDashboard = ({ liveData, loading, selectedPeriod, onPeriodChange }: SquadsDashboardProps) => {
  const squadMetrics = useMemo(() => {
    const { month, year } = selectedPeriod

    // Get all unique squads
    const squadsSet = new Set<string>()
    liveData.forEach(r => { if (r.squad) squadsSet.add(r.squad) })
    const squadNames = Array.from(squadsSet).sort()

    const metrics: SquadMetrics[] = squadNames.map(squad => {
      // Filter liveData by squad
      const squadData = liveData.filter(r => r.squad === squad)
      const relevantData = squadData.filter(r => wasRelevantInMonth(r, month, year))
      const activeData = squadData.filter(r => isActiveInMonth(r, month, year))
      const churnedData = squadData.filter(r => isChurnedInMonth(r, month, year))

      // Only CSM source for base metrics
      const relevantCsm = relevantData.filter(r => r.source !== 'crm-ops')
      const activeCsm = activeData.filter(r => r.source !== 'crm-ops')
      const churnedCsm = churnedData.filter(r => r.source !== 'crm-ops')

      // CRM-ops cards for this squad in this month
      const crmOpsInMonth = relevantData.filter(r => r.source === 'crm-ops')

      const baseNovosChurn = relevantCsm.length

      const mrrRecorrente = activeCsm
        .filter(r => !r.categoria || r.categoria === 'MRR Recorrente' || r.categoria === 'MRR recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const mrrBase = relevantCsm
        .filter(r => !r.categoria || r.categoria === 'MRR Recorrente' || r.categoria === 'MRR recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const mrrVendido = activeCsm
        .filter(r => r.categoria === 'MRR Vendido')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      // CRM revenue from merged data (crm_revenue, variavel_midia, variavel_vendas on CSM rows)
      const mrrVendidoOperacao = activeCsm.reduce((sum, r) => sum + (r.crm_revenue || 0), 0)
        + crmOpsInMonth.reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const comissoes = activeCsm.reduce((sum, r) => sum + (r.variavel_midia_revenue || 0) + (r.variavel_vendas_revenue || 0), 0)

      // LT Médio
      const ltValues = relevantCsm.map(r => calcTempoDOTMonths(r.data_inicio, r.data_perda))
      const ltMedio = ltValues.length > 0 ? ltValues.reduce((a, b) => a + b, 0) / ltValues.length : 0

      const revenueChurn = churnedCsm.reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)
      const revenueChurnPercent = mrrBase > 0 ? (revenueChurn / mrrBase) * 100 : 0
      const tmChurn = churnedCsm.length > 0 ? revenueChurn / churnedCsm.length : 0
      const logoChurnPercent = relevantCsm.length > 0 ? (churnedCsm.length / relevantCsm.length) * 100 : 0

      const vmInvestida = activeCsm.reduce((sum, r) => sum + (r.limite_investimento || 0), 0)
      const vendasGeradas = activeCsm.reduce((sum, r) => sum + (r.receita_gerada_cliente || 0), 0)
      const roi = vmInvestida > 0 ? vendasGeradas / vmInvestida : 0

      const mpaValues = activeCsm.map(r => calcTempoDOTMonths(r.data_inicio, null))
      const mpa = mpaValues.length > 0 ? mpaValues.reduce((a, b) => a + b, 0) / mpaValues.length : 0

      const mrrFinal = activeCsm
        .filter(r => !r.categoria || r.categoria === 'MRR Recorrente' || r.categoria === 'MRR recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const receitaLiquida = mrrFinal - revenueChurn

      return {
        squad, baseNovosChurn, mrrRecorrente, mrrBase, mrrVendido, mrrVendidoOperacao, comissoes,
        ltMedio, revenueChurn, revenueChurnPercent, tmChurn, logoChurnPercent,
        vmInvestida, vendasGeradas, roi, mpa, mrrFinal, receitaLiquida,
      }
    }).filter(m => m.baseNovosChurn > 0 || m.mrrVendidoOperacao > 0 || m.comissoes > 0)

    return metrics
  }, [liveData, selectedPeriod])

  // Totals row
  const totals = useMemo(() => {
    const t: SquadMetrics = {
      squad: 'Total',
      baseNovosChurn: 0, mrrRecorrente: 0, mrrBase: 0, mrrVendido: 0, mrrVendidoOperacao: 0, comissoes: 0,
      ltMedio: 0, revenueChurn: 0, revenueChurnPercent: 0, tmChurn: 0, logoChurnPercent: 0,
      vmInvestida: 0, vendasGeradas: 0, roi: 0, mpa: 0, mrrFinal: 0, receitaLiquida: 0,
    }
    for (const m of squadMetrics) {
      t.baseNovosChurn += m.baseNovosChurn
      t.mrrRecorrente += m.mrrRecorrente
      t.mrrBase += m.mrrBase
      t.mrrVendido += m.mrrVendido
      t.mrrVendidoOperacao += m.mrrVendidoOperacao
      t.comissoes += m.comissoes
      t.revenueChurn += m.revenueChurn
      t.vmInvestida += m.vmInvestida
      t.vendasGeradas += m.vendasGeradas
      t.mrrFinal += m.mrrFinal
      t.receitaLiquida += m.receitaLiquida
    }
    const count = squadMetrics.length || 1
    t.ltMedio = squadMetrics.reduce((s, m) => s + m.ltMedio, 0) / count
    t.mpa = squadMetrics.reduce((s, m) => s + m.mpa, 0) / count
    t.revenueChurnPercent = squadMetrics.reduce((s, m) => s + m.revenueChurnPercent, 0) / count
    t.tmChurn = squadMetrics.reduce((s, m) => s + m.tmChurn, 0) / count
    t.logoChurnPercent = squadMetrics.reduce((s, m) => s + m.logoChurnPercent, 0) / count
    t.roi = t.vmInvestida > 0 ? t.vendasGeradas / t.vmInvestida : 0
    return t
  }, [squadMetrics])

  const formatPercent = (v: number) => `${v.toFixed(2)}%`
  const formatDecimal = (v: number) => v.toFixed(1)

  const columns = [
    { key: 'squad', label: 'Squad', sticky: true },
    { key: 'baseNovosChurn', label: 'Base + Novos + Churn' },
    { key: 'mrrBase', label: 'MRR da Base', currency: true },
    { key: 'mrrRecorrente', label: 'MRR Recorrente', currency: true },
    { key: 'mrrVendido', label: 'MRR Vendido', currency: true },
    { key: 'mrrVendidoOperacao', label: 'MRR Vendido Op.', currency: true },
    { key: 'comissoes', label: 'Comissões', currency: true },
    { key: 'ltMedio', label: 'LT Médio', decimal: true },
    { key: 'revenueChurn', label: 'Revenue Churn', currency: true },
    { key: 'revenueChurnPercent', label: 'Rev. Churn %', percent: true },
    { key: 'tmChurn', label: 'TM Churn', currency: true },
    { key: 'logoChurnPercent', label: '% Logo Churn', percent: true },
    { key: 'vmInvestida', label: 'VM Investida', currency: true },
    { key: 'vendasGeradas', label: 'Vendas Geradas', currency: true },
    { key: 'roi', label: 'ROI', decimal: true },
    { key: 'mpa', label: 'MPA', decimal: true },
    { key: 'mrrFinal', label: 'MRR Final', currency: true },
    { key: 'receitaLiquida', label: 'Receita Líquida', currency: true },
  ] as const

  const renderValue = (col: typeof columns[number], value: any) => {
    if ('currency' in col && col.currency) return formatCurrency(value || 0)
    if ('percent' in col && col.percent) return formatPercent(value || 0)
    if ('decimal' in col && col.decimal) return formatDecimal(value || 0)
    return value
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Squads</CardTitle>
              <MonthYearPicker
                selectedPeriods={[selectedPeriod]}
                onPeriodsChange={(periods) => {
                  if (periods.length > 0) onPeriodChange(periods[0])
                }}
                singleSelect
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{squadMetrics.length} squads</span>
              <span className="text-sm font-medium">MRR Total: {formatCurrency(totals.mrrRecorrente + totals.mrrVendido)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando...</div>
          ) : squadMetrics.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">Nenhuma squad encontrada.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap ${
                          col.key === 'squad' ? 'sticky left-0 z-10' : ''
                        } ${col.key !== 'squad' ? 'text-right' : ''} min-w-[120px]`}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squadMetrics.map((m) => (
                    <TableRow key={m.squad}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`text-sm whitespace-nowrap ${
                            col.key === 'squad' ? 'sticky left-0 z-10 bg-background font-medium' : ''
                          } ${col.key !== 'squad' ? 'text-right' : ''} ${
                            col.key === 'revenueChurn' || col.key === 'revenueChurnPercent' ? 'text-destructive' : ''
                          } ${col.key === 'receitaLiquida' ? 'font-semibold' : ''}`}
                        >
                          {col.key === 'squad' ? (
                            <Badge className={`text-xs ${SQUAD_COLORS[m.squad] || 'bg-muted text-muted-foreground'}`}>
                              {m.squad}
                            </Badge>
                          ) : (
                            renderValue(col, (m as any)[col.key])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`text-sm whitespace-nowrap font-semibold ${
                          col.key === 'squad' ? 'sticky left-0 z-10 bg-muted/50' : ''
                        } ${col.key !== 'squad' ? 'text-right' : ''}`}
                      >
                        {col.key === 'squad' ? 'Total' : renderValue(col, (totals as any)[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
