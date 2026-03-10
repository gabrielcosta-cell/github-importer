import type { ProjetoRow } from '@/components/GestaoProjetosOperacao'

const CACHE_KEY = 'dot:projetos_cache:v1'

export interface ProjetosCacheData {
  rawCsmRows: ProjetoRow[]
  rawCrmRows: ProjetoRow[]
  stagesList: Array<{ id: string; name: string }>
}

type PersistedCache = {
  v: 1
  ts: number
  data: ProjetosCacheData
}

export function readProjetosCache(maxAgeMs: number): ProjetosCacheData | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedCache
    if (!parsed || parsed.v !== 1 || !parsed.ts || !parsed.data) return null

    const age = Date.now() - parsed.ts
    if (age > maxAgeMs) return null

    return parsed.data
  } catch {
    return null
  }
}

export function writeProjetosCache(data: ProjetosCacheData) {
  try {
    if (typeof window === 'undefined') return
    const payload: PersistedCache = { v: 1, ts: Date.now(), data }
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / serialization issues
  }
}
