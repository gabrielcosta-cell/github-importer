import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { syncSquadSnapshotsToCards } from '@/utils/syncSquadSnapshots';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ToolbarButton } from '@/components/ui/toolbar-button';
import { Plus, LayoutGrid, Rocket, Moon, Shield, Flame, Sunrise, DollarSign, Info, ArrowUpDown, UserPlus, Settings, Pencil, Tag, Zap, Trophy, ThumbsDown, ListChecks, FileDown, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sortTags } from '@/utils/tagSorting';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KanbanBoard } from './kanban/KanbanBoard';
import { PipelineSelector, SuggestedStage } from './kanban/PipelineSelector';
import { StageManager } from './kanban/StageManager';
import { PipelineOrderManager } from './kanban/PipelineOrderManager';
import { CardForm } from './kanban/CardForm';
import { CSMSimpleCardForm } from './kanban/CSMSimpleCardForm';
import { CardDetailsDialog } from './kanban/CardDetailsDialog';
import { FilterPopover } from './csm/FilterPopover';
import { CSMPipeline, CSMStage, CSMCard } from '@/types/kanban';
import { useAutoMoveCards } from '@/hooks/useAutoMoveCards';

import { DotLogo } from '@/components/DotLogo';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { readCSMKanbanCache, writeCSMKanbanCache } from '@/utils/csmKanbanSessionCache';
import { Input } from '@/components/ui/input';
import { MobileStageSwiper } from './kanban/MobileStageSwiper';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

interface CSMKanbanProps {
  openCardId?: string | null;
  openCardKey?: number;
}

export const CSMKanban: React.FC<CSMKanbanProps> = ({ openCardId, openCardKey }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.is_global_admin;

  const MAX_CACHE_AGE_MS = 1000 * 60 * 60; // 1h
  const [initialCache] = useState(() => readCSMKanbanCache(MAX_CACHE_AGE_MS));
  const hasUsefulCache = !!(initialCache && initialCache.pipelines?.length);

  // Ler cardId da URL para reabrir automaticamente após reload
  const cardIdFromUrl = searchParams.get('cardId');

  // Tentar abrir o card instantaneamente a partir do cache (evita flicker)
  const [cardOpenedFromCache] = useState<CSMCard | null>(() => {
    const targetCardId = cardIdFromUrl || openCardId;
    if (!targetCardId || !initialCache?.cards?.length) return null;
    const cachedCard = initialCache.cards.find(c => c.id === targetCardId);
    return cachedCard ?? null;
  });

  // Helper para atualizar cardId na URL sem recarregar a página
  const setCardIdInUrl = useCallback((cardId: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (cardId) {
        next.set('cardId', cardId);
      } else {
        next.delete('cardId');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Ler filtros da URL
  const getFilterFromUrl = (key: string, defaultValue: string) => searchParams.get(key) || defaultValue;
  const getTagsFromUrl = (): string[] => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  };

  
  const [pipelines, setPipelines] = useState<CSMPipeline[]>(initialCache?.pipelines ?? []);
  const [selectedPipeline, setSelectedPipeline] = useState<string>(
    initialCache?.selectedPipeline ?? initialCache?.pipelines?.[0]?.id ?? ''
  );
  const [viewFilter, setViewFilter] = useState<'ativo' | 'todos' | 'cancelado'>('ativo');
  const [selectedChurnMonth, setSelectedChurnMonth] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);
  const [stages, setStages] = useState<CSMStage[]>(initialCache?.stages ?? []);
  const [cards, setCards] = useState<CSMCard[]>(initialCache?.cards ?? []);
  const [cardTagsMap, setCardTagsMap] = useState<Record<string, string[]>>(initialCache?.cardTagsMap ?? {});
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>(getTagsFromUrl);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>(
    initialCache?.availableTags ?? []
  );
  const [loading, setLoading] = useState(!hasUsefulCache);
  const [syncing, setSyncing] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showPipelineOrderManager, setShowPipelineOrderManager] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSimpleCardForm, setShowSimpleCardForm] = useState(false);
  const [selectedStageForCard, setSelectedStageForCard] = useState<string>('');
  // Se card existe no cache, abre instantaneamente sem flicker
  const [selectedCard, setSelectedCard] = useState<CSMCard | null>(cardOpenedFromCache);
  const [showCardDetails, setShowCardDetails] = useState(!!cardOpenedFromCache);
  const [searchTerm, setSearchTerm] = useState(() => getFilterFromUrl('search', ''));
  
  // Filtros para Kanban - inicializar da URL
  const [selectedSquad, setSelectedSquad] = useState<string>(() => getFilterFromUrl('squad', 'todos'));
  const [selectedPlano, setSelectedPlano] = useState<string>(() => getFilterFromUrl('plano', 'todos'));
  const [selectedMotivo, setSelectedMotivo] = useState<string>(() => getFilterFromUrl('motivo', 'todos'));
  const [selectedNiche, setSelectedNiche] = useState<string>(() => getFilterFromUrl('niche', 'todos'));
  const [selectedFlag, setSelectedFlag] = useState<string>(() => getFilterFromUrl('flag', 'todos'));
  const [sortBy, setSortBy] = useState<'title' | 'mrr' | 'created'>(() => {
    const urlSort = searchParams.get('sort');
    return (urlSort === 'title' || urlSort === 'mrr' || urlSort === 'created') ? urlSort : 'created';
  });
  const [suggestedStages, setSuggestedStages] = useState<SuggestedStage[]>([]);

  // Sincronizar filtros com a URL
  const updateFiltersInUrl = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === 'todos' || value === '' || value === 'created') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Wrappers para atualizar filtros e URL simultaneamente
  const handleSquadChange = useCallback((value: string) => {
    setSelectedSquad(value);
    updateFiltersInUrl({ squad: value });
  }, [updateFiltersInUrl]);

  const handlePlanoChange = useCallback((value: string) => {
    setSelectedPlano(value);
    updateFiltersInUrl({ plano: value });
  }, [updateFiltersInUrl]);

  const handleMotivoChange = useCallback((value: string) => {
    setSelectedMotivo(value);
    updateFiltersInUrl({ motivo: value });
  }, [updateFiltersInUrl]);

  const handleNicheChange = useCallback((value: string) => {
    setSelectedNiche(value);
    updateFiltersInUrl({ niche: value });
  }, [updateFiltersInUrl]);

  const handleFlagChange = useCallback((value: string) => {
    setSelectedFlag(value);
    updateFiltersInUrl({ flag: value });
  }, [updateFiltersInUrl]);

  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTagsFilter(tags);
    updateFiltersInUrl({ tags: tags.length > 0 ? tags.join(',') : null });
  }, [updateFiltersInUrl]);

  const handleSortChange = useCallback((value: 'title' | 'mrr' | 'created') => {
    setSortBy(value);
    updateFiltersInUrl({ sort: value });
  }, [updateFiltersInUrl]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    // Debounce na URL para não poluir histórico
    updateFiltersInUrl({ search: value || null });
  }, [updateFiltersInUrl]);

  const handleClearFilters = useCallback(() => {
    setSelectedSquad('todos');
    setSelectedPlano('todos');
    setSelectedMotivo('todos');
    setSelectedNiche('todos');
    setSelectedFlag('todos');
    setSelectedTagsFilter([]);
    setSelectedChurnMonth([]);
    updateFiltersInUrl({ squad: null, plano: null, motivo: null, niche: null, flag: null, tags: null });
  }, [updateFiltersInUrl]);

  // Calcular cards filtrados e métricas
  const filteredCardsData = useMemo(() => {
    const filtered = cards.filter(card => {
      // Filtrar por status do cliente
      const clientStatus = (card as any).client_status || 'ativo';
      const matchesStatus = viewFilter === 'todos' ? true : clientStatus === viewFilter;

      const matchesSquad = selectedSquad === 'todos' 
        ? true 
        : selectedSquad === 'sem_squad' 
          ? !card.squad 
          : card.squad === selectedSquad;
      
      const matchesPlano = selectedPlano === 'todos' 
        ? true 
        : selectedPlano === 'sem_plano' 
          ? !card.plano 
          : card.plano === selectedPlano;
      
      const matchesMotivo = selectedMotivo === 'todos' || card.motivo_perda === selectedMotivo;
      
      const matchesNiche = selectedNiche === 'todos' 
        ? true 
        : selectedNiche === 'sem_nicho' 
          ? !card.niche 
          : card.niche === selectedNiche;
      
      const matchesFlag = selectedFlag === 'todos' 
        ? true 
        : selectedFlag === 'sem_flag' 
          ? !(card as any).flag 
          : (card as any).flag === selectedFlag;
      
      // Filtrar por etiquetas se houver alguma selecionada
      const matchesTags = selectedTagsFilter.length === 0 || 
        (cardTagsMap[card.id] && selectedTagsFilter.some(tagId => cardTagsMap[card.id]?.includes(tagId)));
      
      // Filtrar por termo de busca
      const matchesSearch = !searchTerm || 
        (card.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar por mês selecionado (lógica varia por viewFilter)
      const matchesChurnMonth = selectedChurnMonth.length === 0 || (() => {
        const selMonth = selectedChurnMonth[0];
        const startOfMonth = new Date(selMonth.year, selMonth.month, 1);
        const endOfMonth = new Date(selMonth.year, selMonth.month + 1, 0, 23, 59, 59);

        if (viewFilter === 'cancelado') {
          if (!card.data_perda) return false;
          const perdaDate = new Date(card.data_perda);
          return perdaDate.getFullYear() === selMonth.year && perdaDate.getMonth() === selMonth.month;
        }

        if (viewFilter === 'ativo') {
          const inicio = card.data_inicio ? new Date(card.data_inicio) : null;
          if (inicio && inicio > endOfMonth) return false;
          if (card.data_perda) {
            const perda = new Date(card.data_perda);
            if (perda < startOfMonth) return false;
          }
          return true;
        }

        // viewFilter === 'todos': card ativo durante OU cancelado naquele mês
        const inicio = card.data_inicio ? new Date(card.data_inicio) : null;
        if (inicio && inicio > endOfMonth) return false;
        if (card.data_perda) {
          const perda = new Date(card.data_perda);
          // Cancelado antes do mês e não cancelado nesse mês → não mostra
          if (perda < startOfMonth && !(perda.getFullYear() === selMonth.year && perda.getMonth() === selMonth.month)) return false;
        }
        return true;
      })();

      return matchesStatus && matchesSquad && matchesPlano && matchesMotivo && matchesNiche && matchesFlag && matchesTags && matchesSearch && matchesChurnMonth;
    });

    // Ordenar cards
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'mrr':
          return (Number(b.monthly_revenue) || 0) - (Number(a.monthly_revenue) || 0);
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    const totalMRR = sorted.reduce((sum, card) => {
      const mrr = Number(card.monthly_revenue) || 0;
      return sum + mrr;
    }, 0);

    return {
      cards: sorted,
      count: sorted.length,
      totalMRR
    };
  }, [cards, selectedSquad, selectedPlano, selectedMotivo, selectedNiche, selectedTagsFilter, sortBy, searchTerm, cardTagsMap, viewFilter, selectedChurnMonth]);

  // Carregar sugestões de colunas (usa o pipeline selecionado como referência)
  const fetchSuggestedStages = async (pipelineId: string) => {
    if (!pipelineId) return;

    try {
      const { data: stages, error } = await supabase
        .from('csm_stages')
        .select('name, color')
        .eq('pipeline_id', pipelineId)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      setSuggestedStages((stages || []).map(s => ({ name: s.name, color: s.color })));
    } catch (error) {
      console.error('Erro ao carregar sugestões de colunas:', error);
    }
  };

  // Carregar pipelines do CSM (exclui pipelines do CRM por padrão de nome)
  const fetchPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_pipelines')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (error) throw error;

      const csmPipelines = (data || []).filter(p => {
        const name = (p.name || '').toLowerCase();
        // Excluir pipelines do CRM
        if (name.includes('sdr')) return false;
        if (name.includes('closer')) return false;
        if (name.includes('leads ganhos') && !name.includes('csm')) return false;
        if (name.includes('leads perdidos') && !name.includes('csm')) return false;
        // Excluir "Leads Excluídos" do CRM, mas manter "Leads Excluídos CSM"
        if (name.includes('leads exclu') && !name.includes('csm')) return false;
        return true;
      });

      setPipelines(csmPipelines);

      // Manter seleção atual se ainda existir; senão, selecionar o primeiro do CSM
      const stillExists = !!selectedPipeline && csmPipelines.some(p => p.id === selectedPipeline);
      const nextSelectedPipeline = stillExists ? selectedPipeline : (csmPipelines[0]?.id || '');

      if (nextSelectedPipeline && nextSelectedPipeline !== selectedPipeline) {
        setSelectedPipeline(nextSelectedPipeline);
      } else if (!selectedPipeline && nextSelectedPipeline) {
        setSelectedPipeline(nextSelectedPipeline);
      }

      if (nextSelectedPipeline) {
        await fetchSuggestedStages(nextSelectedPipeline);
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      toast('Erro ao carregar pipelines');
    }
  };

  // Carregar estágios do pipeline selecionado
  const fetchStages = async (pipelineId: string) => {
    if (!pipelineId) return;

    try {
      const { data, error } = await supabase
        .from('csm_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
      toast('Erro ao carregar estágios');
    }
  };

  // Carregar cards do pipeline selecionado
  const fetchCards = async (pipelineId: string) => {
    if (!pipelineId) return;

    try {
      const { data, error } = await supabase
        .from('csm_cards')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position');

      if (error) throw error;
      
      const mappedCards = (data || []).map(card => ({
        ...card,
        squad: card.squad as 'Apollo' | 'Artemis' | 'Athena' | 'Ares' | 'Aurora' | null,
        plano: (card as any).plano as 'Starter' | 'Business' | 'Pro' | 'Conceito' | 'Social' | null,
        categoria: card.categoria || 'MRR recorrente',
        nivel_engajamento: card.nivel_engajamento as 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto' | null
      }));
      
      setCards(mappedCards);
      
      // Carregar etiquetas dos cards
      if (data && data.length > 0) {
        const cardIds = data.map(c => c.id);
        const { data: cardTags, error: tagsError } = await supabase
          .from('csm_card_tags')
          .select('card_id, tag_id')
          .in('card_id', cardIds);
        
        if (!tagsError && cardTags) {
          const tagsMap: Record<string, string[]> = {};
          cardTags.forEach((ct: any) => {
            if (!tagsMap[ct.card_id]) {
              tagsMap[ct.card_id] = [];
            }
            tagsMap[ct.card_id].push(ct.tag_id);
          });
          setCardTagsMap(tagsMap);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cards:', error);
      toast('Erro ao carregar cards');
    }
  };

  // Carregar etiquetas disponíveis para o módulo CSM
  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_tags')
        .select('id, name, color')
        .eq('is_active', true)
        .or('module_scope.eq.csm,module_scope.eq.both');

      if (!error && data) {
        setAvailableTags(sortTags(data));
      }
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
    }
  };

  // Efeito para carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      // Se temos cache, não bloqueia UI com loading fullscreen: apenas sincroniza em background
      if (hasUsefulCache) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      await fetchPipelines();
      await fetchAvailableTags();

      if (hasUsefulCache) {
        setSyncing(false);
      } else {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [hasUsefulCache]);

  // Persistir um snapshot para evitar tela de loading ao retornar/recarregar
  useEffect(() => {
    // Evitar gravar cache vazio (primeiro paint sem dados)
    if (!pipelines.length && !availableTags.length && !stages.length && !cards.length) return;

    writeCSMKanbanCache({
      pipelines,
      selectedPipeline,
      stages,
      cards,
      cardTagsMap,
      availableTags,
    });
  }, [pipelines, selectedPipeline, stages, cards, cardTagsMap, availableTags]);

  // Efeito para carregar dados quando o pipeline mudar
  // Sync squad snapshots before loading cards
  const hasRunSquadSync = useRef(false);
  useEffect(() => {
    if (selectedPipeline) {
      const load = async () => {
        if (!hasRunSquadSync.current) {
          hasRunSquadSync.current = true;
          await syncSquadSnapshotsToCards();
        }
        fetchStages(selectedPipeline);
        fetchCards(selectedPipeline);
      };
      load();
    }
  }, [selectedPipeline]);

  // ===== CÓDIGO TEMPORÁRIO: Atribuir fase_projeto em lote (rodar uma única vez) =====
  const hasRunFaseSync = useRef(false);
  useEffect(() => {
    if (hasRunFaseSync.current) {
      console.log('⏭️ fase_projeto sync: já rodou nesta sessão, pulando.');
      return;
    }
    console.log(`📊 fase_projeto sync: stages=${stages.length}, cards=${cards.length}`);
    if (!stages.length || !cards.length) {
      console.log('⏭️ fase_projeto sync: aguardando stages e cards...');
      return;
    }

    hasRunFaseSync.current = true;

    const POSITION_TO_PHASE = ['Onboarding', 'Implementação', 'Refinamento', 'Escala', 'Expansão', 'Renovação'];

    // Montar mapa stage_id -> fase_projeto (pulando Retenção na contagem)
    const sortedStages = [...stages].sort((a, b) => a.position - b.position);
    const stagePhaseMap: Record<string, string> = {};
    const retentionStageIds: string[] = [];
    let phaseIndex = 0;

    for (const stage of sortedStages) {
      const normalizedName = stage.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isRetention = normalizedName.includes('retencao') || normalizedName.includes('retenc');
      console.log(`  📌 Stage "${stage.name}" (pos ${stage.position}) -> normalizado: "${normalizedName}" -> retenção: ${isRetention}`);
      if (isRetention) {
        retentionStageIds.push(stage.id);
        continue;
      }
      const phase = POSITION_TO_PHASE[Math.min(phaseIndex, POSITION_TO_PHASE.length - 1)];
      stagePhaseMap[stage.id] = phase;
      console.log(`  ✅ Stage "${stage.name}" -> Fase: "${phase}" (índice ${phaseIndex})`);
      phaseIndex++;
    }

    console.log(`📊 Mapa de fases: ${Object.keys(stagePhaseMap).length} stages mapeados, ${retentionStageIds.length} retenção`);

    // Filtrar cards que precisam de atualização (não estão em Retenção e sem fase_projeto)
    let skippedRetention = 0;
    let skippedAlreadySet = 0;
    let skippedNoStage = 0;
    const cardsToUpdate = cards.filter(card => {
      if (!stagePhaseMap[card.stage_id]) {
        if (retentionStageIds.includes(card.stage_id)) {
          skippedRetention++;
        } else {
          skippedNoStage++;
        }
        return false;
      }
      if ((card as any).fase_projeto) {
        skippedAlreadySet++;
        return false;
      }
      return true;
    });

    console.log(`📊 Cards: ${cards.length} total, ${cardsToUpdate.length} para atualizar, ${skippedRetention} em retenção, ${skippedAlreadySet} já com fase, ${skippedNoStage} sem stage mapeado`);

    if (cardsToUpdate.length === 0) {
      console.log('✅ Nenhum card precisa de atualização de fase_projeto.');
      return;
    }

    console.log(`🔄 Atualizando fase_projeto de ${cardsToUpdate.length} cards...`);

    const updates = cardsToUpdate.map(card => {
      const phase = stagePhaseMap[card.stage_id];
      console.log(`  → Card "${card.title}" (${card.id}) -> Fase: "${phase}"`);
      return supabase
        .from('csm_cards')
        .update({ fase_projeto: phase })
        .eq('id', card.id)
        .then(({ error }) => {
          if (error) console.error(`  ❌ Erro ao atualizar card ${card.title}:`, error);
          else console.log(`  ✅ Card "${card.title}" atualizado para "${phase}"`);
          return { id: card.id, title: card.title, phase, error };
        });
    });

    Promise.all(updates).then(results => {
      const success = results.filter(r => !r.error).length;
      const failed = results.filter(r => r.error).length;
      console.log(`✅ fase_projeto finalizado: ${success} sucesso, ${failed} falhas`);
      if (success > 0) {
        toast.success(`Fase do projeto atribuída para ${success} cards`);
        // Recarregar cards para refletir as mudanças
        if (selectedPipeline) fetchCards(selectedPipeline);
      }
    });
  }, [stages, cards]);
  // ===== FIM DO CÓDIGO TEMPORÁRIO =====

  // ===== CÓDIGO TEMPORÁRIO: Limpar duplicatas e configurar 7 etapas =====
  const hasRunStageSetup = useRef(false);
  useEffect(() => {
    if (hasRunStageSetup.current) return;
    if (!selectedPipeline) return;
    if (selectedPipeline !== '749ccdc2-5127-41a1-997b-3dcb47979555') return;
    
    hasRunStageSetup.current = true;
    const PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555';
    
    const DEFAULT_STAGES = [
      { name: '1º Mês', color: '#3B82F6', position: 0 },
      { name: '2º Mês', color: '#6366F1', position: 1 },
      { name: '3º Mês', color: '#8B5CF6', position: 2 },
      { name: '4º Mês', color: '#A855F7', position: 3 },
      { name: '5º Mês', color: '#D946EF', position: 4 },
      { name: '6º Mês', color: '#EC4899', position: 5 },
      { name: 'Retenção', color: '#10B981', position: 6 },
    ];
    
    const cleanupAndSetup = async () => {
      try {
        // 1. Buscar TODAS as stages deste pipeline
        const { data: allStages } = await supabase
          .from('csm_stages')
          .select('id, name, position, created_at')
          .eq('pipeline_id', PIPELINE_ID)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        
        if (!allStages) return;
        
        // 2. Agrupar por nome, manter apenas a mais antiga de cada
        const stagesByName: Record<string, typeof allStages> = {};
        for (const stage of allStages) {
          if (!stagesByName[stage.name]) stagesByName[stage.name] = [];
          stagesByName[stage.name].push(stage);
        }
        
        const keepIds: string[] = [];
        const deleteIds: string[] = [];
        
        for (const [name, stagesGroup] of Object.entries(stagesByName)) {
          // Manter a primeira (mais antiga), deletar as demais
          keepIds.push(stagesGroup[0].id);
          for (let i = 1; i < stagesGroup.length; i++) {
            deleteIds.push(stagesGroup[i].id);
          }
        }
        
        // 3. Mover cards das stages duplicadas para as que ficam
        if (deleteIds.length > 0) {
          console.log(`🧹 Limpando ${deleteIds.length} stages duplicadas...`);
          
          // Para cada stage a deletar, mover cards para a stage mantida com mesmo nome
          for (const [name, stagesGroup] of Object.entries(stagesByName)) {
            if (stagesGroup.length <= 1) continue;
            const keepId = stagesGroup[0].id;
            const dupeIds = stagesGroup.slice(1).map(s => s.id);
            
            await supabase
              .from('csm_cards')
              .update({ stage_id: keepId })
              .eq('pipeline_id', PIPELINE_ID)
              .in('stage_id', dupeIds);
          }
          
          // Deletar stages duplicadas
          await supabase
            .from('csm_stages')
            .delete()
            .in('id', deleteIds);
          
          console.log(`✅ ${deleteIds.length} stages duplicadas removidas`);
        }
        
        // 4. Verificar se temos exatamente as 7 etapas corretas
        const keepNames = Object.keys(stagesByName);
        const targetNames = DEFAULT_STAGES.map(s => s.name);
        const allPresent = targetNames.every(n => keepNames.includes(n));
        
        if (allPresent && keepNames.length === 7) {
          // Só corrigir posições
          for (const [name, stagesGroup] of Object.entries(stagesByName)) {
            const target = DEFAULT_STAGES.find(s => s.name === name);
            if (target) {
              await supabase
                .from('csm_stages')
                .update({ position: target.position, color: target.color })
                .eq('id', stagesGroup[0].id);
            }
          }
          console.log('✅ Etapas já corretas, posições ajustadas.');
        } else {
          // Criar etapas faltantes
          const missing = DEFAULT_STAGES.filter(s => !keepNames.includes(s.name));
          if (missing.length > 0) {
            await supabase
              .from('csm_stages')
              .insert(missing.map(s => ({
                pipeline_id: PIPELINE_ID,
                name: s.name,
                color: s.color,
                position: s.position,
                is_active: true,
              })));
            console.log(`✅ ${missing.length} etapas criadas`);
          }
        }
        
        // Recarregar
        if (deleteIds.length > 0) {
          toast.success(`${deleteIds.length} etapas duplicadas removidas`);
        }
        fetchStages(PIPELINE_ID);
        fetchCards(PIPELINE_ID);
      } catch (err) {
        console.error('❌ Erro ao limpar/configurar etapas:', err);
      }
    };
    
    cleanupAndSetup();
  }, [selectedPipeline]);
  // ===== FIM DO CÓDIGO TEMPORÁRIO: Setup Etapas =====

  // Efeito para abrir card específico quando openCardId ou cardIdFromUrl for passado
  // Se o card já foi aberto a partir do cache, pula a busca assíncrona para evitar flicker
  useEffect(() => {
    const cardToOpen = openCardId || cardIdFromUrl;
    
    // Se já abrimos do cache, não precisamos buscar novamente
    if (cardOpenedFromCache && cardToOpen === cardOpenedFromCache.id && showCardDetails) {
      return;
    }
    
    const openCardFromId = async () => {
      if (!cardToOpen) return;
      
      console.log('🔍 Tentando abrir card:', cardToOpen, 'Key:', openCardKey);
      
      // Busca o card diretamente do banco para garantir
      try {
        const { data: cardData, error } = await supabase
          .from('csm_cards')
          .select('*')
          .eq('id', cardToOpen)
          .single();
        
        if (error || !cardData) {
          console.error('Card não encontrado:', error);
          // Limpa o cardId da URL se o card não existir
          if (cardIdFromUrl) setCardIdInUrl(null);
          return;
        }
        
        console.log('✅ Card encontrado:', cardData.title, 'Pipeline:', cardData.pipeline_id);
        
        // Se o card está em outro pipeline, muda para ele primeiro e aguarda
        if (cardData.pipeline_id !== selectedPipeline) {
          console.log('🔄 Mudando para pipeline:', cardData.pipeline_id);
          setSelectedPipeline(cardData.pipeline_id);
          // Aguarda um pouco mais para o pipeline carregar
          setTimeout(() => {
            setSelectedCard(cardData as CSMCard);
            setShowCardDetails(true);
            setCardIdInUrl(cardData.id);
            console.log('📂 Card aberto após mudança de pipeline!');
          }, 300);
        } else {
          // Pipeline já está correto, abre direto
          setSelectedCard(cardData as CSMCard);
          setShowCardDetails(true);
          setCardIdInUrl(cardData.id);
          console.log('📂 Card aberto!');
        }
      } catch (err) {
        console.error('Erro ao buscar card:', err);
      }
    };
    
    openCardFromId();
  }, [openCardId, openCardKey, cardIdFromUrl, selectedPipeline, setCardIdInUrl, cardOpenedFromCache, showCardDetails]);

  // Criar novo pipeline de CSM
  const createPipeline = async (name: string, description?: string, stages?: SuggestedStage[]) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast('Você precisa estar logado para criar pipelines');
        return;
      }

      const { data, error } = await supabase
        .from('csm_pipelines')
        .insert({
          name,
          description,
          created_by: userData.user.id,
          position: pipelines.length
        })
        .select()
        .single();

      if (error) throw error;

      // Criar as colunas/estágios se foram definidos
      if (stages && stages.length > 0 && data) {
        const stagesToInsert = stages.map((stage, index) => ({
          pipeline_id: data.id,
          name: stage.name,
          color: stage.color,
          position: index,
          is_active: true
        }));

        const { error: stagesError } = await supabase
          .from('csm_stages')
          .insert(stagesToInsert);

        if (stagesError) {
          console.error('Erro ao criar estágios:', stagesError);
          toast('Pipeline criado, mas houve erro ao criar as colunas');
        }
      }

      setPipelines(prev => [...prev, data]);
      setSelectedPipeline(data.id);
      toast('Pipeline criado com sucesso!');
      
      // Recarregar estágios do novo pipeline
      if (data) {
        fetchStages(data.id);
      }
    } catch (error) {
      console.error('Erro ao criar pipeline:', error);
      toast('Erro ao criar pipeline');
    }
  };

  // Atualizar dados após mudanças
  const refreshStages = () => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline);
      fetchPipelines(); // Recarrega os pipelines para atualizar o nome
    }
  };

  const refreshCards = () => {
    if (selectedPipeline) {
      fetchCards(selectedPipeline);
    }
  };

  // Hook para movimentação automática
  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
  useAutoMoveCards({
    pipelineId: selectedPipeline,
    pipelineName: selectedPipelineData?.name,
    onCardsUpdated: refreshCards
  });

  // Ícones dos squads
  const squadIcons = {
    Apollo: Rocket,
    Artemis: Moon,
    Athena: Shield,
    Ares: Flame,
    Aurora: Sunrise,
  };

  // Abrir formulário de card para o primeiro estágio disponível
  const handleAddCardGeneric = () => {
    if (stages.length > 0) {
      setSelectedStageForCard(stages[0].id);
      setShowCardForm(true);
    }
  };

  // Abrir formulário simples para adicionar cliente
  const handleAddSimpleCard = () => {
    if (stages.length > 0) {
      setSelectedStageForCard(stages[0].id);
      setShowSimpleCardForm(true);
    }
  };

  const handleCardClick = (card: CSMCard) => {
    setSelectedCard(card);
    setShowCardDetails(true);
    setCardIdInUrl(card.id);
  };

  // Cross-pipeline card select from global search
  const handleGlobalCardSelect = (card: CSMCard, pipelineId: string) => {
    if (pipelineId !== selectedPipeline) {
      setSelectedPipeline(pipelineId);
      setTimeout(() => {
        setSelectedCard(card);
        setShowCardDetails(true);
        setCardIdInUrl(card.id);
      }, 300);
    } else {
      handleCardClick(card);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <DotLogo size={48} animate />
        <div className="text-lg">Carregando CSM...</div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col pt-2 pl-2 md:pl-1 pr-2 pb-0 relative">
      {/* ===== MOBILE HEADER ===== */}
      <div className="md:hidden flex items-center w-full mb-2 flex-shrink-0 relative z-10 pt-safe-top">
        {/* Left: Sidebar trigger */}
        <SidebarTrigger
          aria-label="Abrir menu"
          className="h-10 w-10 flex-shrink-0 bg-background/80 backdrop-blur border border-border shadow-sm hover:bg-background"
        />
        
        {/* Center: View Filter */}
        <div className="flex-1 min-w-0 flex justify-center px-2">
          <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as 'ativo' | 'todos' | 'cancelado')}>
            <SelectTrigger className="w-full max-w-[200px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Clientes Ativos</SelectItem>
              <SelectItem value="cancelado">Clientes Cancelados</SelectItem>
              <SelectItem value="todos">Todos os Clientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Right: Add button (green) - only for admins */}
        {isAdmin && (
          <Button
            size="icon"
            onClick={handleAddSimpleCard}
            className="h-10 w-10 flex-shrink-0 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* ===== DESKTOP HEADER (unchanged) ===== */}
      <div className="hidden md:flex md:flex-row md:items-center justify-between w-full mb-4 flex-shrink-0 gap-3 relative z-10">
        {/* Left: Toggle + Search */}
        <div className="flex items-center gap-3 h-full flex-1 min-w-0">
          {/* Inline search */}
          <div className="relative flex-1 min-w-0 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

        </div>
        {/* Right side: Controls */}
        <div className="flex flex-nowrap gap-2 items-center justify-end flex-shrink-0">
          {/* Contador de clientes com MRR */}
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-foreground">
              {filteredCardsData.count} {filteredCardsData.count === 1 ? 'cliente' : 'clientes'}
            </span>
            {syncing && (
              <div className="flex items-center gap-2 ml-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/40 border-t-transparent" />
                <span>Sincronizando…</span>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <Popover>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <button className="hover:opacity-70 transition-opacity cursor-pointer p-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="end">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">MRR Total</p>
                      <p className="text-lg font-bold">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(filteredCardsData.totalMRR)}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                <TooltipContent side="bottom">
                  <p>Mostrar valor total de MRR</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Ordenação */}
          <Popover>
            <PopoverTrigger asChild>
              <ToolbarButton>
                <ArrowUpDown className="h-4 w-4" />
                <span>Ordenar</span>
              </ToolbarButton>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2">
                <div className="space-y-1">
                  <Button variant={sortBy === 'title' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-9" onClick={() => handleSortChange('title')}>Título (A-Z)</Button>
                  <Button variant={sortBy === 'mrr' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-9" onClick={() => handleSortChange('mrr')}>Valor do MRR</Button>
                  <Button variant={sortBy === 'created' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-9" onClick={() => handleSortChange('created')}>Data de criação</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <FilterPopover
            selectedSquad={selectedSquad}
            selectedPlano={selectedPlano}
            selectedNiche={selectedNiche}
            selectedMotivo={selectedMotivo}
            selectedFlag={selectedFlag}
            selectedTags={selectedTagsFilter}
            availableNiches={[...new Set(cards.map(c => c.niche).filter(Boolean))] as string[]}
            availableMotivos={selectedPipelineData?.name?.toLowerCase().includes('perdidos') 
              ? [...new Set(cards.map(c => c.motivo_perda).filter(Boolean))] as string[]
              : []
            }
            availableTags={availableTags}
            showMotivoFilter={selectedPipelineData?.name?.toLowerCase().includes('perdidos')}
            onSquadChange={handleSquadChange}
            onPlanoChange={handlePlanoChange}
            onNicheChange={handleNicheChange}
            onMotivoChange={handleMotivoChange}
            onFlagChange={handleFlagChange}
            onTagsChange={handleTagsChange}
            onClearFilters={handleClearFilters}
          />
          {(selectedSquad !== 'todos' || selectedPlano !== 'todos' || selectedMotivo !== 'todos' || selectedNiche !== 'todos' || selectedFlag !== 'todos' || selectedTagsFilter.length > 0) && (
            <ToolbarButton
              toolbarSize="icon"
              className="border-border hover:bg-accent"
              onClick={() => { handleClearFilters(); toast.success('Filtros limpos'); }}
            >
              <Plus className="h-4 w-4 rotate-45" />
            </ToolbarButton>
          )}
          
          {/* Botão adicionar cliente - only for admins */}
          {isAdmin && (
            <ToolbarButton onClick={handleAddSimpleCard}>
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar cliente</span>
            </ToolbarButton>
          )}

          {/* Configurações */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ToolbarButton toolbarSize="icon">
                  <Settings className="h-4 w-4" />
                </ToolbarButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowStageManager(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Etapas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPipelineOrderManager(true)}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Ordem dos Pipelines
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Gerenciar etiquetas em breve')}>
                  <Tag className="h-4 w-4 mr-2" />
                  Gerenciar Etiquetas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Automações em breve')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Automações de Funis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Configurações de ganho em breve')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Configurações de Ganho
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Motivos de perda em breve')}>
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Motivos de Perda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Ordem dos clientes em breve')}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Ordem dos Clientes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Tarefas em breve')}>
                  <ListChecks className="h-4 w-4 mr-2" />
                  Tarefas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Permissões em breve')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Permissões de Exportação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Importar clientes em breve')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Importar Clientes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}


          <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as 'ativo' | 'todos' | 'cancelado')}>
            <SelectTrigger className="h-9 w-auto min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Clientes Ativos</SelectItem>
              <SelectItem value="cancelado">Clientes Cancelados</SelectItem>
              <SelectItem value="todos">Todos os Clientes</SelectItem>
            </SelectContent>
          </Select>
          <MonthYearPicker
            selectedPeriods={selectedChurnMonth}
            onPeriodsChange={setSelectedChurnMonth}
            singleSelect
            minYear={2025}
            minMonth={0}
          />
        </div>
      </div>


      {/* Content area */}
      <div className="min-h-0 flex-1 h-full overflow-x-auto overflow-y-auto relative">
        {selectedPipeline && (
          <div className="animate-in fade-in-0 zoom-in-95 duration-300 h-full">
            {isMobile ? (
              <MobileStageSwiper
                stages={stages}
                cardsByStage={stages.reduce((acc, stage) => {
                  acc[stage.id] = filteredCardsData.cards.filter(c => c.stage_id === stage.id);
                  return acc;
                }, {} as Record<string, CSMCard[]>)}
                onCardClick={handleCardClick}
              />
            ) : (
              <KanbanBoard
                stages={stages}
                cards={filteredCardsData.cards}
                onRefreshCards={refreshCards}
                onCardClick={handleCardClick}
                disableDrag={selectedPipeline === '749ccdc2-5127-41a1-997b-3dcb47979555'}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile inline search */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-10 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Stage Manager Dialog */}
      {showStageManager && selectedPipeline && (
        <StageManager
          pipelineId={selectedPipeline}
          pipelineName={pipelines.find(p => p.id === selectedPipeline)?.name || ''}
          stages={stages}
          open={showStageManager}
          onClose={() => setShowStageManager(false)}
          onRefresh={refreshStages}
        />
      )}

      {/* Card Form Dialog */}
      {showCardForm && (
        <CardForm
          pipelineId={selectedPipeline}
          stageId={selectedStageForCard}
          stages={stages}
          open={showCardForm}
          onClose={() => {
            setShowCardForm(false);
            setSelectedStageForCard('');
          }}
          onRefresh={refreshCards}
        />
      )}

      {/* Simple Card Form Dialog (CSM) */}
      {showSimpleCardForm && (
        <CSMSimpleCardForm
          pipelineId={selectedPipeline}
          stageId={selectedStageForCard}
          stages={stages}
          open={showSimpleCardForm}
          onClose={() => {
            setShowSimpleCardForm(false);
            setSelectedStageForCard('');
          }}
          onRefresh={refreshCards}
        />
      )}

      {/* Card Details Dialog */}
      <CardDetailsDialog
        card={selectedCard}
        stages={stages}
        open={showCardDetails}
        onClose={() => {
          setShowCardDetails(false);
          setSelectedCard(null);
          setCardIdInUrl(null);
          // Sempre atualizar cards quando fechar o dialog
          refreshCards();
        }}
        onUpdate={refreshCards}
        pipelineName={selectedPipelineData?.name}
        moduleType="csm"
      />

      {/* Pipeline Order Manager Dialog */}
      <PipelineOrderManager
        pipelines={pipelines}
        open={showPipelineOrderManager}
        onClose={() => setShowPipelineOrderManager(false)}
        onRefresh={fetchPipelines}
      />
    </div>
  );
};
