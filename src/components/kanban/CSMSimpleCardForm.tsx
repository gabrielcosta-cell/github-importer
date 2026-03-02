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
  DialogDescription,
} from '@/components/ui/dialog';
import { Building2, DollarSign, Tag, Users, Package, Flag, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CSMStage } from '@/types/kanban';
import { MRRInput } from '@/components/kanban/MRRInput';

interface CSMSimpleCardFormProps {
  pipelineId: string;
  stageId: string;
  stages: CSMStage[];
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
  const [mrr, setMrr] = useState<number | null>(null);
  const [categoria, setCategoria] = useState('');
  const [squad, setSquad] = useState('none');
  const [plano, setPlano] = useState('none');
  const [flag, setFlag] = useState('none');
  const [selectedStage, setSelectedStage] = useState(stageId);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setSelectedStage(stageId);
  }, [stageId]);

  const resetForm = () => {
    setClientName('');
    setMrr(null);
    setCategoria('');
    setSquad('none');
    setPlano('none');
    setFlag('none');
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    if (mrr === null || mrr <= 0) {
      toast.error('MRR é obrigatório');
      return;
    }
    if (!categoria) {
      toast.error('Categoria de MRR é obrigatória');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast.error('Você precisa estar logado para criar cards');
        return;
      }

      const { count } = await supabase
        .from('csm_cards')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', selectedStage);

      const { error } = await supabase
        .from('csm_cards')
        .insert({
          pipeline_id: pipelineId,
          stage_id: selectedStage,
          title: clientName.trim(),
          company_name: clientName.trim(),
          monthly_revenue: mrr,
          categoria,
          squad: squad === 'none' ? null : squad,
          plano: plano === 'none' ? null : plano,
          position: count || 0,
          created_by: userData.user.id,
        });

      if (error) throw error;

      // Salvar flag separadamente se selecionada
      if (flag !== 'none') {
        const { data: insertedCards } = await supabase
          .from('csm_cards')
          .select('id')
          .eq('pipeline_id', pipelineId)
          .eq('title', clientName.trim())
          .eq('created_by', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (insertedCards?.[0]) {
          await supabase
            .from('csm_cards')
            .update({ flag } as any)
            .eq('id', insertedCards[0].id);
        }
      }

      resetForm();
      toast.success('Cliente adicionado com sucesso!');
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Erro ao criar card:', error);
      toast.error('Erro ao criar card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Cliente</DialogTitle>
          <DialogDescription>Preencha as informações do novo cliente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome da Empresa */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Nome da empresa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome da empresa"
              className="h-9"
              autoFocus
            />
          </div>

          {/* MRR e Categoria - lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                MRR <span className="text-destructive">*</span>
              </Label>
              <MRRInput
                value={mrr}
                onChange={setMrr}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Categoria de MRR <span className="text-destructive">*</span>
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MRR Vendido">MRR Vendido</SelectItem>
                  <SelectItem value="MRR Recorrente">MRR Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Squad e Plano - lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Squad
              </Label>
              <Select value={squad} onValueChange={setSquad}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="Apollo">Apollo</SelectItem>
                  <SelectItem value="Ares">Ares</SelectItem>
                  <SelectItem value="Artemis">Artemis</SelectItem>
                  <SelectItem value="Athena">Athena</SelectItem>
                  <SelectItem value="Atlas">Atlas</SelectItem>
                  <SelectItem value="Aurora">Aurora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                Plano
              </Label>
              <Select value={plano} onValueChange={setPlano}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Conceito">Conceito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flag e Etapa - lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Flag className="h-4 w-4 text-muted-foreground" />
                Flag
              </Label>
              <Select value={flag} onValueChange={setFlag}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="verde">🟢 Verde</SelectItem>
                  <SelectItem value="amarela">🟡 Amarela</SelectItem>
                  <SelectItem value="vermelha">🔴 Vermelha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Fase do projeto
              </Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
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
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
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
