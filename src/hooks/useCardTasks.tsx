import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/external-client';
import { differenceInDays, isPast } from 'date-fns';

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

interface UseCardTasksResult {
  tasks: CardTask[];
  overdueTasks: CardTask[];
  maxOverdueDays: number;
  hasOverdueTasks: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useCardTasks = (cardId: string): UseCardTasksResult => {
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!cardId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crm_card_tasks')
        .select('*')
        .eq('card_id', cardId);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas do card:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const overdueTasks = tasks.filter(task => {
    if (task.is_completed) return false;
    const deadline = new Date(task.deadline_date);
    return isPast(deadline);
  });

  const maxOverdueDays = overdueTasks.reduce((max, task) => {
    const deadline = new Date(task.deadline_date);
    const days = differenceInDays(new Date(), deadline);
    return days > max ? days : max;
  }, 0);

  return {
    tasks,
    overdueTasks,
    maxOverdueDays,
    hasOverdueTasks: overdueTasks.length > 0,
    loading,
    refetch: fetchTasks,
  };
};

// Função para criar tarefas automaticamente quando o card entra em uma etapa
export const createCardTasksForStage = async (cardId: string, stageId: string) => {
  try {
    // Buscar tarefas configuradas para esta etapa
    const { data: stageTasks, error: stageTasksError } = await supabase
      .from('crm_stage_tasks')
      .select('*')
      .eq('stage_id', stageId)
      .eq('is_active', true)
      .order('position');

    if (stageTasksError) throw stageTasksError;
    if (!stageTasks || stageTasks.length === 0) return;

    // Verificar se já existem tarefas para este card nesta etapa
    const stageTaskIds = stageTasks.map(t => t.id);
    const { data: existingTasks, error: existingError } = await supabase
      .from('crm_card_tasks')
      .select('stage_task_id')
      .eq('card_id', cardId)
      .in('stage_task_id', stageTaskIds);

    if (existingError) throw existingError;

    const existingStageTaskIds = new Set(existingTasks?.map(t => t.stage_task_id) || []);

    // Criar tarefas que ainda não existem
    const newTasks = stageTasks
      .filter(st => !existingStageTaskIds.has(st.id))
      .map(stageTask => {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + stageTask.deadline_days);

        return {
          card_id: cardId,
          stage_task_id: stageTask.id,
          title: stageTask.title,
          description: stageTask.description,
          deadline_date: deadlineDate.toISOString(),
        };
      });

    if (newTasks.length > 0) {
      const { error: insertError } = await supabase
        .from('crm_card_tasks')
        .insert(newTasks);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Erro ao criar tarefas do card:', error);
  }
};
