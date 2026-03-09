import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Search, ArrowUp, ArrowDown, ArrowUpDown, Filter, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '@/utils/formatCurrency'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import { differenceInMonths, parseISO, format } from 'date-fns'
import { CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines'
import { useAuth } from '@/contexts/AuthContext'
import { FeeEditDialog } from '@/components/projetos/FeeEditDialog'
import { SquadEditDialog } from '@/components/projetos/SquadEditDialog'

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555'

export interface ProjetoRow {
  id: string
  display_id?: number
  company_name?: string
  title?: string
  squad?: string
  plano?: string
  fase_projeto?: string
  monthly_revenue?: number
  servico_contratado?: string
  data_contrato?: string
  data_inicio?: string
  tempo_contrato?: string
  valor_contrato?: number
  niche?: string
  existe_comissao?: boolean
  observacao_comissao?: string
  criativos_estaticos?: number
  criativos_video?: number
  lps?: number
  limite_investimento?: number
  data_perda?: string
  motivo_perda?: string
  client_status?: string
  created_at?: string
  source?: 'csm' | 'crm-ops'
  tipo_receita?: string
  data_ganho?: string
  migrado_csm?: boolean
  categoria?: string
  receita_gerada_cliente?: number
  pipeline_id?: string
  pipeline_name?: string
  // Campos de merge CRM
  crm_revenue?: number
  crm_tipo_receita?: string
  crm_card_id?: string
  variavel_midia_revenue?: number
  variavel_vendas_revenue?: number
}

const calcEtapaFormal = (dataInicio?: string | null): string => {
  if (!dataInicio) return '-'
  try {
    const start = parseISO(dataInicio)
    const diff = differenceInMonths(new Date(), start)
    if (diff <= 0) return 'Onboarding'
    if (diff === 1) return 'Implementação'
    if (diff === 2) return 'Refinamento'
    if (diff === 3) return 'Escala'
    if (diff === 4) return 'Expansão'
    if (diff === 5) return 'Renovação'
    return 'Retenção'
  } catch { return '-' }
}

const calcTempoDOT = (dataInicio?: string | null, dataPerda?: string | null): string => {
  if (!dataInicio) return '-'
  try {
    const start = parseISO(dataInicio)
    const end = dataPerda ? parseISO(dataPerda) : new Date()
    const months = differenceInMonths(end, start)
    if (months <= 0) return '< 1 mês'
    return `${months} ${months === 1 ? 'mês' : 'meses'}`
  } catch { return '-' }
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch { return dateStr }
}

export const SQUAD_COLORS: Record<string, string> = {
  Apollo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Athena: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Ares: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Artemis: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

const PLANO_COLORS: Record<string, string> = {
  Starter: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  Business: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Pro: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  Conceito: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  Social: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
}

const MONTHS_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type SortDirection = 'asc' | 'desc'

// Extracts unique non-empty values for a given accessor
const getUniqueValues = (data: ProjetoRow[], accessor: (p: ProjetoRow) => string | undefined): string[] => {
  const vals = new Set<string>()
  data.forEach(p => {
    const v = accessor(p)
    if (v && v !== '-') vals.add(v)
  })
  return Array.from(vals).sort()
}

// --- SortableHeader component ---
interface SortableHeaderProps {
  label: string
  columnKey: string
  sortColumn: string | null
  sortDirection: SortDirection
  onSort: (key: string) => void
  filterValues?: string[]
  activeFilters?: string[]
  onFilterChange?: (key: string, values: string[]) => void
  className?: string
}

const SortableHeader = ({ label, columnKey, sortColumn, sortDirection, onSort, filterValues, activeFilters, onFilterChange, className }: SortableHeaderProps) => {
  const isActive = sortColumn === columnKey
  const hasFilter = filterValues && filterValues.length > 0
  const hasActiveFilter = activeFilters && activeFilters.length > 0

  return (
    <TableHead className={className}>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onSort(columnKey)}
          className="flex items-center gap-1 hover:text-foreground transition-colors text-left font-medium"
        >
          {label}
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </button>
        {hasFilter && onFilterChange && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={`p-0.5 rounded hover:bg-muted transition-colors ${hasActiveFilter ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}>
                <Filter className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {hasActiveFilter && (
                  <button
                    onClick={() => onFilterChange(columnKey, [])}
                    className="text-xs text-muted-foreground hover:text-foreground mb-1 underline"
                  >
                    Limpar filtros
                  </button>
                )}
                {filterValues!.map(val => (
                  <label key={val} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={activeFilters?.includes(val) ?? false}
                      onCheckedChange={(checked) => {
                        const current = activeFilters || []
                        const next = checked ? [...current, val] : current.filter(v => v !== val)
                        onFilterChange(columnKey, next)
                      }}
                    />
                    <span className="truncate">{val}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  )
}

// --- Accessor helpers for sorting/filtering ---
const COLUMN_ACCESSORS: Record<string, (p: ProjetoRow) => string | number | undefined> = {
  display_id: p => p.display_id,
  nome: p => (p.company_name || p.title || '').toLowerCase(),
  origem: p => {
    if (p.source === 'crm-ops' && p.pipeline_name) return p.pipeline_name
    return p.source === 'crm-ops' ? 'Venda Ops' : 'CSM'
  },
  tipo_receita: p => {
    const map: Record<string, string> = { venda_unica: 'Venda Única', variavel_midia: 'Var. Mídia', variavel_meta: 'Var. Meta', venda_recorrente: 'Recorrente' }
    return p.tipo_receita ? (map[p.tipo_receita] || p.tipo_receita) : '-'
  },
  squad: p => p.squad || '-',
  plano: p => p.plano || '-',
  etapa_formal: p => calcEtapaFormal(p.data_inicio),
  fase_projeto: p => p.fase_projeto || '-',
  monthly_revenue: p => p.monthly_revenue || 0,
  crm_revenue: p => p.crm_revenue || 0,
  variavel_midia_revenue: p => p.variavel_midia_revenue || 0,
  variavel_vendas_revenue: p => p.variavel_vendas_revenue || 0,
  total_revenue: p => (p.monthly_revenue || 0) + (p.crm_revenue || 0) + (p.variavel_midia_revenue || 0) + (p.variavel_vendas_revenue || 0),
  servico: p => p.servico_contratado || '-',
  data_contrato: p => p.data_contrato || '',
  tempo_dot: p => {
    if (!p.data_inicio) return 0
    try { return differenceInMonths(p.data_perda ? parseISO(p.data_perda) : new Date(), parseISO(p.data_inicio)) } catch { return 0 }
  },
  tempo_contrato: p => p.tempo_contrato ? parseInt(p.tempo_contrato) : 0,
  valor_contrato: p => p.valor_contrato || 0,
  niche: p => p.niche || '-',
  comissao: p => p.existe_comissao ? 'Sim' : 'Não',
  estaticos: p => p.criativos_estaticos ?? 0,
  videos: p => p.criativos_video ?? 0,
  lps: p => p.lps ?? 0,
  limite_investimento: p => p.limite_investimento || 0,
  churn: p => p.data_perda || '',
  motivo: p => p.motivo_perda || '-',
}

const FILTERABLE_COLUMNS: Record<string, (p: ProjetoRow) => string | undefined> = {
  origem: p => {
    if (p.source === 'crm-ops' && p.pipeline_name) return p.pipeline_name
    return p.source === 'crm-ops' ? 'Venda Ops' : 'CSM'
  },
  tipo_receita: p => {
    const map: Record<string, string> = { venda_unica: 'Venda Única', variavel_midia: 'Var. Mídia', variavel_meta: 'Var. Meta', venda_recorrente: 'Recorrente' }
    return p.tipo_receita ? (map[p.tipo_receita] || p.tipo_receita) : undefined
  },
  squad: p => p.squad || undefined,
  plano: p => p.plano || undefined,
  etapa_formal: p => { const v = calcEtapaFormal(p.data_inicio); return v !== '-' ? v : undefined },
  fase_projeto: p => p.fase_projeto || undefined,
  servico: p => p.servico_contratado || undefined,
  niche: p => p.niche || undefined,
  comissao: p => p.existe_comissao ? 'Sim' : 'Não',
}

export const GestaoProjetosOperacao = () => {
  const now = new Date()
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth(), year: now.getFullYear() })
  const [rawCsmRows, setRawCsmRows] = useState<ProjetoRow[]>([])
  const [rawCrmRows, setRawCrmRows] = useState<ProjetoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [squads, setSquads] = useState<Array<{ id: string; name: string }>>([])
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [snapshotsMap, setSnapshotsMap] = useState<Map<string, number>>(new Map())
  const [squadSnapshotsMap, setSquadSnapshotsMap] = useState<Map<string, string>>(new Map())
  const [feeEditData, setFeeEditData] = useState<{ cardId: string; companyName: string; currentFee: number; dataInicio?: string | null; dataPerda?: string | null } | null>(null)
  const [squadEditData, setSquadEditData] = useState<{ cardId: string; companyName: string; currentSquad: string; dataInicio?: string | null; dataPerda?: string | null } | null>(null)
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const isGlobalAdmin = profile?.is_global_admin === true

  useEffect(() => {
    supabase.from('squads').select('id, name').eq('is_active', true).order('position').then(({ data }) => {
      setSquads(data || [])
    })
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: csmData } = await supabase
        .from('csm_cards')
        .select('id, display_id, company_name, title, squad, plano, fase_projeto, monthly_revenue, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, existe_comissao, observacao_comissao, criativos_estaticos, criativos_video, lps, limite_investimento, data_perda, motivo_perda, client_status, created_at, categoria, receita_gerada_cliente')
        .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
        .order('display_id', { ascending: true, nullsFirst: false })

      const csmRows: ProjetoRow[] = (csmData || []).map(row => ({ ...row, source: 'csm' as const }))

      const { data: crmPipelines } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .in('name', CRM_OPS_PIPELINE_NAMES)
        .eq('is_active', true)

      let crmOpsRows: ProjetoRow[] = []
      const pipelineNameMap = new Map<string, string>()
      if (crmPipelines && crmPipelines.length > 0) {
        const pipelineIds = crmPipelines.map(p => p.id)
        for (const p of crmPipelines) pipelineNameMap.set(p.id, p.name)
        const { data: crmData } = await supabase
          .from('csm_cards')
          .select('id, display_id, company_name, title, squad, plano, fase_projeto, monthly_revenue, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, existe_comissao, observacao_comissao, criativos_estaticos, criativos_video, lps, limite_investimento, data_perda, motivo_perda, client_status, created_at, tipo_receita, data_ganho, migrado_csm, pipeline_id')
          .in('pipeline_id', pipelineIds)
          .gt('monthly_revenue', 0)
          .order('created_at', { ascending: false })

        crmOpsRows = (crmData || []).map(row => {
          const pName = pipelineNameMap.get((row as any).pipeline_id) || ''
          const shortName = pName === 'Variável | Verba de Mídia' ? 'Var. Mídia' :
                           pName === 'Variável | Vendas do cliente' ? 'Var. Vendas' :
                           pName === 'Upsell | CrossSell' ? 'Upsell' : 'Venda Ops'
          return {
            ...row,
            source: 'crm-ops' as const,
            tipo_receita: (row as any).tipo_receita,
            data_ganho: (row as any).data_ganho,
            migrado_csm: (row as any).migrado_csm,
            pipeline_id: (row as any).pipeline_id,
            pipeline_name: shortName,
          }
        })
      }

      setRawCsmRows(csmRows)
      setRawCrmRows(crmOpsRows)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Fetch snapshots for selected period
  const fetchSnapshots = useCallback(async () => {
    const { data } = await supabase
      .from('csm_project_snapshots')
      .select('card_id, monthly_revenue, squad')
      .eq('snapshot_month', selectedPeriod.month + 1)
      .eq('snapshot_year', selectedPeriod.year)

    const map = new Map<string, number>()
    const sqMap = new Map<string, string>()
    if (data) {
      for (const s of data) {
        if (s.monthly_revenue != null) map.set(s.card_id, s.monthly_revenue)
        if (s.squad) sqMap.set(s.card_id, s.squad)
      }
    }
    setSnapshotsMap(map)
    setSquadSnapshotsMap(sqMap)
  }, [selectedPeriod])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  // Merge dinâmico: só acumula crm_revenue quando o mês do card CRM coincide com selectedPeriod
  const liveData = useMemo(() => {
    const { month, year } = selectedPeriod

    const isInMonth = (crm: ProjetoRow) => {
      const dateStr = (crm.data_ganho || crm.created_at || '').substring(0, 10)
      if (!dateStr) return false
      const d = new Date(dateStr + 'T12:00:00')
      return d.getMonth() === month && d.getFullYear() === year
    }

    // Build CSM rows with CRM revenue merged only for the selected month
    const mergedCsm = rawCsmRows.map(csm => {
      const snapshotRevenue = snapshotsMap.get(csm.id)
      const snapshotSquad = squadSnapshotsMap.get(csm.id)
      const effectiveRevenue = snapshotRevenue !== undefined ? snapshotRevenue : csm.monthly_revenue
      const effectiveSquad = snapshotSquad || csm.squad
      const hasSnapshot = snapshotRevenue !== undefined
      const hasSquadSnapshot = !!snapshotSquad

      const matchingCrm = rawCrmRows.filter(crm =>
        crm.display_id && crm.display_id === csm.display_id && isInMonth(crm)
      )

      let crmRev = 0, varMidiaRev = 0, varVendasRev = 0
      let crmTipo: string | undefined
      let crmCardId: string | undefined

      for (const crm of matchingCrm) {
        const rev = crm.monthly_revenue || 0
        if (crm.pipeline_name === 'Var. Mídia') {
          varMidiaRev += rev
        } else if (crm.pipeline_name === 'Var. Vendas') {
          varVendasRev += rev
        } else {
          crmRev += rev
          crmTipo = crm.tipo_receita || crmTipo
          crmCardId = crm.id
        }
      }

      return {
        ...csm,
        squad: effectiveSquad,
        monthly_revenue: effectiveRevenue,
        _hasSnapshot: hasSnapshot,
        _hasSquadSnapshot: hasSquadSnapshot,
        crm_revenue: crmRev,
        crm_tipo_receita: crmTipo,
        crm_card_id: crmCardId,
        variavel_midia_revenue: varMidiaRev,
        variavel_vendas_revenue: varVendasRev,
      }
    })

    // CRM cards without a matching CSM card (unmatched) — kept as independent rows
    const matchedDisplayIds = new Set(rawCsmRows.map(r => r.display_id).filter(Boolean))
    const unmatchedCrm = rawCrmRows.filter(crm => !crm.display_id || !matchedDisplayIds.has(crm.display_id))

    return [...mergedCsm, ...unmatchedCrm]
  }, [rawCsmRows, rawCrmRows, selectedPeriod, snapshotsMap, squadSnapshotsMap])

  const wasRelevantInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    if (p.source === 'crm-ops') {
      if (p.migrado_csm) return false
      const createdDateOnly = (p.created_at || '').substring(0, 10)
      const createdAt = new Date(createdDateOnly + 'T12:00:00')
      return createdAt.getMonth() === month && createdAt.getFullYear() === year
    }
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

  const handleSort = useCallback((key: string) => {
    if (sortColumn === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }, [sortColumn])

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }))
  }, [])

  const displayData = useMemo(() => {
    let filtered = liveData.filter(p => {
      const name = (p.company_name || p.title || '').toLowerCase()
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())
      const matchesStatus = wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year)
      const hasCrmRevenueThisMonth = !matchesStatus && p.source === 'csm' && (p.crm_revenue || 0) > 0
      return matchesSearch && (matchesStatus || hasCrmRevenueThisMonth)
    }).map(p => {
      if (!wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year) && p.source === 'csm' && (p.crm_revenue || 0) > 0) {
        return { ...p, source: 'crm-ops' as const, crm_revenue: 0 }
      }
      return p
    })

    // Apply column filters
    for (const [key, values] of Object.entries(columnFilters)) {
      if (values.length === 0) continue
      const accessor = FILTERABLE_COLUMNS[key]
      if (!accessor) continue
      filtered = filtered.filter(p => {
        const val = accessor(p)
        return val ? values.includes(val) : false
      })
    }

    // Apply sorting
    if (sortColumn) {
      const accessor = COLUMN_ACCESSORS[sortColumn]
      if (accessor) {
        filtered.sort((a, b) => {
          const va = accessor(a)
          const vb = accessor(b)
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          if (typeof va === 'number' && typeof vb === 'number') {
            return sortDirection === 'asc' ? va - vb : vb - va
          }
          const sa = String(va)
          const sb = String(vb)
          return sortDirection === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
        })
      }
    }

    return filtered
  }, [liveData, searchTerm, selectedPeriod, sortColumn, sortDirection, columnFilters])

  const mrrRecorrente = useMemo(() => displayData.filter(p => p.source !== 'crm-ops' && (p.categoria === 'MRR recorrente' || p.categoria === 'MRR Recorrente')).reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])
  const mrrRecorrenteCount = useMemo(() => displayData.filter(p => p.source !== 'crm-ops' && (p.categoria === 'MRR recorrente' || p.categoria === 'MRR Recorrente')).length, [displayData])
  const mrrVendido = useMemo(() => displayData.filter(p => p.source !== 'crm-ops' && p.categoria === 'MRR Vendido').reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])
  const mrrVendidoCount = useMemo(() => displayData.filter(p => p.source !== 'crm-ops' && p.categoria === 'MRR Vendido').length, [displayData])
  const totalMRR = useMemo(() => mrrRecorrente + mrrVendido, [mrrRecorrente, mrrVendido])
  const totalCRM = useMemo(() => displayData.reduce((sum, p) => sum + (p.crm_revenue || 0) + (p.source === 'crm-ops' ? (p.monthly_revenue || 0) : 0), 0), [displayData])
  const totalVarMidia = useMemo(() => displayData.reduce((sum, p) => sum + (p.variavel_midia_revenue || 0), 0), [displayData])
  const totalVarVendas = useMemo(() => displayData.reduce((sum, p) => sum + (p.variavel_vendas_revenue || 0), 0), [displayData])
  const totalGeral = useMemo(() => totalMRR + totalCRM + totalVarMidia + totalVarVendas, [totalMRR, totalCRM, totalVarMidia, totalVarVendas])

  const { churnCount, churnMRR } = useMemo(() => {
    const churned = liveData.filter(p => {
      if (!p.data_perda) return false
      const d = parseISO(p.data_perda)
      return d.getMonth() === selectedPeriod.month && d.getFullYear() === selectedPeriod.year
    })
    return {
      churnCount: churned.length,
      churnMRR: churned.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
    }
  }, [liveData, selectedPeriod])

  // Unique filter values computed from period-filtered data (before column filters)
  const periodData = useMemo(() => {
    return liveData.filter(p => wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year))
  }, [liveData, selectedPeriod])

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const key of Object.keys(FILTERABLE_COLUMNS)) {
      opts[key] = getUniqueValues(periodData, FILTERABLE_COLUMNS[key] as (p: ProjetoRow) => string | undefined)
    }
    return opts
  }, [periodData])

  const downloadCSV = () => {
    const headers = ['ID', 'Nome', 'Origem', 'Tipo Receita', 'Squad', 'Plano', 'Etapa Formal', 'Fase do Projeto', 'Fee (MRR)', 'Vendas CRM', 'Var. Mídia', 'Var. Vendas', 'Total', 'Serviço', 'Data Assinatura', 'Tempo de DOT', 'Tempo Contrato', 'Valor Contrato', 'Nicho', 'Comissão', 'Criativos Estáticos', 'Criativos Vídeo', 'LPs', 'Limite Investimento', 'Churn', 'Motivo']
    const csv = [
      headers.join(','),
      ...displayData.map(p => {
        const origem = p.source === 'crm-ops' ? (p.pipeline_name || 'Venda Ops') : 'CSM'
        return [
          p.display_id ? `#${String(p.display_id).padStart(4, '0')}` : '-',
          p.company_name || p.title || '-',
          origem,
          p.tipo_receita || '-',
          p.squad || '-',
          p.plano || '-',
          calcEtapaFormal(p.data_inicio),
          p.fase_projeto || '-',
          p.monthly_revenue || 0,
          p.crm_revenue || 0,
          p.variavel_midia_revenue || 0,
          p.variavel_vendas_revenue || 0,
          (p.monthly_revenue || 0) + (p.crm_revenue || 0) + (p.variavel_midia_revenue || 0) + (p.variavel_vendas_revenue || 0),
          p.servico_contratado || '-',
          p.data_contrato || '-',
          calcTempoDOT(p.data_inicio, p.data_perda),
          p.tempo_contrato || '-',
          p.valor_contrato || 0,
          p.niche || '-',
          p.existe_comissao ? 'Sim' : 'Não',
          p.criativos_estaticos ?? '-',
          p.criativos_video ?? '-',
          p.lps ?? '-',
          p.limite_investimento ?? '-',
          p.data_perda || '-',
          p.motivo_perda || '-',
        ].map(f => `"${f}"`).join(',')
      })
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `projetos_${MONTHS_LABEL[selectedPeriod.month]}_${selectedPeriod.year}.csv`
    link.click()
  }

  const activeFilterCount = Object.values(columnFilters).reduce((sum, v) => sum + v.length, 0)

  const sharedHeaderProps = { sortColumn, sortDirection, onSort: handleSort, onFilterChange: handleFilterChange }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              
              <MonthYearPicker
                selectedPeriods={[selectedPeriod]}
                onPeriodsChange={(periods) => {
                  if (periods.length > 0) setSelectedPeriod(periods[0])
                }}
                singleSelect
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">MRR Base: {formatCurrency(mrrRecorrente)} <span className="text-muted-foreground font-normal">({mrrRecorrenteCount} clientes)</span></span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">MRR Vendido: {formatCurrency(mrrVendido)} <span className="text-muted-foreground font-normal">({mrrVendidoCount} clientes)</span></span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">Total MRR: {formatCurrency(totalMRR)}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">CRM: {formatCurrency(totalCRM + totalVarMidia + totalVarVendas)} <span className="text-muted-foreground font-normal">({displayData.filter(p => p.source === 'crm-ops').length} vendas)</span></span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">Faturamento: {formatCurrency(totalGeral)}</span>
              <span className="text-muted-foreground">|</span>
              <span className={`text-sm font-medium ${churnCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Churn: {churnCount} {churnCount === 1 ? 'cliente' : 'clientes'}</span>
              <span className="text-muted-foreground">|</span>
              <span className={`text-sm font-medium ${churnCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>MRR Perdido: {formatCurrency(churnMRR)}</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setColumnFilters({})}>
                  Limpar filtros ({activeFilterCount})
                </Button>
              )}
              <Button onClick={downloadCSV} variant="ghost" size="icon" className="h-9 w-9 border-0 shadow-none">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando...</div>
          ) : displayData.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              Nenhum cliente encontrado para este período.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortableHeader label="ID" columnKey="display_id" {...sharedHeaderProps} className="sticky left-0 z-10 bg-primary text-primary-foreground min-w-[60px]" />
                    <SortableHeader label="Nome" columnKey="nome" {...sharedHeaderProps} className="sticky left-[60px] z-10 bg-primary text-primary-foreground min-w-[180px]" />
                    <SortableHeader label="Squad" columnKey="squad" {...sharedHeaderProps} filterValues={filterOptions.squad} activeFilters={columnFilters.squad} className="sticky left-[240px] z-10 bg-primary text-primary-foreground min-w-[90px]" />
                    <SortableHeader label="Origem" columnKey="origem" {...sharedHeaderProps} filterValues={filterOptions.origem} activeFilters={columnFilters.origem} className="min-w-[80px]" />
                    <SortableHeader label="Tipo Receita" columnKey="tipo_receita" {...sharedHeaderProps} filterValues={filterOptions.tipo_receita} activeFilters={columnFilters.tipo_receita} className="min-w-[120px]" />
                    <SortableHeader label="Plano" columnKey="plano" {...sharedHeaderProps} filterValues={filterOptions.plano} activeFilters={columnFilters.plano} className="min-w-[90px]" />
                    <SortableHeader label="Etapa Formal" columnKey="etapa_formal" {...sharedHeaderProps} filterValues={filterOptions.etapa_formal} activeFilters={columnFilters.etapa_formal} className="min-w-[110px]" />
                    <SortableHeader label="Fase do Projeto" columnKey="fase_projeto" {...sharedHeaderProps} filterValues={filterOptions.fase_projeto} activeFilters={columnFilters.fase_projeto} className="min-w-[120px]" />
                    <SortableHeader label="Fee (MRR)" columnKey="monthly_revenue" {...sharedHeaderProps} className="min-w-[110px] text-right" />
                    <SortableHeader label="Vendas CRM" columnKey="crm_revenue" {...sharedHeaderProps} className="min-w-[110px] text-right" />
                    <SortableHeader label="Var. Mídia" columnKey="variavel_midia_revenue" {...sharedHeaderProps} className="min-w-[100px] text-right" />
                    <SortableHeader label="Var. Vendas" columnKey="variavel_vendas_revenue" {...sharedHeaderProps} className="min-w-[100px] text-right" />
                    <SortableHeader label="Total" columnKey="total_revenue" {...sharedHeaderProps} className="min-w-[110px] text-right" />
                    <SortableHeader label="Serviço" columnKey="servico" {...sharedHeaderProps} filterValues={filterOptions.servico} activeFilters={columnFilters.servico} className="min-w-[130px]" />
                    <SortableHeader label="Data Assinatura" columnKey="data_contrato" {...sharedHeaderProps} className="min-w-[110px]" />
                    <SortableHeader label="Tempo de DOT" columnKey="tempo_dot" {...sharedHeaderProps} className="min-w-[100px]" />
                    <SortableHeader label="Tempo Contrato" columnKey="tempo_contrato" {...sharedHeaderProps} className="min-w-[100px]" />
                    <SortableHeader label="Valor Contrato" columnKey="valor_contrato" {...sharedHeaderProps} className="min-w-[120px] text-right" />
                    <SortableHeader label="Nicho" columnKey="niche" {...sharedHeaderProps} filterValues={filterOptions.niche} activeFilters={columnFilters.niche} className="min-w-[110px]" />
                    <SortableHeader label="Comissão" columnKey="comissao" {...sharedHeaderProps} filterValues={filterOptions.comissao} activeFilters={columnFilters.comissao} className="min-w-[100px]" />
                    <SortableHeader label="Estáticos" columnKey="estaticos" {...sharedHeaderProps} className="min-w-[80px] text-center" />
                    <SortableHeader label="Vídeos" columnKey="videos" {...sharedHeaderProps} className="min-w-[80px] text-center" />
                    <SortableHeader label="LPs" columnKey="lps" {...sharedHeaderProps} className="min-w-[60px] text-center" />
                    <SortableHeader label="Lim. Investimento" columnKey="limite_investimento" {...sharedHeaderProps} className="min-w-[110px] text-right" />
                    <SortableHeader label="Churn" columnKey="churn" {...sharedHeaderProps} className="min-w-[100px]" />
                    <SortableHeader label="Motivo" columnKey="motivo" {...sharedHeaderProps} className="min-w-[130px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((p) => (
                    <TableRow key={p.id} className={p.client_status === 'cancelado' ? 'opacity-50' : ''}>
                      <TableCell className="sticky left-0 z-10 bg-background font-mono text-xs">
                        {p.display_id ? `#${String(p.display_id).padStart(4, '0')}` : '-'}
                      </TableCell>
                      <TableCell className="sticky left-[60px] z-10 bg-background font-medium text-sm max-w-[200px] truncate">
                        {p.company_name || p.title || '-'}
                      </TableCell>
                      <TableCell className="sticky left-[240px] z-10 bg-background">
                        {p.squad ? (
                          (profile?.role === 'admin' || isGlobalAdmin) && p.source !== 'crm-ops' ? (
                            <button
                              onClick={() => setSquadEditData({
                                cardId: p.id,
                                companyName: p.company_name || p.title || '',
                                currentSquad: p.squad || '',
                                dataInicio: p.data_inicio,
                                dataPerda: p.data_perda,
                              })}
                              className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity group cursor-pointer"
                              title="Editar Squad"
                            >
                              <Badge className={`text-xs ${(p as any)._hasSquadSnapshot ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : (SQUAD_COLORS[p.squad] || 'bg-muted text-muted-foreground')}`}>
                                {p.squad}
                              </Badge>
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
                            </button>
                          ) : (
                            <Badge className={`text-xs ${(p as any)._hasSquadSnapshot ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : (SQUAD_COLORS[p.squad] || 'bg-muted text-muted-foreground')}`}>
                              {p.squad}
                            </Badge>
                          )
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {p.source === 'crm-ops' ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" variant="outline">
                            {p.pipeline_name || 'Venda Ops'}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" variant="outline">
                            CSM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.tipo_receita === 'venda_unica' ? 'Venda Única' :
                         p.tipo_receita === 'variavel_midia' ? 'Var. Mídia' :
                         p.tipo_receita === 'variavel_meta' ? 'Var. Meta' :
                         p.tipo_receita === 'venda_recorrente' ? 'Recorrente' : '-'}
                      </TableCell>
                      <TableCell>
                        {p.plano ? (
                          <Badge className={`text-xs ${PLANO_COLORS[p.plano] || 'bg-muted text-muted-foreground'}`}>
                            {p.plano}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{calcEtapaFormal(p.data_inicio)}</TableCell>
                      <TableCell className="text-sm">{p.fase_projeto || '-'}</TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {p.source === 'crm-ops' ? (
                          <span>-</span>
                        ) : isGlobalAdmin && p.source === 'csm' ? (
                          <button
                            onClick={() => setFeeEditData({
                              cardId: p.id,
                              companyName: p.company_name || p.title || '',
                              currentFee: p.monthly_revenue || 0,
                              dataInicio: p.data_inicio,
                              dataPerda: p.data_perda,
                            })}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors group cursor-pointer"
                            title="Editar Fee (MRR)"
                          >
                            <span className={(p as any)._hasSnapshot ? 'text-amber-600 dark:text-amber-400' : ''}>
                              {p.monthly_revenue ? formatCurrency(p.monthly_revenue) : '-'}
                            </span>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        ) : (
                          <span className={(p as any)._hasSnapshot ? 'text-amber-600 dark:text-amber-400' : ''}>
                            {p.monthly_revenue ? formatCurrency(p.monthly_revenue) : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {p.source === 'crm-ops'
                          ? (p.monthly_revenue ? formatCurrency(p.monthly_revenue) : (p.crm_revenue ? formatCurrency(p.crm_revenue) : '-'))
                          : (p.crm_revenue ? formatCurrency(p.crm_revenue) : '-')}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {p.variavel_midia_revenue ? formatCurrency(p.variavel_midia_revenue) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {p.variavel_vendas_revenue ? formatCurrency(p.variavel_vendas_revenue) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold">
                        {formatCurrency((p.monthly_revenue || 0) + (p.crm_revenue || 0) + (p.variavel_midia_revenue || 0) + (p.variavel_vendas_revenue || 0))}
                      </TableCell>
                      <TableCell className="text-sm">{p.servico_contratado || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.data_contrato)}</TableCell>
                      <TableCell className="text-sm">{calcTempoDOT(p.data_inicio, p.data_perda)}</TableCell>
                      <TableCell className="text-sm">{p.tempo_contrato ? `${p.tempo_contrato} meses` : '-'}</TableCell>
                      <TableCell className="text-sm text-right">
                        {p.valor_contrato ? formatCurrency(p.valor_contrato) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{p.niche || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {p.existe_comissao ? (
                          <span className="text-green-600 dark:text-green-400" title={p.observacao_comissao || ''}>Sim</span>
                        ) : 'Não'}
                      </TableCell>
                      <TableCell className="text-sm text-center">{p.criativos_estaticos ?? '-'}</TableCell>
                      <TableCell className="text-sm text-center">{p.criativos_video ?? '-'}</TableCell>
                      <TableCell className="text-sm text-center">{p.lps ?? '-'}</TableCell>
                      <TableCell className="text-sm text-right">
                        {p.limite_investimento ? formatCurrency(p.limite_investimento) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.data_perda ? formatDate(p.data_perda) : '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate" title={p.motivo_perda || ''}>
                        {p.motivo_perda || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {feeEditData && user && profile && (
        <FeeEditDialog
          open={!!feeEditData}
          onOpenChange={(open) => { if (!open) setFeeEditData(null) }}
          cardId={feeEditData.cardId}
          companyName={feeEditData.companyName}
          currentFee={feeEditData.currentFee}
          selectedMonth={selectedPeriod.month}
          selectedYear={selectedPeriod.year}
          dataInicio={feeEditData.dataInicio}
          dataPerda={feeEditData.dataPerda}
          userId={user.id}
          userName={profile.name}
          onSaved={fetchSnapshots}
        />
      )}

      {squadEditData && user && profile && (
        <SquadEditDialog
          open={!!squadEditData}
          onOpenChange={(open) => { if (!open) setSquadEditData(null) }}
          cardId={squadEditData.cardId}
          companyName={squadEditData.companyName}
          currentSquad={squadEditData.currentSquad}
          selectedMonth={selectedPeriod.month}
          selectedYear={selectedPeriod.year}
          dataInicio={squadEditData.dataInicio}
          dataPerda={squadEditData.dataPerda}
          userId={user.id}
          userName={profile.name}
          squads={squads}
          onSaved={fetchSnapshots}
        />
      )}
    </div>
  )
}
