import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LossReason {
  id: string;
  name: string;
  description: string | null;
  position: number;
  is_active: boolean;
}

interface LossReasonsManagerProps {
  onClose: () => void;
}

export const LossReasonsManager: React.FC<LossReasonsManagerProps> = ({ onClose }) => {
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [newReasonName, setNewReasonName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('csm_loss_reasons')
        .select('*')
        .order('position');

      if (error) throw error;
      setReasons(data || []);
    } catch (error) {
      console.error('Erro ao buscar motivos de perda:', error);
      toast.error('Erro ao carregar motivos de perda');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReason = async () => {
    if (!newReasonName.trim()) {
      toast.error('Digite um nome para o motivo');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const maxPosition = reasons.length > 0 ? Math.max(...reasons.map(r => r.position)) + 1 : 0;

      const { error } = await supabase
        .from('csm_loss_reasons')
        .insert({
          name: newReasonName.trim(),
          position: maxPosition,
          created_by: user.user.id,
        });

      if (error) throw error;

      toast.success('Motivo de perda adicionado!');
      setNewReasonName('');
      fetchReasons();
    } catch (error) {
      console.error('Erro ao adicionar motivo:', error);
      toast.error('Erro ao adicionar motivo de perda');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReason = async (id: string, updates: Partial<LossReason>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('csm_loss_reasons')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Motivo atualizado!');
      setEditingId(null);
      fetchReasons();
    } catch (error) {
      console.error('Erro ao atualizar motivo:', error);
      toast.error('Erro ao atualizar motivo de perda');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReason = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este motivo de perda?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('csm_loss_reasons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Motivo excluído!');
      fetchReasons();
    } catch (error) {
      console.error('Erro ao excluir motivo:', error);
      toast.error('Erro ao excluir motivo de perda');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (reason: LossReason) => {
    setEditingId(reason.id);
    setEditingName(reason.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      handleUpdateReason(editingId, { name: editingName.trim() });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Motivos de Perda</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar novo motivo */}
        <div className="flex gap-2">
          <Input
            placeholder="Nome do novo motivo..."
            value={newReasonName}
            onChange={(e) => setNewReasonName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
            disabled={loading}
          />
          <Button onClick={handleAddReason} disabled={loading || !newReasonName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista de motivos */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum motivo de perda configurado
            </p>
          ) : (
            reasons.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                
                {editingId === reason.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={saveEditing}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      className="flex-1 text-sm cursor-pointer hover:text-primary"
                      onClick={() => startEditing(reason)}
                    >
                      {reason.name}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`active-${reason.id}`} className="text-xs text-muted-foreground">
                          Ativo
                        </Label>
                        <Switch
                          id={`active-${reason.id}`}
                          checked={reason.is_active}
                          onCheckedChange={(checked) => handleUpdateReason(reason.id, { is_active: checked })}
                          disabled={loading}
                        />
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteReason(reason.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Configure os motivos de perda que aparecerão quando um lead for marcado como perdido.
        </p>
      </CardContent>
    </Card>
  );
};