import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Edit2, Kanban, ChevronDown, GripVertical, X, Trash2 } from 'lucide-react';
import { CRMPipeline } from '@/types/kanban';
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

export interface SuggestedStage {
  name: string;
  color: string;
}

interface SortableStageItemProps {
  stage: SuggestedStage;
  index: number;
  onRemove: (name: string) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({ stage, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg border ${isDragging ? 'shadow-lg border-primary' : 'border-transparent'}`}
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-medium">{stage.name}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(stage.name)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

interface PipelineSelectorProps {
  pipelines: CRMPipeline[];
  selectedPipeline: string;
  onPipelineChange: (pipelineId: string) => void;
  onCreatePipeline: (name: string, description?: string, stages?: SuggestedStage[]) => void;
  onManageStages: () => void;
  onManageOrder?: () => void;
  suggestedStages?: SuggestedStage[];
}

export const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onCreatePipeline,
  onManageStages,
  onManageOrder,
  suggestedStages = []
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [selectedStages, setSelectedStages] = useState<SuggestedStage[]>([]);
  const [customStageName, setCustomStageName] = useState('');
  const [customStageColor, setCustomStageColor] = useState('#3B82F6');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Quando abre o dialog, inicializa com as sugestões selecionadas
  useEffect(() => {
    if (showCreateDialog && suggestedStages.length > 0) {
      setSelectedStages([...suggestedStages]);
    }
  }, [showCreateDialog, suggestedStages]);

  const handleCreatePipeline = () => {
    if (newPipelineName.trim()) {
      onCreatePipeline(
        newPipelineName.trim(), 
        newPipelineDescription.trim() || undefined,
        selectedStages.length > 0 ? selectedStages : undefined
      );
      setNewPipelineName('');
      setNewPipelineDescription('');
      setSelectedStages([]);
      setShowCreateDialog(false);
    }
  };

  const toggleStage = (stage: SuggestedStage, checked: boolean) => {
    setSelectedStages(prev => {
      if (checked) {
        // Adiciona no final da lista
        if (!prev.find(s => s.name === stage.name)) {
          return [...prev, stage];
        }
        return prev;
      } else {
        return prev.filter(s => s.name !== stage.name);
      }
    });
  };

  const addCustomStage = () => {
    if (customStageName.trim()) {
      const newStage: SuggestedStage = {
        name: customStageName.trim(),
        color: customStageColor
      };
      setSelectedStages(prev => [...prev, newStage]);
      setCustomStageName('');
      setCustomStageColor('#3B82F6');
    }
  };

  const removeStage = (stageName: string) => {
    setSelectedStages(prev => prev.filter(s => s.name !== stageName));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedStages((items) => {
        const oldIndex = items.findIndex(i => i.name === active.id);
        const newIndex = items.findIndex(i => i.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const selectedPipelineName = pipelines.find(p => p.id === selectedPipeline)?.name || 'Selecione um funil';

  const defaultColors = [
    '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EF4444', '#EC4899'
  ];

  return (
    <>
      <div className="flex items-center bg-background border rounded-lg overflow-hidden w-[220px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="border-0 rounded-none hover:bg-accent/50 focus:ring-0 w-full justify-start text-xs">
              <Kanban className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
              <span className="flex-1 text-left">{selectedPipelineName}</span>
              <ChevronDown className="h-3.5 w-3.5 ml-2 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
                {pipelines.map(pipeline => (
                  <Button
                    key={pipeline.id}
                    variant={selectedPipeline === pipeline.id ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start transition-all duration-150"
                    onClick={() => onPipelineChange(pipeline.id)}
                  >
                    {pipeline.name}
                  </Button>
                ))}
                
                <Separator className="my-2" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-150"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Funil
                </Button>
                
                {onManageOrder && pipelines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground transition-all duration-150"
                    onClick={onManageOrder}
                  >
                    <GripVertical className="h-4 w-4 mr-2" />
                    Organizar Ordem dos Funis
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {selectedPipeline && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageStages}
              className="border-0 rounded-none hover:bg-accent/50 h-9 px-3"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Dialog para criar novo funil */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pipeline-name">Nome do Funil *</Label>
              <Input
                id="pipeline-name"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ex: Clientes Premium"
              />
            </div>
            
            <div>
              <Label htmlFor="pipeline-description">Descrição (opcional)</Label>
              <Textarea
                id="pipeline-description"
                value={newPipelineDescription}
                onChange={(e) => setNewPipelineDescription(e.target.value)}
                placeholder="Descrição do funil..."
                rows={2}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Colunas do Funil</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Selecione as colunas sugeridas ou adicione novas. Arraste para reordenar.
              </p>

              {/* Colunas selecionadas com drag-and-drop */}
              {selectedStages.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Colunas selecionadas ({selectedStages.length}):
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={selectedStages.map(s => s.name)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {selectedStages.map((stage, index) => (
                          <SortableStageItem
                            key={stage.name}
                            stage={stage}
                            index={index}
                            onRemove={removeStage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Adicionar coluna personalizada */}
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Adicionar coluna personalizada:</p>
                <div className="flex gap-2">
                  <Input
                    value={customStageName}
                    onChange={(e) => setCustomStageName(e.target.value)}
                    placeholder="Nome da coluna"
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomStage()}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: customStageColor }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="grid grid-cols-4 gap-1">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded-md border-2 transition-all"
                            style={{ 
                              backgroundColor: color,
                              borderColor: customStageColor === color ? 'white' : 'transparent'
                            }}
                            onClick={() => setCustomStageColor(color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8"
                    onClick={addCustomStage}
                    disabled={!customStageName.trim()}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewPipelineName('');
                  setNewPipelineDescription('');
                  setSelectedStages([]);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreatePipeline}
                disabled={!newPipelineName.trim()}
              >
                Criar Funil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
