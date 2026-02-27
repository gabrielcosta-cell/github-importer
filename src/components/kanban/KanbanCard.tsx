import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Flag, DollarSign, CheckCircle2 } from 'lucide-react';
import { CRMCard } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/external-client';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast } from 'date-fns';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CardTask {
  id: string;
  is_completed: boolean;
  deadline_date: string;
}

interface KanbanCardProps {
  card: CRMCard;
  onClick?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, onClick }) => {
  const [squadIcon, setSquadIcon] = useState<string>('Users');
  const [cardTags, setCardTags] = useState<Tag[]>([]);
  const [cardTasks, setCardTasks] = useState<CardTask[]>([]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: card.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const [squadColor, setSquadColor] = useState<string>('');

  // Carregar ícone e cor do squad do Supabase
  useEffect(() => {
    if (!card.squad) return;

    const fetchSquadData = async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('icon, color')
        .eq('name', card.squad)
        .eq('is_active', true)
        .maybeSingle();

      if (data && !error) {
        setSquadIcon(data.icon || 'Users');
        setSquadColor(data.color || '#6366f1');
      }
    };

    fetchSquadData();
  }, [card.squad]);

  // Carregar etiquetas do card
  useEffect(() => {
    const fetchCardTags = async () => {
      const { data, error } = await supabase
        .from('crm_card_tags')
        .select(`
          tag_id,
          crm_tags (
            id,
            name,
            color
          )
        `)
        .eq('card_id', card.id);

      if (data && !error) {
        const tags = data
          .map((ct: any) => ct.crm_tags)
          .filter((tag): tag is Tag => tag !== null);
        setCardTags(tags);
      }
    };

    fetchCardTags();
  }, [card.id]);

  // Carregar tarefas do card para verificar atrasos
  useEffect(() => {
    const fetchCardTasks = async () => {
      const { data, error } = await supabase
        .from('crm_card_tasks')
        .select('id, is_completed, deadline_date')
        .eq('card_id', card.id);

      if (data && !error) {
        setCardTasks(data);
      }
    };

    fetchCardTasks();
  }, [card.id]);

  // Calcular tarefas atrasadas
  const overdueTasks = cardTasks.filter(task => {
    if (task.is_completed) return false;
    const deadline = new Date(task.deadline_date);
    return isPast(deadline);
  });

  const maxOverdueDays = overdueTasks.reduce((max, task) => {
    const deadline = new Date(task.deadline_date);
    const days = differenceInDays(new Date(), deadline);
    return days > max ? days : max;
  }, 0);

  const hasOverdueTasks = overdueTasks.length > 0;
  const allTasksCompleted = cardTasks.length > 0 && cardTasks.every(t => t.is_completed);

  // Formatar valor como moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar faturamento_display para texto legível
  const formatFaturamentoDisplay = (faturamento: string | null | undefined): string | null => {
    if (!faturamento) return null;
    
    // Mapeamento de valores do banco para texto legível
    const faturamentoMap: Record<string, string> = {
      'ate_r$50k': 'Até R$ 50k',
      'de_r$50k_a_r$100k': 'R$ 50k - R$ 100k',
      'de_r$100k_a_r$200k': 'R$ 100k - R$ 200k',
      'de_r$200k_a_r$400k': 'R$ 200k - R$ 400k',
      'de_r$200k_a_r$401k': 'R$ 200k - R$ 400k',
      'de_r$400k_a_r$1mm': 'R$ 400k - R$ 1MM',
      'de_r$401k_a_r$1mm': 'R$ 400k - R$ 1MM',
      'de_r$1mm_a_r$5mm': 'R$ 1MM - R$ 5MM',
      'de_r$5mm_a_r$10mm': 'R$ 5MM - R$ 10MM',
      'acima_de_r$10mm': 'Acima de R$ 10MM',
      // Variações adicionais
      'ate_50k': 'Até R$ 50k',
      'de_50k_a_100k': 'R$ 50k - R$ 100k',
      'de_100k_a_200k': 'R$ 100k - R$ 200k',
      'de_200k_a_400k': 'R$ 200k - R$ 400k',
      'de_400k_a_1mm': 'R$ 400k - R$ 1MM',
      'de_1mm_a_5mm': 'R$ 1MM - R$ 5MM',
      'de_5mm_a_10mm': 'R$ 5MM - R$ 10MM',
      'acima_de_10mm': 'Acima de R$ 10MM',
    };
    
    // Se o valor está no mapa, usar o valor mapeado
    if (faturamentoMap[faturamento]) {
      return faturamentoMap[faturamento];
    }
    
    // Fallback: tentar formatar valores não mapeados
    // Substituir underscores por espaços e capitalizar
    let formatted = faturamento
      .replace(/_/g, ' ')
      .replace(/r\$/gi, 'R$')
      .replace(/\bde\b/gi, '')
      .replace(/\ba\b/gi, '-')
      .replace(/\bate\b/gi, 'Até')
      .replace(/\bacima\b/gi, 'Acima de')
      .replace(/\bmm\b/gi, 'MM')
      .replace(/\bk\b/gi, 'k')
      .trim()
      .replace(/\s+/g, ' ');
    
    return formatted || faturamento;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  // Obter o componente de ícone dinamicamente
  const SquadIcon = card.squad ? (LucideIcons as any)[squadIcon] || Users : null;

  // Cores dos planos
  const getPlanoColor = (plano: string | null) => {
    if (!plano) return '';
    switch (plano) {
      case 'Starter': return 'bg-green-500/10 border-green-500/30 text-green-600';
      case 'Business': return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'Pro': return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      case 'Conceito': return 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]';
      case 'Social': return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      default: return '';
    }
  };

  // Gerar estilo dinâmico para squad badge baseado na cor do banco
  const getSquadStyle = () => {
    if (!squadColor) return {};
    
    // Converter hex para RGB para criar versões com transparência
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(squadColor);
    if (!rgb) return {};
    
    return {
      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      color: squadColor,
    };
  };

  // Determinar status das tarefas: 'overdue' | 'completed' | 'pending' | null
  const taskStatus = cardTasks.length > 0 
    ? hasOverdueTasks 
      ? 'overdue' 
      : allTasksCompleted 
        ? 'completed' 
        : 'pending'
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "min-h-[100px] md:min-h-[95px] w-full md:max-w-[210px] flex flex-col flex-shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.02] md:hover:scale-105 relative touch-manipulation",
        hasOverdueTasks 
          ? "bg-red-500/10 border-red-500/40" 
          : "bg-background"
      )}
    >
      {/* Bolinha de Status das Tarefas */}
      {taskStatus && (
        <div 
          className={cn(
            "absolute -top-1.5 -right-1.5 w-6 h-6 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] md:text-[9px] font-bold shadow-sm border",
            taskStatus === 'overdue' && "bg-red-500 text-white border-red-600",
            taskStatus === 'completed' && "bg-green-500 text-white border-green-600",
            taskStatus === 'pending' && "bg-muted text-muted-foreground border-border"
          )}
        >
          {taskStatus === 'overdue' ? (
            <span>{maxOverdueDays}d</span>
          ) : taskStatus === 'completed' ? (
            <CheckCircle2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
          ) : (
            <span className="h-2.5 w-2.5 md:h-2 md:w-2 rounded-full bg-muted-foreground/50" />
          )}
        </div>
      )}

      <CardContent className="p-3 md:p-2 space-y-2 md:space-y-1.5 flex-1 flex flex-col overflow-hidden">
        {/* Título */}
        <div className="font-medium text-sm md:text-[11px] line-clamp-2 leading-tight">
          {card.company_name || card.title}
        </div>

        {/* Squad, Plano, Flag, Etiquetas e Nota - tudo em uma linha */}
        <div className="flex flex-nowrap gap-1.5 md:gap-1 items-center overflow-hidden">
          {card.squad && SquadIcon && (
            <Badge 
              variant="outline" 
              className="text-xs md:text-[10px] flex items-center gap-1 md:gap-0.5 px-2 md:px-1.5 py-0.5 md:py-0 h-6 md:h-[18px] border flex-shrink-0"
              style={getSquadStyle()}
            >
              <SquadIcon className="h-3 w-3 md:h-2.5 md:w-2.5" />
              <span className="leading-none">{card.squad}</span>
            </Badge>
          )}
          {card.plano && (
            <Badge variant="outline" className={`text-xs md:text-[10px] px-2 md:px-1.5 py-0.5 md:py-0 h-6 md:h-[18px] leading-none flex-shrink-0 ${getPlanoColor(card.plano)}`}>
              {card.plano}
            </Badge>
          )}
          {(card as any).flag && (
            <Badge 
              variant="outline" 
              className={`text-xs md:text-[10px] px-2 md:px-1.5 py-0.5 md:py-0 h-6 md:h-[18px] leading-none flex items-center gap-0.5 flex-shrink-0 ${
                (card as any).flag === 'verde' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                (card as any).flag === 'amarela' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
                (card as any).flag === 'vermelha' ? 'bg-red-500/10 border-red-500/30 text-red-600' :
                ''
              }`}
            >
              <Flag className="h-3.5 w-3.5 md:h-3 md:w-3" />
            </Badge>
          )}
          {cardTags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-[10px] md:text-[9px] px-2 md:px-1.5 py-0.5 md:py-0 h-5 md:h-4 leading-none border flex-shrink-0"
              style={{
                backgroundColor: `${tag.color}15`,
                borderColor: `${tag.color}40`,
                color: tag.color,
              }}
            >
              {tag.name}
            </Badge>
          ))}
          {cardTags.length > 2 && (
            <Badge variant="outline" className="text-[10px] md:text-[9px] px-2 md:px-1.5 py-0.5 md:py-0 h-5 md:h-4 leading-none flex-shrink-0">
              +{cardTags.length - 2}
            </Badge>
          )}
          {(() => {
            const qualificationScore = [
              card.qual_nicho_certo,
              card.qual_porte_empresa,
              card.qual_tomador_decisao,
              card.qual_investe_marketing,
              card.qual_urgencia_real,
              card.qual_clareza_objetivos
            ].reduce((sum, val) => sum + (val || 0), 0);
            
            if (qualificationScore === 0) return null;
            
            const getScoreColorBg = (score: number) => {
              if (score >= 0 && score <= 5) return 'bg-red-500/15 border-red-500/40 text-red-600';
              if (score >= 6 && score <= 7) return 'bg-blue-500/15 border-blue-500/40 text-blue-600';
              if (score >= 8 && score <= 10) return 'bg-green-500/15 border-green-500/40 text-green-600';
              if (score >= 11 && score <= 12) return 'bg-green-500/15 border-green-500/40 text-green-600 animate-pulse';
              return '';
            };

            return (
              <Badge 
                variant="outline" 
                className={`text-[10px] md:text-[9px] px-2 md:px-1.5 py-0.5 md:py-0 h-5 md:h-4 leading-none border font-semibold flex-shrink-0 ${getScoreColorBg(qualificationScore)}`}
              >
                {qualificationScore}/12
              </Badge>
            );
          })()}
        </div>

        {/* Contato */}
        {card.contact_name && (
          <div className="flex items-center gap-1.5 md:gap-1 text-xs md:text-[10px] text-muted-foreground">
            <User className="h-3 w-3 md:h-2.5 md:w-2.5 flex-shrink-0" />
            <span className="truncate">{card.contact_name}</span>
          </div>
        )}

        {/* Faturamento */}
        {(card.faturamento_display || card.value > 0) && (
          <div className="flex items-center gap-1.5 md:gap-1 text-xs md:text-[10px] text-muted-foreground">
            <DollarSign className="h-3 w-3 md:h-2.5 md:w-2.5 flex-shrink-0" />
            <span className="truncate">
              {formatFaturamentoDisplay(card.faturamento_display) || formatCurrency(card.value)}
            </span>
          </div>
        )}

        {/* MRR (Receita Mensal) */}
        {card.monthly_revenue > 0 && (
          <Badge variant="secondary" className="text-xs md:text-[10px] font-medium px-2 md:px-1.5 py-0.5 md:py-0 h-6 md:h-[18px] leading-none mt-auto w-fit">
            {formatCurrency(card.monthly_revenue)}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
