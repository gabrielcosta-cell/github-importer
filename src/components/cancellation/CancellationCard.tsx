import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Mail, User, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { CancellationRequest } from './CancellationKanbanBoard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CancellationCardProps {
  request: CancellationRequest;
  onClick: () => void;
  canDelete?: boolean;
  onDelete?: (request: CancellationRequest) => void;
}

export const CancellationCard: React.FC<CancellationCardProps> = ({ request, onClick, canDelete, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: request.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  // Verifica se o churn já foi registrado
  const isChurnRegistered = request.status === 'cancelado' && 
    request.resolution_notes?.startsWith('Churn registrado');

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      em_analise: { label: 'Em Análise', variant: 'default' as const },
      resolvido: { label: 'Resolvido', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(request);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`group relative bg-card hover:bg-accent/50 border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:scale-[1.02] touch-manipulation ${
        isChurnRegistered ? 'border-destructive/50 bg-destructive/5' : 'border-border/40'
      }`}
    >
      {canDelete && (
        <button
          onClick={handleDelete}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all z-10"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-foreground line-clamp-1 flex-1">
            {request.contract_name || 'Sem empresa'}
          </h4>
          {isChurnRegistered && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Churn
            </Badge>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{request.client_name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{request.client_email || '-'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/20">
          <p className="text-xs text-muted-foreground font-medium">
            Motivo da solicitação: <span className="text-foreground">{request.reason || '-'}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
