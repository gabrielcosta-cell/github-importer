import React from 'react';
import { supabase as lovableSupabase } from '@/integrations/supabase/client';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CRMStage, CRMCard } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';

interface KanbanBoardProps {
  stages: CRMStage[];
  cards: CRMCard[];
  selectedTags?: string[];
  onRefreshCards: () => void;
  onCardClick: (card: CRMCard) => void;
}

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

// Priority names in exact order (must match tagSorting.ts)
const PRIORITY_NAMES = [
  'qualificado serviço',
  'pré qualificado',
  'pré-qualificado',
  'qualificação média',
  'qualificação indefinida',
];

// Helper to check if a color is red
const isRedColor = (color: string): boolean => {
  const lowerColor = color.toLowerCase();
  return lowerColor.includes('#ff') || 
         lowerColor.includes('#e53') || 
         lowerColor.includes('#dc') ||
         lowerColor.includes('#ef4') ||
         lowerColor.includes('#f00') ||
         lowerColor.includes('red') ||
         lowerColor === '#ea384c' ||
         lowerColor === '#dc2626' ||
         lowerColor === '#ef4444' ||
         lowerColor === '#b91c1c' ||
         lowerColor === '#991b1b';
};

// Helper to check if a color is yellow
const isYellowColor = (color: string): boolean => {
  const lowerColor = color.toLowerCase();
  return lowerColor.includes('#f59') ||
         lowerColor.includes('#eab') ||
         lowerColor.includes('#fbbf') ||
         lowerColor.includes('#fcd') ||
         lowerColor.includes('yellow') ||
         lowerColor.includes('amber') ||
         lowerColor === '#f59e0b' ||
         lowerColor === '#fbbf24' ||
         lowerColor === '#fcd34d' ||
         lowerColor === '#d97706' ||
         lowerColor === '#ca8a04';
};

// Get the priority score for a card based on its highest priority tag
const getCardPriorityScore = (
  cardId: string, 
  cardTagsMap: Record<string, string[]>, 
  tagsInfoMap: Record<string, TagInfo>
): number => {
  const cardTagIds = cardTagsMap[cardId] || [];
  
// If no tags, return -1 (highest priority - will appear at top)
  if (cardTagIds.length === 0) return -1;
  
  let bestScore = 1000;
  
  for (const tagId of cardTagIds) {
    const tagInfo = tagsInfoMap[tagId];
    if (!tagInfo) continue;
    
    const tagNameLower = tagInfo.name.toLowerCase().trim();
    
    // Check priority names first
    const priorityIndex = PRIORITY_NAMES.findIndex(name => tagNameLower === name);
    if (priorityIndex !== -1) {
      bestScore = Math.min(bestScore, priorityIndex);
      continue;
    }
    
    // Check colors
    if (isRedColor(tagInfo.color)) {
      bestScore = Math.min(bestScore, 100); // Red tags after priority names
    } else if (isYellowColor(tagInfo.color)) {
      bestScore = Math.min(bestScore, 200); // Yellow tags after red
    } else {
      bestScore = Math.min(bestScore, 500); // Other tags
    }
  }
  
  return bestScore;
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  cards,
  selectedTags = [],
  onRefreshCards,
  onCardClick
}) => {
  const [activeCard, setActiveCard] = React.useState<CRMCard | null>(null);
  const [localCards, setLocalCards] = React.useState<CRMCard[]>(cards);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [cardTagsMap, setCardTagsMap] = React.useState<Record<string, string[]>>({});
  const [tagsInfoMap, setTagsInfoMap] = React.useState<Record<string, TagInfo>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  React.useEffect(() => {
    setLocalCards(cards);
    
    // Carregar etiquetas de todos os cards com informações completas
    const fetchAllCardTags = async () => {
      const cardIds = cards.map(c => c.id);
      if (cardIds.length === 0) return;
      
      // Fetch card-tag relationships with tag info
      const { data, error } = await supabase
        .from('crm_card_tags')
        .select(`
          card_id, 
          tag_id,
          crm_tags (
            id,
            name,
            color
          )
        `)
        .in('card_id', cardIds);
      
      if (data && !error) {
        const tagsMap: Record<string, string[]> = {};
        const infoMap: Record<string, TagInfo> = {};
        
        data.forEach((ct: any) => {
          if (!tagsMap[ct.card_id]) {
            tagsMap[ct.card_id] = [];
          }
          tagsMap[ct.card_id].push(ct.tag_id);
          
          // Store tag info
          if (ct.crm_tags) {
            infoMap[ct.tag_id] = {
              id: ct.crm_tags.id,
              name: ct.crm_tags.name,
              color: ct.crm_tags.color
            };
          }
        });
        
        setCardTagsMap(tagsMap);
        setTagsInfoMap(infoMap);
      }
    };
    
    fetchAllCardTags();
  }, [cards]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = localCards.find(c => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    // Apenas detecta sobre qual coluna estamos, sem mover cards
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = localCards.find(c => c.id === activeId);
    if (!activeCard) return;

    try {
      // Determinar o novo stage_id
      let newStageId = activeCard.stage_id;
      
      // Se arrastamos sobre uma coluna
      if (stages.find(stage => stage.id === overId)) {
        newStageId = overId;
      }
      
      // Se arrastamos sobre outro card
      const overCard = localCards.find(c => c.id === overId);
      if (overCard) {
        newStageId = overCard.stage_id;
        
        // Bloquear movimentação dentro da mesma coluna
        if (newStageId === activeCard.stage_id) {
          return;
        }
      }

      // Se o estágio mudou, atualizar via edge function (bypass RLS)
      if (newStageId !== activeCard.stage_id) {
        const { data, error } = await lovableSupabase.functions.invoke('move-card-stage', {
          body: { cardId: activeId, newStageId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast('Card movido com sucesso!');
        onRefreshCards();
      }

    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast('Erro ao mover card');
      // Reverter mudança local em caso de erro
      setLocalCards(cards);
    }
  };

  // Gerar displayNames com prefixo "Xº Mês"
  const stageDisplayNames = React.useMemo(() => {
    const names: Record<string, string> = {};
    let monthCounter = 1;
    for (const stage of stages) {
      const isRetencao = stage.name.toLowerCase().includes('retenção') || stage.name.toLowerCase().includes('retencao');
      if (isRetencao) {
        names[stage.id] = stage.name;
      } else {
        names[stage.id] = `${monthCounter}º Mês - ${stage.name}`;
        monthCounter++;
      }
    }
    return names;
  }, [stages]);

  // Organizar cards por estágio, filtrar por etiquetas e ordenar por prioridade
  const getCardsForStage = (stageId: string) => {
    return localCards
      .filter(card => {
        // Filtrar por estágio
        if (card.stage_id !== stageId) return false;
        
        // Se não há tags selecionadas, mostrar todos
        if (selectedTags.length === 0) return true;
        
        // Verificar se o card tem alguma das tags selecionadas (lógica OR)
        const cardTags = cardTagsMap[card.id] || [];
        return selectedTags.some(tagId => cardTags.includes(tagId));
      })
      .sort((a, b) => {
        // Sort by tag priority first
        const aPriority = getCardPriorityScore(a.id, cardTagsMap, tagsInfoMap);
        const bPriority = getCardPriorityScore(b.id, cardTagsMap, tagsInfoMap);
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same priority (or both have no tags), sort by creation date (newest first)
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto overflow-y-auto h-full -mx-2 px-2 md:mx-0 md:px-0">
        <div 
          className="flex md:grid gap-3 md:gap-2.5 pb-4 h-full snap-x snap-mandatory md:snap-none"
          style={{
            gridTemplateColumns: `repeat(${stages.length}, minmax(190px, 280px))`,
          }}
        >
          <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
            {stages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={getCardsForStage(stage.id)}
                onCardClick={onCardClick}
                isOver={overId === stage.id || localCards.some(c => c.id === overId && c.stage_id === stage.id)}
                displayName={stageDisplayNames[stage.id]}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 opacity-90 scale-105 transition-all duration-200 ease-out animate-in fade-in-0 zoom-in-95">
            <KanbanCard card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};