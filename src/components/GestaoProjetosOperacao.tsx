import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '@/utils/formatCurrency'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import { differenceInMonths, parseISO, format } from 'date-fns'

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555'

interface ProjetoRow {
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
}

// Calcula Etapa Formal baseado em data_inicio
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

// Calcula Tempo de DOT em meses
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

const SQUAD_COLORS: Record<string, string> = {
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

export const GestaoProjetosOperacao = () => {
  const now = new Date()
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth(), year: now.getFullYear() })
  const [liveData, setLiveData] = useState<ProjetoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [squadFilter, setSquadFilter] = useState<string>('all')
  const [planoFilter, setPlanoFilter] = useState<string>('all')
  const [squads, setSquads] = useState<Array<{ id: string; name: string }>>([])
  const { toast } = useToast()

  // Fetch squads
  useEffect(() => {
    supabase.from('squads').select('id, name').eq('is_active', true).order('position').then(({ data }) => {
      setSquads(data || [])
    })
  }, [])

  // Fetch live data from csm_cards
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('csm_cards')
        .select('id, display_id, company_name, title, squad, plano, fase_projeto, monthly_revenue, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, existe_comissao, observacao_comissao, criativos_estaticos, criativos_video, lps, limite_investimento, data_perda, motivo_perda, client_status, created_at')
        .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
        .order('display_id', { ascending: true, nullsFirst: false })

      if (!error) setLiveData(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  // Verifica se o cliente era relevante no mês selecionado
  const wasRelevantInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
    if (p.created_at) {
      const createdAt = parseISO(p.created_at)
      if (createdAt > endOfMonth) return false
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

  // Data to render
  const displayData = useMemo(() => {
    return liveData.filter(p => {
      const name = (p.company_name || p.title || '').toLowerCase()
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase())
      const matchesSquad = squadFilter === 'all' || p.squad === squadFilter
      const matchesPlano = planoFilter === 'all' || p.plano === planoFilter
      const matchesStatus = wasRelevantInMonth(p, selectedPeriod.month, selectedPeriod.year)
      return matchesSearch && matchesSquad && matchesPlano && matchesStatus
    })
  }, [liveData, searchTerm, squadFilter, planoFilter, selectedPeriod])

  // MRR total
  const totalMRR = useMemo(() => displayData.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0), [displayData])

  // CSV export
  const downloadCSV = () => {
    const headers = ['ID', 'Nome', 'Squad', 'Plano', 'Etapa Formal', 'Fase do Projeto', 'Fee (MRR)', 'Serviço', 'Data Assinatura', 'Tempo de DOT', 'Tempo Contrato', 'Valor Contrato', 'Nicho', 'Comissão', 'Criativos Estáticos', 'Criativos Vídeo', 'LPs', 'Limite Investimento', 'Churn', 'Motivo']
    const csv = [
      headers.join(','),
      ...displayData.map(p => [
        p.display_id ? `#${String(p.display_id).padStart(4, '0')}` : '-',
        p.company_name || p.title || '-',
        p.squad || '-',
        p.plano || '-',
        calcEtapaFormal(p.data_inicio),
        p.fase_projeto || '-',
        p.monthly_revenue || 0,
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
      ].map(f => `"${f}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `projetos_${MONTHS_LABEL[selectedPeriod.month]}_${selectedPeriod.year}.csv`
    link.click()
  }

  const planos = Array.from(new Set(liveData.map(p => p.plano).filter(Boolean)))

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Projetos</h1>
        <p className="text-lg text-muted-foreground">Quadro de clientes e alocação (Operação)</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Projetos</CardTitle>
              <MonthYearPicker
                selectedPeriods={[selectedPeriod]}
                onPeriodsChange={(periods) => {
                  if (periods.length > 0) setSelectedPeriod(periods[0])
                }}
                singleSelect
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={downloadCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={squadFilter} onValueChange={setSquadFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Squad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {squads.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={planoFilter} onValueChange={setPlanoFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {planos.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span>{displayData.length} clientes</span>
              <span className="font-medium text-foreground">MRR: {formatCurrency(totalMRR)}</span>
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
                    <TableHead className="sticky left-0 z-10 bg-muted/30 min-w-[60px]">ID</TableHead>
                    <TableHead className="sticky left-[60px] z-10 bg-muted/30 min-w-[180px]">Nome</TableHead>
                    <TableHead className="min-w-[90px]">Squad</TableHead>
                    <TableHead className="min-w-[90px]">Plano</TableHead>
                    <TableHead className="min-w-[110px]">Etapa Formal</TableHead>
                    <TableHead className="min-w-[120px]">Fase do Projeto</TableHead>
                    <TableHead className="min-w-[110px] text-right">Fee (MRR)</TableHead>
                    <TableHead className="min-w-[130px]">Serviço</TableHead>
                    <TableHead className="min-w-[110px]">Data Assinatura</TableHead>
                    <TableHead className="min-w-[100px]">Tempo de DOT</TableHead>
                    <TableHead className="min-w-[100px]">Tempo Contrato</TableHead>
                    <TableHead className="min-w-[120px] text-right">Valor Contrato</TableHead>
                    <TableHead className="min-w-[110px]">Nicho</TableHead>
                    <TableHead className="min-w-[100px]">Comissão</TableHead>
                    <TableHead className="min-w-[80px] text-center">Estáticos</TableHead>
                    <TableHead className="min-w-[80px] text-center">Vídeos</TableHead>
                    <TableHead className="min-w-[60px] text-center">LPs</TableHead>
                    <TableHead className="min-w-[110px] text-right">Lim. Investimento</TableHead>
                    <TableHead className="min-w-[100px]">Churn</TableHead>
                    <TableHead className="min-w-[130px]">Motivo</TableHead>
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
                      <TableCell>
                        {p.squad ? (
                          <Badge className={`text-xs ${SQUAD_COLORS[p.squad] || 'bg-muted text-muted-foreground'}`}>
                            {p.squad}
                          </Badge>
                        ) : '-'}
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
                        {p.monthly_revenue ? formatCurrency(p.monthly_revenue) : '-'}
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
    </div>
  )
}
