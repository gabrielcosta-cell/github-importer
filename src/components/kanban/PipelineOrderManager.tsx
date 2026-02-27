import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CSMPipeline } from '@/types/kanban';
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

interface PipelineOrderManagerProps {
  pipelines: CSMPipeline[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface SortablePipelineItemProps {
  pipeline: CSMPipeline;
  index: number;
}

const SortablePipelineItem: React.FC<SortablePipelineItemProps> = ({
  pipeline,
  index,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pipeline.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pipelineType = pipeline.name.includes('CSM') || 
    pipeline.name === 'Clientes ativos' || 
    pipeline.name === 'Clientes Perdidos' 
    ? '| CSM' 
    : '| CRM';

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-medium">{pipeline.name}</span>
            <span className="text-xs text-muted-foreground">{pipelineType}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Posição: {index + 1}
        </div>
      </div>
    </div>
  );
};

export const PipelineOrderManager: React.FC<PipelineOrderManagerProps> = ({
  pipelines,
  open,
  onClose,
  onRefresh
}) => {
  const [localPipelines, setLocalPipelines] = useState<CSMPipeline[]>(pipelines);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalPipelines(pipelines);
  }, [pipelines]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localPipelines.findIndex((p) => p.id === active.id);
    const newIndex = localPipelines.findIndex((p) => p.id === over.id);

    const newPipelines = arrayMove(localPipelines, oldIndex, newIndex);
    setLocalPipelines(newPipelines);

    // Atualizar posições no banco de dados
    setLoading(true);
    try {
      const updates = newPipelines.map((pipeline, index) => ({
        id: pipeline.id,
        position: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('csm_pipelines')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast('Ordem dos funis atualizada!');
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast('Erro ao atualizar ordem dos funis');
      setLocalPipelines(pipelines);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organizar Ordem dos Funis</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Arraste os funis para reorganizar a ordem em que aparecem no sistema.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localPipelines.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localPipelines.map((pipeline, index) => (
                  <SortablePipelineItem
                    key={pipeline.id}
                    pipeline={pipeline}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} disabled={loading}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
