import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '@/utils/formatCurrency'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import { differenceInMonths, parseISO } from 'date-fns'
import { SQUAD_COLORS, type ProjetoRow } from '@/components/GestaoProjetosOperacao'
import { CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines'

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555'

interface SquadMetrics {
  squad: string
  baseNovosChurn: number
  mrrRecorrente: number
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

export const SquadsDashboard = () => {
  const now = new Date()
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth(), year: now.getFullYear() })
  const [rawCsmRows, setRawCsmRows] = useState<ProjetoRow[]>([])
  const [rawCrmRows, setRawCrmRows] = useState<ProjetoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: csmData } = await supabase
        .from('csm_cards')
        .select('id, display_id, company_name, title, squad, monthly_revenue, data_inicio, data_perda, client_status, created_at, data_contrato, categoria, limite_investimento, receita_gerada_cliente')
        .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)

      const csmRows: ProjetoRow[] = (csmData || []).map(row => ({ ...row, source: 'csm' as const }))

      const { data: crmPipelines } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .in('name', CRM_OPS_PIPELINE_NAMES)
        .eq('is_active', true)

      let crmOpsRows: ProjetoRow[] = []
      if (crmPipelines && crmPipelines.length > 0) {
        const pipelineIds = crmPipelines.map(p => p.id)
        const { data: crmData } = await supabase
          .from('csm_cards')
          .select('id, display_id, company_name, title, squad, monthly_revenue, created_at, tipo_receita, data_ganho, migrado_csm')
          .in('pipeline_id', pipelineIds)
          .gt('monthly_revenue', 0)

        crmOpsRows = (crmData || []).map(row => ({
          ...row,
          source: 'crm-ops' as const,
          tipo_receita: (row as any).tipo_receita,
          data_ganho: (row as any).data_ganho,
          migrado_csm: (row as any).migrado_csm,
        }))
      }

      setRawCsmRows(csmRows)
      setRawCrmRows(crmOpsRows)
      setLoading(false)
    }
    fetchData()
  }, [])

  const wasRelevantInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
    const startDateStr = p.data_inicio || p.data_contrato || p.created_at
    if (startDateStr) {
      const dateOnly = startDateStr.substring(0, 10)
      const startDate = new Date(dateOnly + 'T12:00:00')
      if (startDate > endOfMonth) return false
    }
    if (p.client_status !== 'cancelado') return true
    if (!p.data_perda) return false
    const perdaDate = parseISO(p.data_perda)
    const perdaMonth = perdaDate.getMonth()
    const perdaYear = perdaDate.getFullYear()
    if (perdaYear > year) return true
    if (perdaYear === year && perdaMonth >= month) return true
    return false
  }

  const isChurnedInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    if (p.client_status !== 'cancelado' || !p.data_perda) return false
    const perdaDate = parseISO(p.data_perda)
    return perdaDate.getMonth() === month && perdaDate.getFullYear() === year
  }

  const isActiveInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    return wasRelevantInMonth(p, month, year) && !isChurnedInMonth(p, month, year)
  }

  const isCrmInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    if (p.migrado_csm) return false
    const dateStr = (p.data_ganho || p.created_at || '').substring(0, 10)
    if (!dateStr) return false
    const d = new Date(dateStr + 'T12:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  }

  const calcTempoDOTMonths = (dataInicio?: string | null, dataPerda?: string | null): number => {
    if (!dataInicio) return 0
    try {
      const start = parseISO(dataInicio)
      const end = dataPerda ? parseISO(dataPerda) : new Date()
      return Math.max(0, differenceInMonths(end, start))
    } catch { return 0 }
  }

  const squadMetrics = useMemo(() => {
    const { month, year } = selectedPeriod

    // Get all unique squads from CSM
    const squadsSet = new Set<string>()
    rawCsmRows.forEach(r => { if (r.squad) squadsSet.add(r.squad) })
    const squadNames = Array.from(squadsSet).sort()

    const metrics: SquadMetrics[] = squadNames.map(squad => {
      // CSM cards for this squad
      const squadCsm = rawCsmRows.filter(r => r.squad === squad)
      const relevantCsm = squadCsm.filter(r => wasRelevantInMonth(r, month, year))
      const activeCsm = squadCsm.filter(r => isActiveInMonth(r, month, year))
      const churnedCsm = squadCsm.filter(r => isChurnedInMonth(r, month, year))

      // CRM cards for this squad in this month
      const squadCrm = rawCrmRows.filter(r => r.squad === squad && isCrmInMonth(r, month, year))

      const baseNovosChurn = relevantCsm.length

      const mrrRecorrente = activeCsm
        .filter(r => r.categoria === 'MRR Recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const mrrVendido = activeCsm
        .filter(r => r.categoria === 'MRR Vendido')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const mrrVendidoOperacao = squadCrm
        .filter(r => r.tipo_receita === 'venda_unica' || r.tipo_receita === 'venda_recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const comissoes = squadCrm
        .filter(r => r.tipo_receita === 'variavel_midia' || r.tipo_receita === 'variavel_meta')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      // LT Médio: average months of all relevant clients
      const ltValues = relevantCsm.map(r => calcTempoDOTMonths(r.data_inicio, r.data_perda))
      const ltMedio = ltValues.length > 0 ? ltValues.reduce((a, b) => a + b, 0) / ltValues.length : 0

      const revenueChurn = churnedCsm.reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)
      const revenueChurnPercent = mrrRecorrente > 0 ? (revenueChurn / mrrRecorrente) * 100 : 0
      const tmChurn = churnedCsm.length > 0 ? revenueChurn / churnedCsm.length : 0
      const logoChurnPercent = relevantCsm.length > 0 ? (churnedCsm.length / relevantCsm.length) * 100 : 0

      const vmInvestida = activeCsm.reduce((sum, r) => sum + (r.limite_investimento || 0), 0)
      const vendasGeradas = activeCsm.reduce((sum, r) => sum + (r.receita_gerada_cliente || 0), 0)
      const roi = vmInvestida > 0 ? vendasGeradas / vmInvestida : 0

      // MPA: média de meses apenas dos ativos
      const mpaValues = activeCsm.map(r => calcTempoDOTMonths(r.data_inicio, null))
      const mpa = mpaValues.length > 0 ? mpaValues.reduce((a, b) => a + b, 0) / mpaValues.length : 0

      const mrrFinal = activeCsm
        .filter(r => r.categoria === 'MRR Recorrente')
        .reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      const receitaLiquida = mrrFinal - revenueChurn

      return {
        squad,
        baseNovosChurn,
        mrrRecorrente,
        mrrVendido,
        mrrVendidoOperacao,
        comissoes,
        ltMedio,
        revenueChurn,
        revenueChurnPercent,
        tmChurn,
        logoChurnPercent,
        vmInvestida,
        vendasGeradas,
        roi,
        mpa,
        mrrFinal,
        receitaLiquida,
      }
    })

    return metrics
  }, [rawCsmRows, rawCrmRows, selectedPeriod])

  // Totals row
  const totals = useMemo(() => {
    const t: SquadMetrics = {
      squad: 'Total',
      baseNovosChurn: 0, mrrRecorrente: 0, mrrVendido: 0, mrrVendidoOperacao: 0, comissoes: 0,
      ltMedio: 0, revenueChurn: 0, revenueChurnPercent: 0, tmChurn: 0, logoChurnPercent: 0,
      vmInvestida: 0, vendasGeradas: 0, roi: 0, mpa: 0, mrrFinal: 0, receitaLiquida: 0,
    }
    for (const m of squadMetrics) {
      t.baseNovosChurn += m.baseNovosChurn
      t.mrrRecorrente += m.mrrRecorrente
      t.mrrVendido += m.mrrVendido
      t.mrrVendidoOperacao += m.mrrVendidoOperacao
      t.comissoes += m.comissoes
      t.revenueChurn += m.revenueChurn
      t.vmInvestida += m.vmInvestida
      t.vendasGeradas += m.vendasGeradas
      t.mrrFinal += m.mrrFinal
      t.receitaLiquida += m.receitaLiquida
    }
    // Averages
    const count = squadMetrics.length || 1
    t.ltMedio = squadMetrics.reduce((s, m) => s + m.ltMedio, 0) / count
    t.mpa = squadMetrics.reduce((s, m) => s + m.mpa, 0) / count
    t.revenueChurnPercent = t.mrrRecorrente > 0 ? (t.revenueChurn / t.mrrRecorrente) * 100 : 0
    t.tmChurn = squadMetrics.reduce((s, m) => s + m.tmChurn, 0) / count
    t.logoChurnPercent = squadMetrics.reduce((s, m) => s + m.logoChurnPercent, 0) / count
    t.roi = t.vmInvestida > 0 ? t.vendasGeradas / t.vmInvestida : 0
    return t
  }, [squadMetrics])

  const formatPercent = (v: number) => `${v.toFixed(1)}%`
  const formatDecimal = (v: number) => v.toFixed(1)

  const columns = [
    { key: 'squad', label: 'Squad', sticky: true },
    { key: 'baseNovosChurn', label: 'Base + Novos + Churn' },
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
                  if (periods.length > 0) setSelectedPeriod(periods[0])
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
                  {/* Totals row */}
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
