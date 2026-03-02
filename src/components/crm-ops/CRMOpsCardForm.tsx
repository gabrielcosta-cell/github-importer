import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, User, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CSMStage } from '@/types/kanban';

interface CRMOpsCardFormProps {
  pipelineId: string;
  stageId: string;
  stages: CSMStage[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const CRMOpsCardForm: React.FC<CRMOpsCardFormProps> = ({
  pipelineId,
  stageId,
  stages,
  open,
  onClose,
  onRefresh,
}) => {
  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [faturamentoDisplay, setFaturamentoDisplay] = useState('');
  const [selectedStage, setSelectedStage] = useState(stageId);
  const [loading, setLoading] = useState(false);

  const faturamentoOptions = [
    { value: 'ate_r$50k', label: 'Até R$ 50k' },
    { value: 'de_r$50k_a_r$100k', label: 'R$ 50k - R$ 100k' },
    { value: 'de_r$101k_a_r$400k', label: 'R$ 101k - R$ 400k' },
    { value: 'de_r$401k_a_r$1mm', label: 'R$ 401k - R$ 1MM' },
    { value: 'R$1MM+', label: 'R$ 1MM+' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: card, error } = await supabase
        .from('csm_cards')
        .insert({
          title: title.trim(),
          company_name: title.trim(),
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          faturamento_display: faturamentoDisplay || null,
          pipeline_id: pipelineId,
          stage_id: selectedStage,
          position: 0,
          value: 0,
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create stage history
      if (card) {
        await supabase.from('csm_card_stage_history').insert({
          card_id: card.id,
          stage_id: selectedStage,
          entered_at: new Date().toISOString(),
          moved_by: userData.user.id,
        });
      }

      toast.success('Lead adicionado com sucesso!');
      onRefresh();
      onClose();
      // Reset
      setTitle('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setFaturamentoDisplay('');
      setSelectedStage(stageId);
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      toast.error('Erro ao criar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Adicionar Lead
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo lead para o CRM Ops.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da empresa *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da empresa"
              autoFocus
            />
          </div>

          <div>
            <Label>Nome do contato</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do contato"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@empresa.com"
                type="email"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <Label>Faturamento</Label>
            <Select value={faturamentoDisplay} onValueChange={setFaturamentoDisplay}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a faixa" />
              </SelectTrigger>
              <SelectContent>
                {faturamentoOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Etapa</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Salvando...' : 'Adicionar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
