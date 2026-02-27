import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LinkCardDialogProps {
  open: boolean;
  onClose: () => void;
  onCardLinked: (cardId: string) => void;
  cancellationRequestId: string;
  empresaName: string;
}

interface CSMCard {
  id: string;
  title: string;
  company_name: string | null;
  squad: string | null;
  monthly_revenue: number | null;
  plano: string | null;
}

export const LinkCardDialog: React.FC<LinkCardDialogProps> = ({
  open,
  onClose,
  onCardLinked,
  cancellationRequestId,
  empresaName
}) => {
  const [searchTerm, setSearchTerm] = useState(empresaName);
  const [cards, setCards] = useState<CSMCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open && empresaName) {
      handleSearch();
    }
  }, [open, empresaName]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo para buscar');
      return;
    }

    try {
      setSearching(true);
      
      // Primeiro, buscar pipelines que são de CSM/Clientes (excluindo pipelines de teste/comercial)
      const { data: pipelines, error: pipelinesError } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .or('name.ilike.%cliente%,name.ilike.%csm%,name.ilike.%customer%')
        .not('name', 'ilike', '%comercial%')
        .not('name', 'ilike', '%vendas%')
        .not('name', 'ilike', '%lead%');

      if (pipelinesError) throw pipelinesError;

      if (!pipelines || pipelines.length === 0) {
        toast.info('Nenhum pipeline de CSM encontrado');
        setCards([]);
        return;
      }

      const pipelineIds = pipelines.map(p => p.id);

      // Buscar cards apenas dos pipelines de CSM identificados
      const { data, error } = await supabase
        .from('csm_cards')
        .select('id, title, company_name, squad, monthly_revenue, plano, pipeline_id')
        .in('pipeline_id', pipelineIds)
        .or(`title.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .order('title')
        .limit(20);

      if (error) throw error;
      setCards(data || []);

      if (data && data.length === 0) {
        toast.info('Nenhum card encontrado nos pipelines de CSM');
      }
    } catch (error) {
      console.error('Erro ao buscar cards:', error);
      toast.error('Erro ao buscar cards do CSM');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedCard) {
      toast.error('Selecione um card do CSM');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar o nome da empresa do card selecionado
      const selectedCardData = cards.find(card => card.id === selectedCard);
      const companyName = selectedCardData?.company_name || selectedCardData?.title || null;
      
      // Usar 'empresa' em vez de 'contract_name' (nome correto da coluna no banco externo)
      const { error } = await supabase
        .from('cancellation_requests')
        .update({ 
          card_id: selectedCard,
          empresa: companyName
        })
        .eq('id', cancellationRequestId);

      if (error) throw error;

      toast.success('Card vinculado com sucesso');
      onCardLinked(selectedCard);
      onClose();
    } catch (error) {
      console.error('Erro ao vincular card:', error);
      toast.error('Erro ao vincular card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Vincular Card do CSM
          </DialogTitle>
          <DialogDescription>
            Para mover o card para etapa de TRIAGEM é necessário vincular este card a um card do CSM.
            Busque e selecione o card correspondente ao cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Card do CSM</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Nome da empresa ou card..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                variant="secondary"
              >
                <Search className="w-4 h-4 mr-2" />
                {searching ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>

          {cards.length > 0 && (
            <div className="space-y-2">
              <Label>Selecione o Card</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedCard === card.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{card.title}</h4>
                        {card.company_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {card.company_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {card.squad && (
                            <Badge variant="outline" className="text-xs">
                              {card.squad}
                            </Badge>
                          )}
                          {card.plano && (
                            <Badge variant="secondary" className="text-xs">
                              {card.plano}
                            </Badge>
                          )}
                          {card.monthly_revenue && (
                            <Badge variant="default" className="text-xs">
                              R$ {card.monthly_revenue.toLocaleString('pt-BR')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedCard || loading}
          >
            {loading ? 'Vinculando...' : 'Vincular e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
