import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createCardTasksForStage } from '@/hooks/useCardTasks';

interface CardTask {
  id: string;
  card_id: string;
  stage_task_id: string;
  title: string;
  description: string | null;
  deadline_date: string;
  completed_at: string | null;
  completed_by: string | null;
  is_completed: boolean;
}

interface CardTasksListProps {
  cardId: string;
  stageId?: string;
  onTasksChange?: () => void;
}

export const CardTasksList: React.FC<CardTasksListProps> = ({ cardId, stageId, onTasksChange }) => {
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_card_tasks')
        .select('*')
        .eq('card_id', cardId)
        .order('deadline_date');

      if (error) throw error;
      
      // Se não há tarefas e temos stageId, criar tarefas automaticamente
      if ((!data || data.length === 0) && stageId) {
        await createCardTasksForStage(cardId, stageId);
        // Buscar novamente após criar
        const { data: newData, error: newError } = await supabase
          .from('crm_card_tasks')
          .select('*')
          .eq('card_id', cardId)
          .order('deadline_date');
        
        if (!newError) {
          setTasks(newData || []);
        }
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [cardId, stageId]);

  const handleToggleTask = async (task: CardTask) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newCompleted = !task.is_completed;
      
      const { error } = await supabase
        .from('crm_card_tasks')
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          completed_by: newCompleted ? user.user.id : null,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast.success(newCompleted ? 'Tarefa concluída!' : 'Tarefa reaberta');
      fetchTasks();
      onTasksChange?.();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const getTaskStatus = (task: CardTask) => {
    if (task.is_completed) return 'completed';
    
    const deadline = new Date(task.deadline_date);
    const now = new Date();
    
    if (isPast(deadline)) return 'overdue';
    return 'pending';
  };

  const getOverdueDays = (task: CardTask) => {
    if (task.is_completed) return 0;
    const deadline = new Date(task.deadline_date);
    const now = new Date();
    const days = differenceInDays(now, deadline);
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Carregando tarefas...
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);
  const overdueTasks = pendingTasks.filter(t => getTaskStatus(t) === 'overdue');

  return (
    <div className="space-y-2">
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto hover:bg-transparent">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tarefas
              </span>
              {overdueTasks.length > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  {overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2">
          {/* Tarefas pendentes/atrasadas */}
          {pendingTasks.map(task => {
            const status = getTaskStatus(task);
            const overdueDays = getOverdueDays(task);

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  status === 'overdue' 
                    ? "bg-red-500/10 border-red-500/30" 
                    : "bg-muted/30 border-border/40"
                )}
              >
                <button
                  onClick={() => handleToggleTask(task)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <Circle className={cn(
                    "h-5 w-5 transition-colors",
                    status === 'overdue' ? "text-red-500" : "text-muted-foreground hover:text-primary"
                  )} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-medium text-sm",
                      status === 'overdue' && "text-red-600"
                    )}>
                      {task.title}
                    </span>
                    
                    {status === 'overdue' && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {overdueDays}d atrasado
                      </Badge>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Prazo: {format(new Date(task.deadline_date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tarefas concluídas */}
          {completedTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs text-muted-foreground">Concluídas</span>
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-muted-foreground line-through">
                      {task.title}
                    </span>

                    {task.completed_at && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          Concluída em {format(new Date(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
