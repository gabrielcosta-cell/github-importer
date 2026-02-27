import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Clock, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StageHistoryEntry {
  id: string;
  stage_id: string;
  entered_at: string;
  exited_at: string | null;
  moved_by: string | null;
  reason: string | null;
  notes: string | null;
  stage_name?: string;
  stage_color?: string;
  user_name?: string;
}

interface CardStageHistoryProps {
  cardId: string;
  stages: Array<{ id: string; name: string; color: string }>;
}

export const CardStageHistory: React.FC<CardStageHistoryProps> = ({ cardId, stages }) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['card-stage-history', cardId],
    queryFn: async () => {
      const { data: historyData, error: historyError } = await supabase
        .from('csm_card_stage_history')
        .select('*')
        .eq('card_id', cardId)
        .order('entered_at', { ascending: false });

      if (historyError) throw historyError;

      // Buscar informações dos usuários
      const userIds = [...new Set(historyData?.map(h => h.moved_by).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      const userMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      // Enriquecer dados com informações de stage e usuário
      return historyData?.map(entry => {
        const stage = stages.find(s => s.id === entry.stage_id);
        return {
          ...entry,
          stage_name: stage?.name || 'Etapa desconhecida',
          stage_color: stage?.color || '#6366f1',
          user_name: entry.moved_by ? userMap.get(entry.moved_by) || 'Usuário desconhecido' : null
        };
      }) || [];
    },
    enabled: !!cardId
  });

  const calculateDuration = (enteredAt: string, exitedAt: string | null) => {
    const start = new Date(enteredAt);
    const end = exitedAt ? new Date(exitedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Carregando histórico...</div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {history.map((entry, index) => {
              const isCurrentStage = !entry.exited_at;
              const previousEntry = history[index + 1];
              
              return (
                <div key={entry.id} className="relative">
                  {/* Timeline connector */}
                  {index < history.length - 1 && (
                    <div className="absolute left-3 top-12 bottom-0 w-px bg-border" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* Stage indicator */}
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-background flex-shrink-0 z-10"
                      style={{ backgroundColor: entry.stage_color }}
                    />
                    
                    <div className="flex-1 space-y-2">
                      {/* Stage transition */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {previousEntry && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {previousEntry.stage_name}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <Badge 
                          variant="secondary" 
                          className="text-xs font-medium"
                          style={{ 
                            backgroundColor: `${entry.stage_color}20`,
                            color: entry.stage_color,
                            borderColor: entry.stage_color
                          }}
                        >
                          {entry.stage_name}
                        </Badge>
                        {isCurrentStage && (
                          <Badge variant="default" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                      
                      {/* Date and duration */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(entry.entered_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {!isCurrentStage && entry.exited_at && (
                            <>
                              <span>→</span>
                              <span>
                                {format(new Date(entry.exited_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Tempo: {calculateDuration(entry.entered_at, entry.exited_at)}
                          </span>
                        </div>
                        
                        {entry.user_name && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3 w-3" />
                            <span>Movido por: {entry.user_name}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Reason and notes */}
                      {(entry.reason || entry.notes) && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                          {entry.reason && (
                            <div>
                              <span className="font-medium">Motivo:</span> {entry.reason}
                            </div>
                          )}
                          {entry.notes && (
                            <div>
                              <span className="font-medium">Observações:</span> {entry.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < history.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};