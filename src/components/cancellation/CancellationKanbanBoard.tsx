import React from 'react';
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
import { CancellationKanbanColumn } from './CancellationKanbanColumn';
import { CancellationCard } from './CancellationCard';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';

export interface StageNotes {
  nova?: string;
  triagem?: string;
  aguardando_briefings?: string;
  analise_briefings?: string;
  call_agendada?: string;
  call_realizada?: string;
}

export interface CancellationRequest {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  contract_name: string | null;
  contract_value: number | null;
  reason: string | null;
  observations: string | null;
  status: string;
  stage: string;
  squad: string | null;
  card_id: string | null;
  google_meet_link: string | null;
  meetrox_link: string | null;
  meeting_notes: string | null;
  financial_analysis: string | null;
  final_result: string | null;
  result_registered_at: string | null;
  result_registered_by: string | null;
  resolution_notes: string | null;
  stage_notes: StageNotes | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CancellationStage {
  id: string;
  name: string;
  color: string;
}

interface CancellationKanbanBoardProps {
  stages: CancellationStage[];
  requests: CancellationRequest[];
  onRefreshRequests: () => void;
  onRequestClick: (request: CancellationRequest) => void;
  canDelete?: boolean;
  onDeleteRequest?: (request: CancellationRequest) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}

export const CancellationKanbanBoard: React.FC<CancellationKanbanBoardProps> = ({
  stages,
  requests,
  onRefreshRequests,
  onRequestClick,
  canDelete,
  onDeleteRequest,
  onDragEnd: parentDragEnd,
}) => {
  const [activeRequest, setActiveRequest] = React.useState<CancellationRequest | null>(null);
  const [localRequests, setLocalRequests] = React.useState<CancellationRequest[]>(requests);
  const [overId, setOverId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  React.useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const request = localRequests.find(r => r.id === active.id);
    if (request) {
      setActiveRequest(request);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveRequest(null);
    setOverId(null);

    // Se há um handler do parent, delegar para ele (com validação)
    if (parentDragEnd) {
      parentDragEnd(event);
      return;
    }

    // Fallback: comportamento padrão sem validação
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeRequest = localRequests.find(r => r.id === activeId);
    if (!activeRequest) return;

    try {
      let newStage = activeRequest.stage;
      
      if (stages.find(stage => stage.id === overId)) {
        newStage = overId;
      }
      
      const overRequest = localRequests.find(r => r.id === overId);
      if (overRequest) {
        newStage = overRequest.stage;
        
        if (newStage === activeRequest.stage) {
          return;
        }
      }

      if (newStage !== activeRequest.stage) {
        const { error } = await supabase
          .from('cancellation_requests')
          .update({ 
            stage: newStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeId);

        if (error) throw error;

        toast.success('Solicitação movida com sucesso!');
        onRefreshRequests();
      }
    } catch (error) {
      console.error('Erro ao mover solicitação:', error);
      toast.error('Erro ao mover solicitação');
      onRefreshRequests();
    }
  };

  const getRequestsForStage = (stageId: string) => {
    return localRequests
      .filter(request => request.stage === stageId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {stages.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <CancellationKanbanColumn
              stage={stage}
              requests={getRequestsForStage(stage.id)}
              onRequestClick={onRequestClick}
              isOver={overId === stage.id}
              canDelete={canDelete}
              onDeleteRequest={onDeleteRequest}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeRequest ? (
          <div className="w-80 opacity-80">
            <CancellationCard
              request={activeRequest}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
