import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LostReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, comentarios: string) => void;
  isCSMPipeline?: boolean;
}

// Motivos padrão para CSM (churn)
const MOTIVOS_CHURN = [
  '7 dias de arrependimento',
  'Cliente não aceitou ajuste no Fee',
  'Quebra de expectativa por parte do time operacional',
  'Falta de equipe comercial para atender os leads',
  'Cliente Inadimplente',
  'Cliente duplicado',
  'Demora no atendimento',
  'Atendimento Ruim',
  'ROI Negativo',
  'Internalizou o marketing',
  'Venda desalinhada',
  'Criativos Ruins',
  'Falta de Resultado',
  'Teste',
  'Churn Comercial',
];

interface LossReason {
  id: string;
  name: string;
}

export const LostReasonDialog: React.FC<LostReasonDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isCSMPipeline = false,
}) => {
  const [motivo, setMotivo] = useState<string>('');
  const [comentarios, setComentarios] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar motivos de perda do banco (apenas para CRM)
  useEffect(() => {
    if (open && !isCSMPipeline) {
      fetchLossReasons();
    }
  }, [open, isCSMPipeline]);

  const fetchLossReasons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('csm_loss_reasons')
        .select('id, name')
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      setLossReasons(data || []);
    } catch (error) {
      console.error('Erro ao buscar motivos de perda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    // Validações
    if (!motivo) {
      setError(`Selecione um motivo ${isCSMPipeline ? 'do churn' : 'da perda'}`);
      return;
    }

    // Comentário obrigatório apenas para CSM
    if (isCSMPipeline && comentarios.trim().length < 5) {
      setError('O comentário deve ter no mínimo 5 caracteres');
      return;
    }

    setError('');
    onConfirm(motivo, comentarios);
  };

  const handleClose = () => {
    setMotivo('');
    setComentarios('');
    setError('');
    onClose();
  };

  // Motivos a exibir: do banco para CRM, fixos para CSM
  const motivosDisponiveis = isCSMPipeline 
    ? MOTIVOS_CHURN.map(m => ({ id: m, name: m }))
    : lossReasons;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCSMPipeline ? 'Motivo do Churn' : 'Motivo da Perda'}</DialogTitle>
          <DialogDescription>
            {isCSMPipeline 
              ? 'Informe o motivo do churn e adicione comentários para ajudar na análise.'
              : 'Selecione o motivo da perda do lead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motivo da perda/churn */}
          <div className="space-y-2">
            <Label htmlFor="motivo_perda">
              Motivo {isCSMPipeline ? 'do churn' : 'da perda'} <span className="text-destructive">*</span>
            </Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando motivos...
              </div>
            ) : (
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger id="motivo_perda">
                  <SelectValue placeholder="Escolha um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosDisponiveis.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Comentários - obrigatório apenas para CSM */}
          <div className="space-y-2">
            <Label htmlFor="comentarios">
              Comentários {isCSMPipeline && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="comentarios"
              placeholder={`Descreva os detalhes ${isCSMPipeline ? 'do churn' : 'da perda'} (opcional)...`}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            {isCSMPipeline && (
              <p className="text-xs text-muted-foreground">
                Mínimo de 5 caracteres ({comentarios.trim().length}/5)
              </p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <Alert className="border-primary/50 bg-primary/5">
            <GraduationCap className="h-4 w-4" />
            <AlertDescription>
              Informar um motivo {isCSMPipeline ? 'do churn' : 'de perda'} pode ajudar você identificar e
              compreender melhor certas tendências ou circunstâncias ao analisar
              o seu histórico de negócios.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {isCSMPipeline ? 'Confirmar Churn' : 'Marcar como perdido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};