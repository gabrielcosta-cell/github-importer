import type { CSMCard, CSMPipeline, CSMStage } from "@/types/kanban";

const CACHE_KEY = "dot:csm_kanban_cache:v1";

export interface CSMKanbanCacheData {
  pipelines: CSMPipeline[];
  selectedPipeline: string;
  stages: CSMStage[];
  cards: CSMCard[];
  cardTagsMap: Record<string, string[]>;
  availableTags: Array<{ id: string; name: string; color: string }>;
}

type PersistedCache = {
  v: 1;
  ts: number;
  data: CSMKanbanCacheData;
};

export function readCSMKanbanCache(maxAgeMs: number): CSMKanbanCacheData | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedCache;
    if (!parsed || parsed.v !== 1 || !parsed.ts || !parsed.data) return null;

    const age = Date.now() - parsed.ts;
    if (age > maxAgeMs) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCSMKanbanCache(data: CSMKanbanCacheData) {
  try {
    if (typeof window === "undefined") return;
    const payload: PersistedCache = { v: 1, ts: Date.now(), data };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / serialization issues
  }
}
