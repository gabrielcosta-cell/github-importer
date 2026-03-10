import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ToolbarButton } from '@/components/ui/toolbar-button';
import { Plus, Search, Settings, Pencil, BarChart3, Plug, PenLine, GripVertical, Tag, Zap, Trophy, ThumbsDown, ArrowUpDown, ListChecks, Shield, FileDown, Filter, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoard } from './kanban/KanbanBoard';
import { DesktopGlobalSearch } from './kanban/MobileGlobalSearch';
import { CardDetailsDialog } from './kanban/CardDetailsDialog';
import { MonthYearPicker } from './MonthYearPicker';
import { CRMOpsCardForm } from './crm-ops/CRMOpsCardForm';
import { StageManager } from './kanban/StageManager';
import { CSMPipeline, CSMStage, CSMCard } from '@/types/kanban';
import { setupCRMOpsPipelines, CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines';
import { DotLogo } from '@/components/DotLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { readCRMOpsKanbanCache, writeCRMOpsKanbanCache } from '@/utils/crmOpsKanbanSessionCache';

const CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

export const CRMOpsKanban: React.FC = () => {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.is_global_admin;

  const cached = useMemo(() => readCRMOpsKanbanCache(CACHE_MAX_AGE), []);

  const [pipelines, setPipelines] = useState<CSMPipeline[]>(cached?.pipelines || []);
  const [selectedPipeline, setSelectedPipeline] = useState<string>(cached?.selectedPipeline || '');
  const [stages, setStages] = useState<CSMStage[]>(cached?.stages || []);
  const [cards, setCards] = useState<CSMCard[]>(cached?.cards || []);
  const [loading, setLoading] = useState(!cached);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<CSMCard | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);

  // Date filter - month/year picker
  const [selectedPeriods, setSelectedPeriods] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);

  // Sort
  const [sortBy, setSortBy] = useState<'title' | 'created' | 'mrr'>('created');

  // Load CRM Ops pipelines
  const fetchPipelines = async () => {
    try {
      await setupCRMOpsPipelines();

      const { data, error } = await supabase
        .from('csm_pipelines')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (error) throw error;

      const crmPipelines = (data || []).filter(p =>
        CRM_OPS_PIPELINE_NAMES.includes(p.name)
      );

      setPipelines(crmPipelines);

      if (crmPipelines.length > 0 && !selectedPipeline) {
        const upsellPipeline = crmPipelines.find(p => p.name === 'Vendas | Upsell');
        setSelectedPipeline(upsellPipeline?.id || crmPipelines[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines CRM Ops:', error);
      toast('Erro ao carregar pipelines');
    }
  };

  const fetchStages = async (pipelineId: string) => {
    if (!pipelineId) return;
    const { data, error } = await supabase
      .from('csm_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('is_active', true)
      .order('position');

    if (error) {
      console.error('Erro ao carregar estágios:', error);
      return;
    }
    setStages(data || []);
  };

  const fetchCards = async (pipelineId: string) => {
    if (!pipelineId) return;
    const { data, error } = await supabase
      .from('csm_cards')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position');

    if (error) {
      console.error('Erro ao carregar cards:', error);
      return;
    }

    const mappedCards = (data || []).map(card => ({
      ...card,
      squad: card.squad as CSMCard['squad'],
      plano: (card as any).plano as CSMCard['plano'],
    }));
    setCards(mappedCards);
  };

  // Persist to session cache whenever key data changes
  useEffect(() => {
    if (pipelines.length > 0 && selectedPipeline) {
      writeCRMOpsKanbanCache({ pipelines, selectedPipeline, stages, cards });
    }
  }, [pipelines, selectedPipeline, stages, cards]);

  useEffect(() => {
    const init = async () => {
      if (!cached) setLoading(true);
      await fetchPipelines();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline);
      fetchCards(selectedPipeline);
    }
  }, [selectedPipeline]);

  const handleSortChange = (sort: 'title' | 'created' | 'mrr') => {
    setSortBy(sort);
  };

  // Filtered and sorted cards
  const filteredCards = useMemo(() => {
    const filtered = cards.filter(card => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          (card.title || '').toLowerCase().includes(term) ||
          (card.company_name || '').toLowerCase().includes(term) ||
          (card.contact_name || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (selectedPeriods.length > 0) {
        const d = new Date(card.created_at);
        const cardMonth = d.getMonth();
        const cardYear = d.getFullYear();
        if (!selectedPeriods.some(p => p.month === cardMonth && p.year === cardYear)) return false;
      }

      return true;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'mrr') return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [cards, searchTerm, selectedPeriods, sortBy]);

  const totalMRR = useMemo(() => {
    return filteredCards.reduce((acc, card) => acc + (Number(card.monthly_revenue) || 0), 0);
  }, [filteredCards]);

  const refreshCards = useCallback(() => {
    if (selectedPipeline) fetchCards(selectedPipeline);
  }, [selectedPipeline]);

  const handleCardClick = (card: CSMCard) => {
    setSelectedCard(card);
    setShowCardDetails(true);
  };

  const handleGlobalCardSelect = (card: CSMCard, pipelineId: string) => {
    if (pipelineId !== selectedPipeline) {
      setSelectedPipeline(pipelineId);
    }
    setSelectedCard(card);
    setShowCardDetails(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleAddCard = () => {
    setShowCardForm(true);
  };


  const handleStagesUpdate = () => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline);
      fetchCards(selectedPipeline);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <DotLogo size={48} animate />
        <div className="text-lg">Carregando CRM Ops...</div>
      </div>
    );
  }

  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);

  return (
    <div className="h-full min-h-0 flex flex-col pt-2 pl-2 md:pl-1 pr-2 pb-0 relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center w-full mb-2 flex-shrink-0 relative z-10 pt-safe-top gap-2">
        <SidebarTrigger
          aria-label="Abrir menu"
          className="h-10 w-10 flex-shrink-0 bg-background/80 backdrop-blur border border-border shadow-sm hover:bg-background"
        />
        <div className="flex-1 min-w-0">
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button
            size="icon"
            onClick={handleAddCard}
            className="h-10 w-10 flex-shrink-0 rounded-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Desktop Header - CSM Style Toolbar */}
      <div className="hidden md:flex md:flex-row md:items-center justify-between w-full mb-4 flex-shrink-0 gap-3 relative z-10">
        {/* Left: Search + Configurações */}
        <div className="flex items-center gap-2 h-full flex-1 min-w-0">
          {/* Desktop global search - same as CSM */}
          <DesktopGlobalSearch
            currentPipelineId={selectedPipeline}
            pipelines={pipelines}
            currentCards={cards}
            currentStages={stages}
            onSelectCard={handleGlobalCardSelect}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />

        </div>

        {/* Right side: Controls */}
        <div className="flex flex-nowrap gap-2 items-center justify-end flex-shrink-0">
          {/* 1. Contagem + MRR (click to reveal) */}
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-foreground whitespace-nowrap">
              {filteredCards.length} {filteredCards.length === 1 ? 'lead' : 'leads'}
            </span>
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
                        {formatCurrency(totalMRR)}
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

          {/* Barra de ações */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            {/* Ordenar */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-none border-r h-9 px-3">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>Ordenar</span>
                </Button>
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

            {/* Filtros */}
            <Button variant="ghost" size="sm" className="gap-2 rounded-none h-9 px-3" onClick={() => toast.info('Filtros em breve')}>
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </Button>
          </div>

          {/* Adicionar lead */}
          {isAdmin && (
            <ToolbarButton onClick={handleAddCard}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar lead</span>
            </ToolbarButton>
          )}

          {/* 6. Seletor de pipeline */}
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="h-9 w-auto min-w-[160px]">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 7. Data */}
          <MonthYearPicker
            selectedPeriods={selectedPeriods}
            onPeriodsChange={setSelectedPeriods}
            singleSelect
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanBoard
          stages={stages}
          cards={filteredCards}
          onRefreshCards={refreshCards}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Card Details Dialog */}
      {selectedCard && showCardDetails && (
        <CardDetailsDialog
          card={selectedCard}
          open={showCardDetails}
          onClose={() => {
            setShowCardDetails(false);
            setSelectedCard(null);
          }}
          onUpdate={refreshCards}
          stages={stages}
        />
      )}

      {/* Add Card Form */}
      {showCardForm && stages.length > 0 && (
        <CRMOpsCardForm
          pipelineId={selectedPipeline}
          stageId={stages[0].id}
          stages={stages}
          open={showCardForm}
          onClose={() => setShowCardForm(false)}
          onRefresh={refreshCards}
        />
      )}

      {/* Stage Manager */}
      {showStageManager && selectedPipelineData && (
        <StageManager
          pipelineId={selectedPipeline}
          pipelineName={selectedPipelineData.name}
          stages={stages}
          open={showStageManager}
          onClose={() => setShowStageManager(false)}
          onRefresh={handleStagesUpdate}
        />
      )}
    </div>
  );
};
