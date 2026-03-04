import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Search, Settings, Pencil, BarChart3, Plug, PenLine, GripVertical, Tag, Zap, Trophy, ThumbsDown, ArrowUpDown, ListChecks, Shield, FileDown, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoard } from './kanban/KanbanBoard';
import { DesktopGlobalSearch } from './kanban/MobileGlobalSearch';
import { CardDetailsDialog } from './kanban/CardDetailsDialog';
import { CRMOpsDateFilter } from './crm-ops/CRMOpsDateFilter';
import { CRMOpsCardForm } from './crm-ops/CRMOpsCardForm';
import { StageManager } from './kanban/StageManager';
import { CSMPipeline, CSMStage, CSMCard } from '@/types/kanban';
import { setupCRMOpsPipelines, CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines';
import { DotLogo } from '@/components/DotLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

export const CRMOpsKanban: React.FC = () => {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.is_global_admin;

  const [pipelines, setPipelines] = useState<CSMPipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [stages, setStages] = useState<CSMStage[]>([]);
  const [cards, setCards] = useState<CSMCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<CSMCard | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);

  // Date filter
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

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
        const sdrPipeline = crmPipelines.find(p => p.name === 'SDR | Principal');
        setSelectedPipeline(sdrPipeline?.id || crmPipelines[0].id);
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
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

      if (dateStart || dateEnd) {
        const cardDate = new Date(card.created_at);
        if (dateStart && cardDate < startOfDay(dateStart)) return false;
        if (dateEnd && cardDate > endOfDay(dateEnd)) return false;
      }

      return true;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'mrr') return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [cards, searchTerm, dateStart, dateEnd, sortBy]);

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

  const handleDateApply = (start: Date | undefined, end: Date | undefined) => {
    setDateStart(start);
    setDateEnd(end);
  };

  const handleDateClear = () => {
    setDateStart(undefined);
    setDateEnd(undefined);
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
      <div className="hidden md:flex md:flex-row md:items-center justify-between w-full mb-4 flex-shrink-0 gap-0 relative z-10">
        {/* Left: Search + Configurações */}
        <div className="flex items-center gap-2 h-full flex-1">
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

          {/* Configurações Dropdown - next to search */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 transition-all duration-200 hover:scale-105">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Configurações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setShowStageManager(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Etapas
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
                <DropdownMenuItem onClick={() => toast.info('Ordem dos leads em breve')}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Ordem dos Leads
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Tarefas em breve')}>
                  <ListChecks className="h-4 w-4 mr-2" />
                  Tarefas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Permissões em breve')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Permissões de Exportação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Importar leads em breve')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Importar Leads
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side: Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-end">
          {/* Lead count */}
          <span className="text-sm font-medium text-foreground">
            {filteredCards.length} {filteredCards.length === 1 ? 'lead' : 'leads'}
          </span>

          {/* Ordenar */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 transition-all duration-200 hover:scale-105">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <span>Ordenar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2">
                <div className="space-y-1">
                  <Button variant={sortBy === 'title' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-8" onClick={() => handleSortChange('title')}>Título (A-Z)</Button>
                  <Button variant={sortBy === 'mrr' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-8" onClick={() => handleSortChange('mrr')}>Valor do MRR</Button>
                  <Button variant={sortBy === 'created' ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-8" onClick={() => handleSortChange('created')}>Data de criação</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtros (Date Filter) */}
          <CRMOpsDateFilter
            startDate={dateStart}
            endDate={dateEnd}
            onApply={handleDateApply}
            onClear={handleDateClear}
          />

          {/* Adicionar lead */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCard}
              className="h-8 px-3 gap-2 transition-all duration-200 hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar lead</span>
            </Button>
          )}

          {/* Pipeline Selector */}
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
