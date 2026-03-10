import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { parseISO } from 'date-fns'
import { CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines'
import type { ProjetoRow } from '@/components/GestaoProjetosOperacao'

const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555'

export const useProjetosData = (selectedPeriod: { month: number; year: number }) => {
  const [rawCsmRows, setRawCsmRows] = useState<ProjetoRow[]>([])
  const [rawCrmRows, setRawCrmRows] = useState<ProjetoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotsMap, setSnapshotsMap] = useState<Map<string, number>>(new Map())
  const [squadSnapshotsMap, setSquadSnapshotsMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Fetch stages for active clients pipeline
      const { data: stagesData } = await supabase
        .from('csm_stages')
        .select('id, name')
        .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
        .eq('is_active', true)

      const stagesMap = new Map<string, string>()
      if (stagesData) {
        for (const s of stagesData) stagesMap.set(s.id, s.name)
      }

      const { data: csmData } = await supabase
        .from('csm_cards')
        .select('id, display_id, company_name, title, squad, plano, fase_projeto, monthly_revenue, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, existe_comissao, observacao_comissao, criativos_estaticos, criativos_video, lps, limite_investimento, data_perda, motivo_perda, client_status, created_at, categoria, receita_gerada_cliente, stage_id')
        .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
        .order('display_id', { ascending: true, nullsFirst: false })

      const csmRows: ProjetoRow[] = (csmData || []).map(row => ({
        ...row,
        source: 'csm' as const,
        stage_name: row.stage_id ? stagesMap.get(row.stage_id) || '-' : '-',
      }))

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
                           pName === 'Vendas | Upsell' || pName === 'Upsell | CrossSell' ? 'Upsell' :
                           pName === 'Vendas | CrossSell' ? 'CrossSell' : 'Venda Ops'
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

    const matchedDisplayIds = new Set(rawCsmRows.map(r => r.display_id).filter(Boolean))
    const unmatchedCrm = rawCrmRows.filter(crm => !crm.display_id || !matchedDisplayIds.has(crm.display_id))

    return [...mergedCsm, ...unmatchedCrm]
  }, [rawCsmRows, rawCrmRows, selectedPeriod, snapshotsMap, squadSnapshotsMap])

  const refetchData = useCallback(async () => {
    setLoading(true)
    const { data: stagesData } = await supabase
      .from('csm_stages')
      .select('id, name')
      .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
      .eq('is_active', true)

    const stMap = new Map<string, string>()
    if (stagesData) {
      for (const s of stagesData) stMap.set(s.id, s.name)
    }

    const { data: csmData } = await supabase
      .from('csm_cards')
      .select('id, display_id, company_name, title, squad, plano, fase_projeto, monthly_revenue, servico_contratado, data_contrato, data_inicio, tempo_contrato, valor_contrato, niche, existe_comissao, observacao_comissao, criativos_estaticos, criativos_video, lps, limite_investimento, data_perda, motivo_perda, client_status, created_at, categoria, receita_gerada_cliente, stage_id')
      .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
      .order('display_id', { ascending: true, nullsFirst: false })

    const csmRows: ProjetoRow[] = (csmData || []).map(row => ({
      ...row,
      source: 'csm' as const,
      stage_name: row.stage_id ? stMap.get(row.stage_id) || '-' : '-',
    }))

    setRawCsmRows(csmRows)
    setLoading(false)
    await fetchSnapshots()
  }, [fetchSnapshots])

  // Expose stages list for dialogs
  const [stagesList, setStagesList] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    supabase
      .from('csm_stages')
      .select('id, name, position')
      .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => {
        setStagesList((data || []).map(s => ({ id: s.id, name: s.name })))
      })
  }, [])

  return { liveData, rawCsmRows, rawCrmRows, loading, fetchSnapshots, refetchData, stagesList }
}

// Shared filter functions
export const wasRelevantInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
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

export const isChurnedInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
  if (p.client_status !== 'cancelado' || !p.data_perda) return false
  const perdaDate = parseISO(p.data_perda)
  return perdaDate.getMonth() === month && perdaDate.getFullYear() === year
}

export const isActiveInMonth = (p: ProjetoRow, month: number, year: number): boolean => {
  return wasRelevantInMonth(p, month, year) && !isChurnedInMonth(p, month, year)
}
