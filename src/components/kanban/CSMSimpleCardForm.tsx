import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRMStage } from '@/types/kanban';

interface CSMSimpleCardFormProps {
  pipelineId: string;
  stageId: string;
  stages: CRMStage[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const CSMSimpleCardForm: React.FC<CSMSimpleCardFormProps> = ({
  pipelineId,
  stageId,
  stages,
  open,
  onClose,
  onRefresh
}) => {
  const [clientName, setClientName] = useState('');
  const [selectedStage, setSelectedStage] = useState(stageId);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setSelectedStage(stageId);
  }, [stageId]);

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast('Nome do cliente é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast('Você precisa estar logado para criar cards');
        return;
      }

      // Contar cards existentes no estágio para definir posição
      const { count } = await supabase
        .from('crm_cards')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', selectedStage);

      const { error } = await supabase
        .from('crm_cards')
        .insert({
          pipeline_id: pipelineId,
          stage_id: selectedStage,
          title: clientName.trim(),
          company_name: clientName.trim(),
          position: count || 0,
          created_by: userData.user.id,
        });

      if (error) throw error;

      setClientName('');
      toast('Cliente adicionado com sucesso!');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Erro ao criar card:', error);
      toast('Erro ao criar card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome do Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client-name" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Nome do cliente *
            </Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente"
              className="h-9"
              autoFocus
            />
          </div>

          {/* Estágio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Etapa</Label>
            <Select
              value={selectedStage}
              onValueChange={setSelectedStage}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
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

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
