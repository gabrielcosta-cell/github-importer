import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StageTask {
  id: string;
  stage_id: string;
  pipeline_id: string;
  title: string;
  description: string | null;
  deadline_days: number;
  position: number;
  is_active: boolean;
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface TasksConfigProps {
  pipelines: Pipeline[];
}

export const TasksConfig: React.FC<TasksConfigProps> = ({ pipelines }) => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<StageTask[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Formulário de nova tarefa
  const [newTask, setNewTask] = useState({
    stage_id: '',
    title: '',
    description: '',
    deadline_days: 1,
  });

  // Carregar estágios do pipeline selecionado
  useEffect(() => {
    if (!selectedPipeline) {
      setStages([]);
      setTasks([]);
      return;
    }

    const fetchStages = async () => {
      const { data, error } = await supabase
        .from('crm_stages')
        .select('id, name, color')
        .eq('pipeline_id', selectedPipeline)
        .eq('is_active', true)
        .order('position');

      if (error) {
        console.error('Erro ao carregar estágios:', error);
        return;
      }

      setStages(data || []);
    };

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('crm_stage_tasks')
        .select('*')
        .eq('pipeline_id', selectedPipeline)
        .eq('is_active', true)
        .order('position');

      if (error) {
        console.error('Erro ao carregar tarefas:', error);
        return;
      }

      setTasks(data || []);
    };

    fetchStages();
    fetchTasks();
  }, [selectedPipeline]);

  const handleAddTask = async () => {
    if (!newTask.stage_id || !newTask.title.trim()) {
      toast.error('Preencha a etapa e o título da tarefa');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const maxPosition = tasks.filter(t => t.stage_id === newTask.stage_id).length;

      const { error } = await supabase
        .from('crm_stage_tasks')
        .insert({
          stage_id: newTask.stage_id,
          pipeline_id: selectedPipeline,
          title: newTask.title,
          description: newTask.description || null,
          deadline_days: newTask.deadline_days,
          position: maxPosition,
          created_by: user.user.id,
        });

      if (error) throw error;

      toast.success('Tarefa adicionada com sucesso!');
      setNewTask({ stage_id: '', title: '', description: '', deadline_days: 1 });
      
      // Recarregar tarefas
      const { data: updatedTasks } = await supabase
        .from('crm_stage_tasks')
        .select('*')
        .eq('pipeline_id', selectedPipeline)
        .eq('is_active', true)
        .order('position');
      
      setTasks(updatedTasks || []);
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Erro ao adicionar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('crm_stage_tasks')
        .update({ is_active: false })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Tarefa removida com sucesso!');
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
      toast.error('Erro ao remover tarefa');
    }
  };

  const getStageColor = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || '#666';
  };

  const getStageName = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || 'Desconhecido';
  };

  // Agrupar tarefas por etapa
  const tasksByStage = stages.map(stage => ({
    stage,
    tasks: tasks.filter(t => t.stage_id === stage.id),
  }));

  return (
    <div className="space-y-6">
      {/* Seletor de Pipeline */}
      <div className="space-y-2">
        <Label>Selecione o Funil</Label>
        <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map(pipeline => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPipeline && (
        <>
          {/* Formulário de Nova Tarefa */}
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select 
                    value={newTask.stage_id} 
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, stage_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prazo (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newTask.deadline_days}
                    onChange={(e) => setNewTask(prev => ({ ...prev, deadline_days: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título da Tarefa</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Enviar WhatsApp"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da tarefa..."
                  rows={2}
                />
              </div>

              <Button onClick={handleAddTask} disabled={loading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tarefa
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Tarefas por Etapa */}
          <div className="space-y-4">
            <h4 className="font-medium">Tarefas Configuradas</h4>
            
            {tasksByStage.map(({ stage, tasks: stageTasks }) => (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-medium">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stageTasks.length} {stageTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </Badge>
                </div>

                {stageTasks.length > 0 ? (
                  <div className="space-y-2 ml-5">
                    {stageTasks.map(task => (
                      <Card key={task.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                              )}
                              <Badge variant="outline" className="text-xs mt-2">
                                Prazo: {task.deadline_days} {task.deadline_days === 1 ? 'dia' : 'dias'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground ml-5">
                    Nenhuma tarefa configurada para esta etapa
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
