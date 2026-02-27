import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, X, Check, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  module_scope: 'crm' | 'csm' | 'both';
  position?: number;
}

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  moduleType?: 'crm' | 'csm';
}

export const TagManager: React.FC<TagManagerProps> = ({ open, onClose, onUpdate, moduleType = 'crm' }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editScope, setEditScope] = useState<'crm' | 'csm' | 'both'>('both');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [newTagScope, setNewTagScope] = useState<'crm' | 'csm' | 'both'>(moduleType);

  const colorPresets = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('is_active', true)
        .or(`module_scope.eq.${moduleType},module_scope.eq.both`)
        .order('position', { ascending: true });

      if (error) throw error;
      const tagsWithPosition = (data || []).map((tag) => ({
        ...tag,
        module_scope: tag.module_scope as 'crm' | 'csm' | 'both',
      }));
      setTags(tagsWithPosition);
    } catch (error: any) {
      console.error('Erro ao buscar etiquetas:', error);
      toast.error('Erro ao carregar etiquetas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Digite um nome para a etiqueta');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('crm_tags')
        .insert({
          name: newTagName.trim().toUpperCase(),
          color: newTagColor,
          is_system: false,
          module_scope: newTagScope,
          created_by: userData.user.id,
        });

      if (error) throw error;

      toast.success('Etiqueta criada com sucesso!');
      setNewTagName('');
      setNewTagColor('#6366f1');
      setNewTagScope(moduleType);
      fetchTags();
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao criar etiqueta:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma etiqueta com este nome');
      } else if (error.message === 'Usuário não autenticado') {
        toast.error('Você precisa estar logado para criar etiquetas');
      } else {
        toast.error('Erro ao criar etiqueta');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    if (!editName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_tags')
        .update({
          name: editName.trim().toUpperCase(),
          color: editColor,
          module_scope: editScope,
        })
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Etiqueta atualizada!');
      setEditingTagId(null);
      fetchTags();
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast.error('Erro ao atualizar etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etiqueta? Ela será removida de todos os cards.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_tags')
        .update({ is_active: false })
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Etiqueta excluída com sucesso!');
      fetchTags();
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao excluir etiqueta:', error);
      toast.error('Erro ao excluir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditScope(tag.module_scope);
  };

  const cancelEdit = () => {
    setEditingTagId(null);
    setEditName('');
    setEditColor('#6366f1');
    setEditScope('both');
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTags((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save new positions to database
        saveTagPositions(newOrder);
        
        return newOrder;
      });
    }
  };

  const saveTagPositions = async (reorderedTags: Tag[]) => {
    try {
      // Update positions in batch
      const updates = reorderedTags.map((tag, index) => ({
        id: tag.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('crm_tags')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      toast.success('Ordem das etiquetas salva!');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao salvar ordem das etiquetas:', error);
      toast.error('Erro ao salvar ordem das etiquetas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Etiquetas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário de criação */}
          <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
            <h3 className="text-sm font-semibold">Nova Etiqueta</h3>
            
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da etiqueta"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newTagColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>

            {moduleType !== 'crm' && (
              <div className="space-y-2">
                <Label htmlFor="tag-scope">Disponível em</Label>
                <Select value={newTagScope} onValueChange={(value: 'crm' | 'csm' | 'both') => setNewTagScope(value)}>
                  <SelectTrigger id="tag-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Ambos (CRM e CSM)</SelectItem>
                    <SelectItem value="crm">Apenas CRM</SelectItem>
                    <SelectItem value="csm">Apenas CSM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleCreateTag} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Etiqueta
            </Button>
          </div>

          {/* Lista de etiquetas */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Etiquetas</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <SortableTagItem
                      key={tag.id}
                      tag={tag}
                      editingTagId={editingTagId}
                      editName={editName}
                      editColor={editColor}
                      editScope={editScope}
                      colorPresets={colorPresets}
                      loading={loading}
                      onEditName={setEditName}
                      onEditColor={setEditColor}
                      onEditScope={setEditScope}
                      onStartEdit={startEdit}
                      onCancelEdit={cancelEdit}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={tag.is_system ? undefined : handleDeleteTag}
                      showDelete={!tag.is_system}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SortableTagItemProps {
  tag: Tag;
  editingTagId: string | null;
  editName: string;
  editColor: string;
  editScope: 'crm' | 'csm' | 'both';
  colorPresets: string[];
  loading: boolean;
  onEditName: (name: string) => void;
  onEditColor: (color: string) => void;
  onEditScope: (scope: 'crm' | 'csm' | 'both') => void;
  onStartEdit: (tag: Tag) => void;
  onCancelEdit: () => void;
  onUpdateTag: (tagId: string) => void;
  onDeleteTag?: (tagId: string) => void;
  showDelete: boolean;
}

const SortableTagItem: React.FC<SortableTagItemProps> = ({
  tag,
  editingTagId,
  editName,
  editColor,
  editScope,
  colorPresets,
  loading,
  onEditName,
  onEditColor,
  onEditScope,
  onStartEdit,
  onCancelEdit,
  onUpdateTag,
  onDeleteTag,
  showDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg border bg-background"
    >
      {editingTagId === tag.id ? (
        <>
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              className="h-8 text-sm"
              placeholder="Nome"
              maxLength={50}
            />
            <div className="flex gap-1">
              {colorPresets.slice(0, 8).map((color) => (
                <button
                  key={color}
                  onClick={() => onEditColor(color)}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    editColor === color ? 'border-foreground ring-2 ring-foreground/20' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Select value={editScope} onValueChange={(value: 'crm' | 'csm' | 'both') => onEditScope(value)}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Ambos</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="csm">CSM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateTag(tag.id)}
              disabled={loading}
              className="h-8 w-8 p-0 text-green-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                backgroundColor: `${tag.color}10`,
                borderColor: `${tag.color}50`,
                color: tag.color,
              }}
            >
              {tag.name}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {tag.module_scope === 'both' ? 'CRM & CSM' : tag.module_scope.toUpperCase()}
            </Badge>
          </div>
          <div className="flex gap-1 items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEdit(tag)}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <button
              className="h-8 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent rounded"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {showDelete && onDeleteTag && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteTag(tag.id)}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
