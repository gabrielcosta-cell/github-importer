import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, User, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CancellationRequest {
  id: string;
  empresa: string;
  responsavel: string;
  email: string;
  motivo: string;
  observacoes: string | null;
  status: string;
  stage: string | null;
  created_at: string;
  resolution_notes: string | null;
  resolved_at: string | null;
}

interface CancellationHistoryProps {
  cardId: string;
}

export const CancellationHistory: React.FC<CancellationHistoryProps> = ({ cardId }) => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCancellationRequests();
  }, [cardId]);

  const fetchCancellationRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de cancelamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      em_analise: { label: 'Em Análise', variant: 'default' as const },
      resolvido: { label: 'Resolvido', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const handleNavigateToRequest = () => {
    navigate('/gestao-cancelamentos');
  };

  if (loading) {
    return (
      <div className="p-4 bg-card/60 backdrop-blur-sm rounded-lg border shadow-sm">
        <h3 className="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Histórico de Cancelamentos
        </h3>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-4 bg-card/60 backdrop-blur-sm rounded-lg border shadow-sm">
        <h3 className="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Histórico de Cancelamentos
        </h3>
        <div className="text-sm text-muted-foreground">
          Nenhuma solicitação de cancelamento registrada
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card/60 backdrop-blur-sm rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Histórico de Cancelamentos
          <Badge variant="secondary" className="ml-2">
            {requests.length}
          </Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNavigateToRequest}
          className="h-7 text-xs"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Ver todos
        </Button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <Collapsible key={request.id}>
            <div className="p-3 bg-background/50 rounded-md border border-border/40 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{request.responsavel}</span>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <CollapsibleTrigger className="w-full">
                <div className="flex items-start gap-2 mt-2 text-left">
                  <FileText className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium text-foreground">Motivo:</span> {request.motivo}
                  </p>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2 pt-2 border-t border-border/20">
                <div className="space-y-2 text-xs">
                  {request.observacoes && (
                    <div>
                      <span className="font-medium text-foreground">Observações:</span>
                      <p className="text-muted-foreground mt-1">{request.observacoes}</p>
                    </div>
                  )}
                  {request.resolution_notes && (
                    <div>
                      <span className="font-medium text-foreground">Resolução:</span>
                      <p className="text-muted-foreground mt-1">{request.resolution_notes}</p>
                    </div>
                  )}
                  {request.resolved_at && (
                    <div className="text-muted-foreground">
                      Resolvido em: {format(new Date(request.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
