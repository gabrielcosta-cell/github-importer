import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadOrderConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface LeadOrderSettings {
  untaggedFirst: boolean;
  priorityOrder: string[];
}

const DEFAULT_PRIORITY_ORDER = [
  'qualificado serviço',
  'pré-qualificado',
  'qualificação média',
  'qualificação indefinida',
  'etiquetas vermelhas',
  'etiquetas amarelas',
  'demais etiquetas',
];

export const LeadOrderConfig: React.FC<LeadOrderConfigProps> = ({
  open,
  onOpenChange
}) => {
  const [untaggedFirst, setUntaggedFirst] = useState(true);
  const [priorityOrder, setPriorityOrder] = useState<string[]>(DEFAULT_PRIORITY_ORDER);
  const [loading, setLoading] = useState(false);

  // Load settings from system_settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'csm_lead_order_settings')
          .maybeSingle();

        if (!error && data?.setting_value) {
          const settings: LeadOrderSettings = JSON.parse(data.setting_value);
          setUntaggedFirst(settings.untaggedFirst ?? true);
          setPriorityOrder(settings.priorityOrder ?? DEFAULT_PRIORITY_ORDER);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de ordem:', error);
      }
    };

    if (open) {
      loadSettings();
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const settings: LeadOrderSettings = {
        untaggedFirst,
        priorityOrder
      };

      // Try to update, if no rows affected, insert
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'csm_lead_order_settings')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            setting_value: JSON.stringify(settings),
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'csm_lead_order_settings');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'csm_lead_order_settings',
            setting_value: JSON.stringify(settings)
          });

        if (error) throw error;
      }

      toast.success('Configurações de ordem salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...priorityOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setPriorityOrder(newOrder);
  };

  const getDisplayName = (item: string) => {
    switch (item) {
      case 'qualificado serviço': return 'Qualificado serviço';
      case 'pré-qualificado': return 'Pré-qualificado';
      case 'qualificação média': return 'Qualificação média';
      case 'qualificação indefinida': return 'Qualificação indefinida';
      case 'etiquetas vermelhas': return 'Etiquetas vermelhas';
      case 'etiquetas amarelas': return 'Etiquetas amarelas';
      case 'demais etiquetas': return 'Demais etiquetas (ordem alfabética)';
      default: return item;
    }
  };

  const getItemColor = (item: string) => {
    switch (item) {
      case 'qualificado serviço': return 'bg-emerald-500/20 border-emerald-500/50';
      case 'pré-qualificado': return 'bg-blue-500/20 border-blue-500/50';
      case 'qualificação média': return 'bg-purple-500/20 border-purple-500/50';
      case 'qualificação indefinida': return 'bg-gray-500/20 border-gray-500/50';
      case 'etiquetas vermelhas': return 'bg-red-500/20 border-red-500/50';
      case 'etiquetas amarelas': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'demais etiquetas': return 'bg-slate-500/20 border-slate-500/50';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ordem dos Leads</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Toggle for untagged leads */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Leads sem etiqueta no topo</Label>
              <p className="text-xs text-muted-foreground">
                Leads novos sem etiquetas aparecem primeiro, ordenados por data de criação
              </p>
            </div>
            <Switch
              checked={untaggedFirst}
              onCheckedChange={setUntaggedFirst}
            />
          </div>

          {/* Priority order */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ordem de prioridade das etiquetas</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Arraste para reordenar a prioridade dos leads por tipo de etiqueta
            </p>
            
            <div className="space-y-2">
              {priorityOrder.map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${getItemColor(item)}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex-1 text-sm font-medium">{getDisplayName(item)}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === priorityOrder.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to get lead order settings
export const useLeadOrderSettings = () => {
  const [settings, setSettings] = useState<LeadOrderSettings>({
    untaggedFirst: true,
    priorityOrder: DEFAULT_PRIORITY_ORDER
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'csm_lead_order_settings')
          .maybeSingle();

        if (!error && data?.setting_value) {
          setSettings(JSON.parse(data.setting_value));
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de ordem:', error);
      }
    };

    loadSettings();
  }, []);

  return settings;
};
