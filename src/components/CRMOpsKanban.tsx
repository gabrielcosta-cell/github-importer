import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoard } from './kanban/KanbanBoard';
import { CardDetailsDialog } from './kanban/CardDetailsDialog';
import { CRMOpsDateFilter } from './crm-ops/CRMOpsDateFilter';
import { CRMOpsCardForm } from './crm-ops/CRMOpsCardForm';
import { CSMPipeline, CSMStage, CSMCard } from '@/types/kanban';
import { setupCRMOpsPipelines, CRM_OPS_PIPELINE_NAMES } from '@/utils/setupCRMOpsPipelines';
import { DotLogo } from '@/components/DotLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

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

  // Date filter
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  // Load CRM Ops pipelines
  const fetchPipelines = async () => {
    try {
      // Ensure pipelines exist
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
        setSelectedPipeline(crmPipelines[0].id);
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
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          (card.title || '').toLowerCase().includes(term) ||
          (card.company_name || '').toLowerCase().includes(term) ||
          (card.contact_name || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Date filter
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

      {/* Desktop Header */}
      <div className="hidden md:flex md:items-center justify-between w-full mb-4 flex-shrink-0 gap-3 relative z-10">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pipeline Selector */}
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <CRMOpsDateFilter
            startDate={dateStart}
            endDate={dateEnd}
            onApply={handleDateApply}
            onClear={handleDateClear}
          />

          {/* Add Card */}
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleAddCard}
              className="gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          )}
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
    </div>
  );
};
