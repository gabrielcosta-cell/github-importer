import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { CSMStage, CSMCard } from '@/types/kanban';

interface KanbanColumnProps {
  stage: CSMStage;
  cards: CSMCard[];
  onCardClick: (card: CSMCard) => void;
  isOver?: boolean;
  displayName?: string;
  disableDrag?: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  stage, 
  cards, 
  onCardClick,
  isOver = false,
  displayName,
  disableDrag = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  // Calcular valor total dos cards na coluna (MRR)
  const totalValue = cards.reduce((sum, card) => sum + (card.monthly_revenue || 0), 0);

  // Formatar valor como moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="w-[85vw] min-w-[85vw] md:w-full md:min-w-0 md:max-w-[280px] relative flex flex-col h-full snap-center" ref={setNodeRef}>
      {/* Coluna principal com visual clean e futurista - altura completa com gradiente */}
      <div className={`relative flex flex-col bg-gradient-to-b from-card/50 via-card/40 to-card/30 backdrop-blur-xl border rounded-xl shadow-lg h-full min-h-[calc(100vh-280px)] md:min-h-[calc(100vh-200px)] transition-all duration-300 ${
        isOver 
          ? 'border-primary shadow-[0_0_40px_hsl(var(--primary)/0.5)] scale-[1.01] ring-2 ring-primary/40' 
          : 'border-border/20'
      }`}>
        
        {/* Header minimalista */}
        <div className="relative p-3 md:p-2.5 border-b border-border/10 bg-gradient-to-r from-background/5 to-background/10 flex-shrink-0">
          {/* Indicador de cor clean */}
          <div className="absolute left-0 top-0 bottom-0 w-1 md:w-0.5 bg-gradient-to-b from-transparent via-current to-transparent opacity-60" style={{ color: stage.color }} />
          
          <div className="flex items-center gap-2 md:gap-1.5 mb-1">
            <div
              className="w-3 h-3 md:w-2 md:h-2 rounded-full opacity-80 flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-foreground tracking-tight text-base md:text-sm">{displayName || stage.name}</h3>
          </div>
          
          <div className="text-sm md:text-xs text-muted-foreground/80 font-medium">
            {formatCurrency(totalValue)} · {cards.length} {cards.length === 1 ? 'negócio' : 'negócios'}
          </div>
        </div>
        
        {/* Conteúdo da coluna - expande para preencher altura disponível */}
        <div className="p-3 md:p-2.5 flex-1 overflow-y-auto">
          <div className="space-y-3 md:space-y-2">
            {cards.map(card => (
              <KanbanCard 
                key={card.id} 
                card={card}
                onClick={() => onCardClick(card)}
                disableDrag={disableDrag}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Conector minimalista entre colunas - hidden on mobile */}
      <div className="hidden md:block absolute top-20 -right-4 bottom-0 w-px bg-gradient-to-b from-transparent via-border/40 to-transparent" />
    </div>
  );
};