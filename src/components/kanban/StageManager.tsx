import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit2, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';
import { CRMStage } from '@/types/kanban';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StageManagerProps {
  pipelineId: string;
  pipelineName: string;
  stages: CRMStage[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface SortableStageItemProps {
  stage: CRMStage;
  index: number;
  editingStage: CRMStage | null;
  defaultColors: string[];
  loading: boolean;
  onSetEditingStage: (stage: CRMStage | null) => void;
  onUpdateStage: () => void;
  onDeleteStage: (stageId: string) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({
  stage,
  index,
  editingStage,
  defaultColors,
  loading,
  onSetEditingStage,
  onUpdateStage,
  onDeleteStage,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-[280px] flex-shrink-0">
      {/* Coluna do estágio em formato kanban */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/20 rounded-xl shadow-lg overflow-hidden">
        
        {/* Header da coluna */}
        <div className="relative p-4 border-b border-border/10 bg-gradient-to-r from-background/5 to-background/10">
          {/* Indicador de cor */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-current to-transparent opacity-60" style={{ color: stage.color }} />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <h4 className="font-medium text-sm">{stage.name}</h4>
            </div>
            <Badge variant="secondary" className="text-xs">
              Pos. {stage.position}
            </Badge>
          </div>
        </div>
        
        {/* Conteúdo da coluna */}
        <div className="p-4 space-y-3">
          {editingStage?.id === stage.id ? (
            /* Modo de edição */
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome do Estágio</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) => onSetEditingStage({
                    ...editingStage,
                    name: e.target.value
                  })}
                  className="h-8 text-sm"
                />
              </div>
              
              <div>
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      className={`w-5 h-5 rounded-full border ${
                        editingStage.color === color ? 'border-foreground border-2' : 'border-muted'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => onSetEditingStage({
                        ...editingStage,
                        color
                      })}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" onClick={onUpdateStage} disabled={loading} className="h-7 text-xs">
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onSetEditingStage(null)}
                  className="h-7 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* Modo de visualização */
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Estágio {index + 1}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetEditingStage(stage)}
                  className="h-8 text-xs flex-1"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteStage(stage.id)}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Arraste pelo ícone para reordenar
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StageManager: React.FC<StageManagerProps> = ({
  pipelineId,
  pipelineName,
  stages,
  open,
  onClose,
  onRefresh
}) => {
  const { profile } = useAuth();
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [editingStage, setEditingStage] = useState<CRMStage | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingPipelineName, setEditingPipelineName] = useState(false);
  const [pipelineNameValue, setPipelineNameValue] = useState(pipelineName);
  const [deletePipelineDialogOpen, setDeletePipelineDialogOpen] = useState(false);
  const [localStages, setLocalStages] = useState<CRMStage[]>(stages);

  const isAdmin = profile?.custom_roles?.base_role === 'admin' || profile?.role === 'admin';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const defaultColors = [
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', 
    '#f59e0b', '#ef4444', '#3b82f6', '#f97316'
  ];

  // Criar novo estágio
  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_stages')
        .insert({
          pipeline_id: pipelineId,
          name: newStageName.trim(),
          color: newStageColor,
          position: stages.length
        });

      if (error) throw error;

      setNewStageName('');
      setNewStageColor('#6366f1');
      toast('Estágio criado com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao criar estágio:', error);
      toast('Erro ao criar estágio');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar estágio
  const handleUpdateStage = async () => {
    if (!editingStage || !editingStage.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_stages')
        .update({
          name: editingStage.name.trim(),
          color: editingStage.color
        })
        .eq('id', editingStage.id);

      if (error) throw error;

      setEditingStage(null);
      toast('Estágio atualizado com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error);
      toast('Erro ao atualizar estágio');
    } finally {
      setLoading(false);
    }
  };

  // Deletar estágio
  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Tem certeza que deseja excluir este estágio? Todos os cards serão perdidos.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      toast('Estágio excluído com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir estágio:', error);
      toast('Erro ao excluir estágio');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar nome do pipeline
  const handleUpdatePipelineName = async () => {
    if (!pipelineNameValue.trim()) {
      toast('O nome do pipeline não pode estar vazio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_pipelines')
        .update({ name: pipelineNameValue.trim() })
        .eq('id', pipelineId);

      if (error) throw error;

      toast('Nome do pipeline atualizado com sucesso!');
      setEditingPipelineName(false);
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar nome do pipeline:', error);
      toast('Erro ao atualizar nome do pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePipeline = async () => {
    if (!pipelineId) return;

    setLoading(true);
    try {
      // Primeiro, remover todos os cards relacionados a este funil
      const { error: cardsError } = await supabase
        .from('crm_cards')
        .delete()
        .eq('pipeline_id', pipelineId);

      if (cardsError) throw cardsError;

      // Em seguida, remover todos os estágios do funil
      const { error: stagesError } = await supabase
        .from('crm_stages')
        .delete()
        .eq('pipeline_id', pipelineId);

      if (stagesError) throw stagesError;

      // Por fim, remover o próprio funil
      const { error: pipelineError } = await supabase
        .from('crm_pipelines')
        .delete()
        .eq('id', pipelineId);

      if (pipelineError) throw pipelineError;

      toast('Funil excluído com sucesso!');
      setDeletePipelineDialogOpen(false);
      onClose();
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir funil:', error);
      toast('Erro ao excluir funil');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localStages.findIndex((s) => s.id === active.id);
    const newIndex = localStages.findIndex((s) => s.id === over.id);

    const newStages = arrayMove(localStages, oldIndex, newIndex);
    setLocalStages(newStages);

    // Atualizar posições no banco de dados
    try {
      const updates = newStages.map((stage, index) => ({
        id: stage.id,
        position: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('crm_stages')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast('Ordem dos estágios atualizada!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast('Erro ao atualizar ordem dos estágios');
      setLocalStages(stages);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-0">
            {editingPipelineName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={pipelineNameValue}
                  onChange={(e) => setPipelineNameValue(e.target.value)}
                  className="h-9 flex-1 max-w-md"
                  placeholder="Nome do pipeline"
                  autoFocus
                />
                <Button size="sm" onClick={handleUpdatePipelineName} disabled={loading} className="h-9">
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingPipelineName(false);
                    setPipelineNameValue(pipelineName);
                  }}
                  className="h-9"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <DialogTitle className="m-0">{pipelineName}</DialogTitle>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingPipelineName(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeletePipelineDialogOpen(true)}
                    className="h-8"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Funil
                  </Button>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulário para novo estágio */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Adicionar Novo Estágio</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="stage-name">Nome do Estágio</Label>
                    <Input
                      id="stage-name"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Ex: Qualificação"
                    />
                  </div>
                  
                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-1 mt-2">
                      {defaultColors.map(color => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newStageColor === color ? 'border-foreground' : 'border-muted'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewStageColor(color)}
                        />
                      ))}
                      <input
                        type="color"
                        value={newStageColor}
                        onChange={(e) => setNewStageColor(e.target.value)}
                        className="w-6 h-6 rounded-full border-2 border-muted cursor-pointer"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateStage} 
                    disabled={loading || !newStageName.trim()}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visualização em formato Kanban dos estágios */}
            <div>
              <h3 className="font-semibold mb-4">Estágios do Pipeline</h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={localStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {localStages.map((stage, index) => (
                      <SortableStageItem
                        key={stage.id}
                        stage={stage}
                        index={index}
                        editingStage={editingStage}
                        defaultColors={defaultColors}
                        loading={loading}
                        onSetEditingStage={setEditingStage}
                        onUpdateStage={handleUpdateStage}
                        onDeleteStage={handleDeleteStage}
                      />
                    ))}
                    
                    {localStages.length === 0 && (
                      <div className="w-full text-center py-8 text-muted-foreground">
                        <p>Nenhum estágio criado ainda.</p>
                        <p className="text-sm">Adicione um novo estágio acima para começar.</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex justify-end">
              <Button onClick={onClose}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletePipelineDialogOpen} onOpenChange={setDeletePipelineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este funil? Todos os cards e estágios relacionados serão removidos permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePipeline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              Excluir funil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};