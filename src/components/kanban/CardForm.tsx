import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Building2, DollarSign, User, Mail, Phone, ChevronRight, ChevronDown, Globe, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CSMStage } from '@/types/kanban';
import { createCardTasksForStage } from '@/hooks/useCardTasks';
import { normalizeText } from '@/utils/normalizeText';
interface CardFormProps {
  pipelineId: string;
  stageId: string;
  stages: CSMStage[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface CardFormData {
  description: string;
  value: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  instagram: string;
  stage_id: string;
  utm_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

export const CardForm: React.FC<CardFormProps> = ({
  pipelineId,
  stageId,
  stages,
  open,
  onClose,
  onRefresh
}) => {
  const [formData, setFormData] = useState<CardFormData>({
    description: '',
    value: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    instagram: '',
    stage_id: stageId,
    utm_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  });
  const [loading, setLoading] = useState(false);
  const [showUTM, setShowUTM] = useState(false);

  // Atualizar stage_id quando prop mudar
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, stage_id: stageId }));
  }, [stageId]);

  const handleInputChange = (field: keyof CardFormData, value: string) => {
    // Normaliza texto para remover "fontes decorativas" de redes sociais
    const normalizedValue = normalizeText(value);
    setFormData(prev => ({ ...prev, [field]: normalizedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.company_name.trim()) {
      toast('Nome da empresa é obrigatório');
      return;
    }
    
    if (!formData.value.trim()) {
      toast('Faturamento é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast('Você precisa estar logado para criar cards');
        return;
      }

      // Gerar título automaticamente: apenas Nome da empresa
      const title = formData.company_name.trim();

      // Contar cards existentes no estágio para definir posição
      const { count } = await supabase
        .from('csm_cards')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', formData.stage_id);

      const { data: newCard, error } = await supabase
        .from('csm_cards')
        .insert({
          pipeline_id: pipelineId,
          stage_id: formData.stage_id,
          title: title,
          description: formData.description.trim() || null,
          value: parseFloat(formData.value.replace(/[^\d]/g, '')) || 0,
          faturamento_display: formData.value.trim() || null,
          company_name: formData.company_name.trim() || null,
          contact_name: formData.contact_name.trim() || null,
          contact_email: formData.contact_email.trim() || null,
          contact_phone: formData.contact_phone.trim() || null,
          instagram: formData.instagram.trim() || null,
          position: count || 0,
          created_by: userData.user.id,
          utm_url: formData.utm_url.trim() || null,
          utm_source: formData.utm_source.trim() || null,
          utm_medium: formData.utm_medium.trim() || null,
          utm_campaign: formData.utm_campaign.trim() || null,
          utm_term: formData.utm_term.trim() || null,
          utm_content: formData.utm_content.trim() || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Criar tarefas automáticas para a etapa inicial
      if (newCard?.id) {
        await createCardTasksForStage(newCard.id, formData.stage_id);
      }

      // Reset form
      setFormData({
        description: '',
        value: '',
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        instagram: '',
        stage_id: stageId,
        utm_url: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      });

      toast('Card criado com sucesso!');
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
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Nome da empresa *
            </Label>
            <Input
              id="company"
              value={formData.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Nome da empresa"
              className="h-9"
            />
          </div>

          {/* Faturamento */}
          <div className="space-y-2">
            <Label htmlFor="value" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Faturamento (R$) *
            </Label>
            <Input
              id="value"
              type="text"
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
              placeholder="Ex: 5k, 10mil, 50000"
              className="h-9"
            />
          </div>

          {/* Estágio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estágio</Label>
            <Select
              value={formData.stage_id}
              onValueChange={(value) => handleInputChange('stage_id', value)}
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

          {/* Contato */}
          <div className="space-y-2">
            <Label htmlFor="contact-name" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Nome do Contato
            </Label>
            <Input
              id="contact-name"
              value={formData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              placeholder="Nome da pessoa de contato"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="email@exemplo.com"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Telefone
            </Label>
            <Input
              id="contact-phone"
              value={formData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2 text-sm font-medium">
              <Instagram className="h-4 w-4 text-pink-500" />
              Instagram
            </Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              placeholder="@usuario"
              className="h-9"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detalhes sobre a oportunidade..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Rastreamento UTM (Colapsável) */}
          <Collapsible open={showUTM} onOpenChange={setShowUTM}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between h-auto p-3 hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Rastreamento (UTM) - Opcional
                </span>
                {showUTM ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="utm_url" className="text-sm">URL de Origem</Label>
                <Input
                  id="utm_url"
                  value={formData.utm_url}
                  onChange={(e) => handleInputChange('utm_url', e.target.value)}
                  placeholder="https://exemplo.com"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_source" className="text-sm">Origem (Source)</Label>
                <Input
                  id="utm_source"
                  value={formData.utm_source}
                  onChange={(e) => handleInputChange('utm_source', e.target.value)}
                  placeholder="google, facebook, newsletter"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_medium" className="text-sm">Meio (Medium)</Label>
                <Input
                  id="utm_medium"
                  value={formData.utm_medium}
                  onChange={(e) => handleInputChange('utm_medium', e.target.value)}
                  placeholder="cpc, email, social"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_campaign" className="text-sm">Campanha (Campaign)</Label>
                <Input
                  id="utm_campaign"
                  value={formData.utm_campaign}
                  onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
                  placeholder="lancamento, black-friday"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_term" className="text-sm">Termo (Term)</Label>
                <Input
                  id="utm_term"
                  value={formData.utm_term}
                  onChange={(e) => handleInputChange('utm_term', e.target.value)}
                  placeholder="palavras-chave"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_content" className="text-sm">Conteúdo (Content)</Label>
                <Input
                  id="utm_content"
                  value={formData.utm_content}
                  onChange={(e) => handleInputChange('utm_content', e.target.value)}
                  placeholder="variacao-a, link-rodape"
                  className="h-9"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Criando...' : 'Criar Card'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};