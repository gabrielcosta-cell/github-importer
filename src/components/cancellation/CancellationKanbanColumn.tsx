import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CancellationCard } from './CancellationCard';
import { CancellationRequest, CancellationStage } from './CancellationKanbanBoard';

interface CancellationKanbanColumnProps {
  stage: CancellationStage;
  requests: CancellationRequest[];
  onRequestClick: (request: CancellationRequest) => void;
  isOver?: boolean;
  canDelete?: boolean;
  onDeleteRequest?: (request: CancellationRequest) => void;
}

export const CancellationKanbanColumn: React.FC<CancellationKanbanColumnProps> = ({ 
  stage, 
  requests, 
  onRequestClick,
  isOver = false,
  canDelete,
  onDeleteRequest
}) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="w-full relative flex flex-col h-full" ref={setNodeRef}>
      <div className={`relative flex flex-col bg-gradient-to-b from-card/50 via-card/40 to-card/30 backdrop-blur-xl border rounded-xl shadow-lg h-full min-h-[calc(100vh-200px)] transition-all duration-300 ${
        isOver 
          ? 'border-primary shadow-[0_0_40px_hsl(var(--primary)/0.5)] scale-[1.01] ring-2 ring-primary/40' 
          : 'border-border/20'
      }`}>
        
        <div className="relative p-3 border-b border-border/10 bg-gradient-to-r from-background/5 to-background/10 flex-shrink-0">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-60" style={{ color: stage.color }} />
          
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-2 h-2 rounded-full opacity-80 flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-foreground tracking-tight text-base">{stage.name}</h3>
          </div>
          
          <div className="text-xs text-muted-foreground/80 font-medium">
            {requests.length} {requests.length === 1 ? 'solicitação' : 'solicitações'}
          </div>
        </div>
        
        <div className="p-3 flex-1">
          <div className="space-y-2.5">
            {requests.map(request => (
              <CancellationCard 
                key={request.id} 
                request={request}
                onClick={() => onRequestClick(request)}
                canDelete={canDelete}
                onDelete={onDeleteRequest}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute top-20 -right-4 bottom-0 w-px bg-gradient-to-b from-transparent via-border/40 to-transparent" />
    </div>
  );
};
