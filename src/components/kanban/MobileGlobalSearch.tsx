import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/external-client';
import { CRMCard, CRMPipeline, CRMStage } from '@/types/kanban';

interface SearchResult {
  card: CRMCard;
  pipelineId: string;
  pipelineName: string;
  stageName: string;
  stageColor: string;
}

interface MobileGlobalSearchProps {
  currentPipelineId: string;
  pipelines: CRMPipeline[];
  currentCards: CRMCard[];
  currentStages: CRMStage[];
  onSelectCard: (card: CRMCard, pipelineId: string) => void;
}

export const MobileGlobalSearch: React.FC<MobileGlobalSearchProps> = ({
  currentPipelineId,
  pipelines,
  currentCards,
  currentStages,
  onSelectCard,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache all pipeline data for instant cross-pipeline search
  const allDataRef = useRef<{
    cards: CRMCard[];
    stages: CRMStage[];
    pipelineMap: Record<string, string>;
    stageMap: Record<string, { name: string; color: string; pipelineId: string }>;
  }>({ cards: [], stages: [], pipelineMap: {}, stageMap: {} });

  // Preload all pipelines data on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [cardsRes, stagesRes] = await Promise.all([
          supabase.from('crm_cards').select('*').order('position'),
          supabase.from('crm_stages').select('*').eq('is_active', true).order('position'),
        ]);

        const allCards = (cardsRes.data || []) as CRMCard[];
        const allStages = (stagesRes.data || []) as CRMStage[];

        const pipelineMap: Record<string, string> = {};
        pipelines.forEach(p => { pipelineMap[p.id] = p.name; });

        const stageMap: Record<string, { name: string; color: string; pipelineId: string }> = {};
        allStages.forEach(s => {
          stageMap[s.id] = { name: s.name, color: s.color, pipelineId: s.pipeline_id };
        });

        allDataRef.current = { cards: allCards, stages: allStages, pipelineMap, stageMap };
      } catch (err) {
        console.error('Error preloading search data:', err);
      }
    };
    loadAllData();
  }, [pipelines]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const { cards, pipelineMap, stageMap } = allDataRef.current;

    const matched = cards
      .filter(card => {
        return (
          (card.title || '').toLowerCase().includes(q) ||
          (card.company_name || '').toLowerCase().includes(q) ||
          (card.contact_name || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 20)
      .map(card => {
        const stageInfo = stageMap[card.stage_id] || { name: '—', color: '#888', pipelineId: card.pipeline_id };
        return {
          card,
          pipelineId: card.pipeline_id,
          pipelineName: pipelineMap[card.pipeline_id] || 'Funil',
          stageName: stageInfo.name,
          stageColor: stageInfo.color,
        };
      });

    // Sort: current pipeline first
    matched.sort((a, b) => {
      if (a.pipelineId === currentPipelineId && b.pipelineId !== currentPipelineId) return -1;
      if (b.pipelineId === currentPipelineId && a.pipelineId !== currentPipelineId) return 1;
      return 0;
    });

    setResults(matched);
  }, [query, currentPipelineId]);

  const handleOpen = useCallback(() => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    setQuery('');
    setResults([]);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    onSelectCard(result.card, result.pipelineId);
    handleClose();
  }, [onSelectCard, handleClose]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Full-screen overlay when expanded (mobile only)
  if (expanded) {
    return (
      <div className="md:hidden absolute inset-0 z-[60] bg-background animate-in slide-in-from-bottom duration-300 flex flex-col">
        {/* Search header */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em todos os funis..."
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
          <button
            onClick={handleClose}
            className="text-sm font-medium text-primary px-2 py-1"
          >
            Cancelar
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!query.trim() ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Digite para buscar em todos os funis
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Nenhum resultado encontrado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map(result => (
                <button
                  key={result.card.id}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{result.card.title || result.card.company_name}</p>
                      {result.card.company_name && result.card.title !== result.card.company_name && (
                        <p className="text-xs text-muted-foreground truncate">{result.card.company_name}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: result.stageColor }} />
                        <span className="text-xs text-muted-foreground truncate">
                          {result.pipelineName} · {result.stageName}
                        </span>
                      </div>
                    </div>
                    {(result.card.monthly_revenue || 0) > 0 && (
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {formatCurrency(result.card.monthly_revenue || 0)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Collapsed: bottom bar pill button (mobile only)
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="px-4 py-2">
        <button
          onClick={handleOpen}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-muted/50 text-muted-foreground text-sm"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span>Buscar em todos os funis...</span>
        </button>
      </div>
    </div>
  );
};

// Desktop version: modal overlay search (Spotlight-style)
export const DesktopGlobalSearch: React.FC<MobileGlobalSearchProps & { searchTerm: string; onSearchChange: (v: string) => void }> = ({
  currentPipelineId,
  pipelines,
  currentCards,
  currentStages,
  onSelectCard,
  searchTerm,
  onSearchChange,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allDataRef = useRef<{
    cards: CRMCard[];
    pipelineMap: Record<string, string>;
    stageMap: Record<string, { name: string; color: string; pipelineId: string }>;
  }>({ cards: [], pipelineMap: {}, stageMap: {} });

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [cardsRes, stagesRes] = await Promise.all([
          supabase.from('crm_cards').select('*').order('position'),
          supabase.from('crm_stages').select('*').eq('is_active', true).order('position'),
        ]);

        const pipelineMap: Record<string, string> = {};
        pipelines.forEach(p => { pipelineMap[p.id] = p.name; });

        const stageMap: Record<string, { name: string; color: string; pipelineId: string }> = {};
        (stagesRes.data || []).forEach((s: any) => {
          stageMap[s.id] = { name: s.name, color: s.color, pipelineId: s.pipeline_id };
        });

        allDataRef.current = { cards: (cardsRes.data || []) as CRMCard[], pipelineMap, stageMap };
      } catch (err) {
        console.error('Error preloading search data:', err);
      }
    };
    loadAllData();
  }, [pipelines]);

  // Search within modal
  useEffect(() => {
    if (!modalQuery.trim()) {
      setResults([]);
      return;
    }

    const q = modalQuery.toLowerCase();
    const { cards, pipelineMap, stageMap } = allDataRef.current;

    const matched = cards
      .filter(card =>
        (card.title || '').toLowerCase().includes(q) ||
        (card.company_name || '').toLowerCase().includes(q) ||
        (card.contact_name || '').toLowerCase().includes(q)
      )
      .slice(0, 30)
      .map(card => {
        const stageInfo = stageMap[card.stage_id] || { name: '—', color: '#888', pipelineId: card.pipeline_id };
        return {
          card,
          pipelineId: card.pipeline_id,
          pipelineName: pipelineMap[card.pipeline_id] || 'Funil',
          stageName: stageInfo.name,
          stageColor: stageInfo.color,
        };
      });

    // Current pipeline first
    matched.sort((a, b) => {
      if (a.pipelineId === currentPipelineId && b.pipelineId !== currentPipelineId) return -1;
      if (b.pipelineId === currentPipelineId && a.pipelineId !== currentPipelineId) return 1;
      return 0;
    });

    setResults(matched);
  }, [modalQuery, currentPipelineId]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    setModalQuery(searchTerm);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [searchTerm]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalQuery('');
    setResults([]);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen, closeModal]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <>
      {/* Trigger: inline search bar */}
      <div className="relative flex-1 md:max-w-md md:mx-auto">
        <button
          onClick={openModal}
          className="w-full flex items-center gap-2 rounded-full border border-muted-foreground/20 bg-background/60 px-3 md:px-4 py-1 cursor-pointer hover:border-muted-foreground/40 transition-colors"
        >
          <Search className="h-4 w-4 text-foreground/60 flex-shrink-0" />
          <span className="h-8 flex items-center text-sm text-foreground/60">
            {searchTerm || 'Pesquisar...'}
          </span>
        </button>
      </div>

      {/* Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={closeModal}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal content */}
          <div
            className="relative w-full max-w-2xl bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={modalQuery}
                onChange={e => {
                  setModalQuery(e.target.value);
                  onSearchChange(e.target.value);
                }}
                placeholder="Buscar em todos os funis..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
                autoFocus
              />
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
              <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</span>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {modalQuery.trim() && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                  {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                </div>
              )}
              {!modalQuery.trim() ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Digite para buscar em todos os funis
                </div>
              ) : results.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum resultado encontrado
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {results.map(result => (
                    <button
                      key={result.card.id}
                      onClick={() => {
                        onSelectCard(result.card, result.pipelineId);
                        closeModal();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: result.stageColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{result.card.title || result.card.company_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.card.company_name && result.card.title !== result.card.company_name
                            ? `${result.card.company_name} · `
                            : ''}
                          {result.pipelineName} → {result.stageName}
                        </p>
                      </div>
                      {(result.card.monthly_revenue || 0) > 0 && (
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {formatCurrency(result.card.monthly_revenue || 0)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
