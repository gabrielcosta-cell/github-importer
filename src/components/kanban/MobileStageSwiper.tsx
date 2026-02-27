import React, { useState, useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import { CRMStage, CRMCard } from '@/types/kanban';

interface MobileStageSwiperProps {
  stages: CRMStage[];
  cardsByStage: Record<string, CRMCard[]>;
  onCardClick: (card: CRMCard) => void;
  isOver?: boolean;
  overId?: string | null;
}

export const MobileStageSwiper: React.FC<MobileStageSwiperProps> = ({
  stages,
  cardsByStage,
  onCardClick,
  overId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const { x: startX, y: startY, time: startTime } = touchStartRef.current;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const elapsed = Date.now() - startTime;

    // Swipe detection: >40px horizontal, more horizontal than vertical, <500ms
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 500) {
      if (deltaX < 0 && currentIndex < stages.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (deltaX > 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    touchStartRef.current = null;
  }, [currentIndex, stages.length]);

  if (stages.length === 0) return null;

  const currentStage = stages[currentIndex];
  const cards = cardsByStage[currentStage.id] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Stage content area - swipeable */}

      {/* Stage content area - swipeable */}
      <div
        className="flex-1 min-h-0 overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <MobileStageColumn
          stage={currentStage}
          cards={cards}
          onCardClick={onCardClick}
          isOver={overId === currentStage.id}
        />
      </div>
    </div>
  );
};

// Individual stage column for mobile
const MobileStageColumn: React.FC<{
  stage: CRMStage;
  cards: CRMCard[];
  onCardClick: (card: CRMCard) => void;
  isOver: boolean;
}> = ({ stage, cards, onCardClick, isOver }) => {
  const { setNodeRef } = useDroppable({ id: stage.id });

  const totalValue = cards.reduce((sum, card) => sum + (card.monthly_revenue || 0), 0);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div ref={setNodeRef} className="flex flex-col h-full">
      {/* Stage header */}
      <div className={`relative p-3 border-b border-border/10 bg-gradient-to-r from-background/5 to-background/10 flex-shrink-0 rounded-t-xl ${
        isOver ? 'ring-2 ring-primary/40' : ''
      }`}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-60" style={{ color: stage.color }} />
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full opacity-80 flex-shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-foreground tracking-tight text-base">{stage.name}</h3>
        </div>
        <div className="text-sm text-muted-foreground/80 font-medium">
          {formatCurrency(totalValue)} · {cards.length} {cards.length === 1 ? 'negócio' : 'negócios'}
        </div>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cards.map(card => (
          <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-muted-foreground/60 text-sm py-8">
            Nenhum card nesta etapa
          </div>
        )}
      </div>
    </div>
  );
};
