import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Search, Settings, Pencil, BarChart3, Plug, PenLine, GripVertical, Tag, Zap, Trophy, ThumbsDown, ArrowUpDown, ListChecks, Shield, FileDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoard } from './kanban/KanbanBoard';
import { CardDetailsDialog } from './kanban/CardDetailsDialog';
import { CRMOpsDateFilter } from './crm-ops/CRMOpsDateFilter';
import { CRMOpsCardForm } from './crm-ops/CRMOpsCardForm';
import { StageManager } from './kanban/StageManager';
import { CSMPipeline, CSMStage, CSMCard } from '@/types/kanban';
import { setupCRMOpsPipelines, CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines';
import { DotLogo } from '@/components/DotLogo';
import { importCloserWonFeb } from '@/utils/importCloserWonFeb';
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

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
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
  }, [cards, searchTerm, dateStart, dateEnd]);

  const refreshCards = useCallback(() => {
    if (selectedPipeline) fetchCards(selectedPipeline);
  }, [selectedPipeline]);

  const handleCardClick = (card: CSMCard) => {
    setSelectedCard(card);
    setShowCardDetails(true);
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
            className="h-10 w-10 flex-shrink-0 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Desktop Header - Reference Style Toolbar */}
      <div className="hidden md:flex md:items-center w-full mb-3 flex-shrink-0 gap-2 relative z-10">
        {/* Left side: Add + Search */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleAddCard}
              className="gap-1.5 h-9 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: Configurações, Pipeline, Edit, Filtros */}
        <div className="flex items-center gap-2">
          {/* Configurações Dropdown */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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

          {/* Pipeline Selector + Edit button as single group */}
          <div className="flex items-center h-9 border border-border rounded-md overflow-hidden bg-background">
            <div className="flex items-center px-2.5 border-r border-border">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger className="h-9 w-[140px] text-sm border-0 shadow-none px-2 focus:ring-0 rounded-none">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <button
                onClick={() => setShowStageManager(true)}
                className="flex items-center justify-center h-9 w-9 border-l border-border hover:bg-muted transition-colors"
                title="Editar etapas"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <CRMOpsDateFilter
            startDate={dateStart}
            endDate={dateEnd}
            onApply={handleDateApply}
            onClear={handleDateClear}
          />
        </div>
      </div>

      {/* BOTÃO TEMPORÁRIO - REMOVER APÓS USO */}
      {isAdmin && (
        <div className="w-full mb-2 flex justify-center">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm('Importar 8 clientes ganhos no Closer (Fev/2026)?')) return;
              toast.loading('Importando clientes ganhos...');
              const result = await importCloserWonFeb();
              toast.dismiss();
              if (result.errors.length > 0) {
                toast.error(`Erros: ${result.errors.join(', ')}`);
              } else {
                toast.success(`${result.success} clientes importados, ${result.skipped} já existiam!`);
                if (selectedPipeline) fetchCards(selectedPipeline);
              }
            }}
            className="h-10 px-6 gap-2 text-sm font-semibold"
          >
            🚀 Importar 8 Ganhos Closer (Fev)
          </Button>
        </div>
      )}

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
