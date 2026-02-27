import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DotLogo } from "@/components/DotLogo";
import { Card } from "@/components/ui/card";
import { findCSMCard, recordFormSubmissionInHistory } from "@/utils/findCSMCard";

export default function SolicitacaoCancelamento() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    contract_name: "",
    reason: "",
    observations: "",
  });
  const [isLoadingCardData, setIsLoadingCardData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar dados do card quando o e-mail for alterado
  useEffect(() => {
    const searchCardByEmail = async () => {
      if (!formData.client_email || !formData.client_email.includes('@')) return;

      setIsLoadingCardData(true);
      try {
        const emailToSearch = formData.client_email.trim().toLowerCase();
        
        // Buscar card pelo e-mail de contato principal
        const { data: cards, error } = await supabase
          .from('crm_cards')
          .select('contact_email, contact_name, company_name, title')
          .eq('contact_email', emailToSearch)
          .limit(1);

        if (error) throw error;

        if (cards && cards.length > 0) {
          const card = cards[0];
          setFormData(prev => ({
            ...prev,
            contract_name: card.company_name || card.title || prev.contract_name,
            client_name: card.contact_name || prev.client_name,
          }));

          toast({
            title: "Dados encontrados",
            description: "Os dados da empresa foram preenchidos automaticamente.",
          });
        } else {
          // Se não encontrou pelo contact_email, buscar na tabela de emails múltiplos
          const { data: cardsByEmail } = await supabase
            .from('crm_card_emails')
            .select('card_id, crm_cards!inner(company_name, title, contact_name)')
            .eq('email', emailToSearch)
            .limit(1);

          if (cardsByEmail && cardsByEmail.length > 0) {
            const cardData = cardsByEmail[0].crm_cards as any;
            setFormData(prev => ({
              ...prev,
              contract_name: cardData.company_name || cardData.title || prev.contract_name,
              client_name: cardData.contact_name || prev.client_name,
            }));

            toast({
              title: "Dados encontrados",
              description: "Os dados da empresa foram preenchidos automaticamente.",
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do card:', error);
      } finally {
        setIsLoadingCardData(false);
      }
    };

    const timeoutId = setTimeout(searchCardByEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.client_email]);

  const motivos = [
    "Corte de Custos",
    "Desalinhamento",
    "Internalização do Marketing",
    "Ausência de Resultados",
    "Não atingimos a meta",
    "Demora Operacional",
    "Baixa qualidade visual das peças de campanha",
    "Outro",
  ];

  const handleCopyLink = () => {
    const url = window.location.origin + "/solicitacao-cancelamento";
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado!",
        description: "O link do formulário foi copiado para a área de transferência.",
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir envio duplicado
    if (isSubmitting) return;
    
    if (!formData.client_name || !formData.client_email || !formData.contract_name || !formData.reason || !formData.observations.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Buscar card do CSM correspondente usando a função utilitária
      const csmCard = await findCSMCard(formData.client_email, formData.contract_name, formData.client_name);

      // Salvar solicitação no banco externo (usando colunas em português)
      const { error: insertError } = await supabase
        .from('cancellation_requests')
        .insert({
          responsavel: formData.client_name,
          email: formData.client_email.trim().toLowerCase(),
          empresa: formData.contract_name,
          motivo: formData.reason,
          observacoes: formData.observations,
          card_id: csmCard?.cardId || null,
          status: 'pendente',
          stage: 'nova'
        });

      if (insertError) throw insertError;

      // Se encontrou card do CSM, registrar no histórico
      if (csmCard) {
        await recordFormSubmissionInHistory(
          csmCard.cardId,
          csmCard.stageId,
          'Cancelamento',
          formData.client_name,
          formData.client_email
        );
        
        // Adicionar nota adicional com o motivo
        await supabase
          .from('crm_card_stage_history')
          .insert({
            card_id: csmCard.cardId,
            stage_id: csmCard.stageId,
            event_type: 'note',
            notes: `⚠️ Motivo do cancelamento: ${formData.reason}${formData.observations ? `\n\nObservações: ${formData.observations}` : ''}`,
          });
      }

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de cancelamento foi registrada. Entraremos em contato em breve.",
      });

      // Reset form
      setFormData({
        client_name: "",
        client_email: "",
        contract_name: "",
        reason: "",
        observations: "",
      });
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header com logo e título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <DotLogo size={80} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Solicitação de Cancelamento</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Sentimos muito por saber que chegamos nesse momento, mas a fins de formalização pedimos as seguintes informações para darmos continuidade no processo de cancelamento.
          </p>
          
        </div>

        {/* Formulário */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="contract_name">
                Nome da Empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract_name"
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">
                Responsável pelo preenchimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_email">
                Seu e-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo para a solicitação <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
                required
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivos.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">
                Observações <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="observations"
                placeholder="Por favor, descreva quais motivos levaram você a solicitar o cancelamento do projeto. Quanto mais detalhes, melhor poderemos entender sua situação."
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={4}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
