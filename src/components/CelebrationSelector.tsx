import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CelebrationTemplate {
  id: string;
  title: string;
  audio_url: string;
  is_active: boolean;
}

interface CelebrationSelectorProps {
  currentCelebrationId?: string | null;
  onCelebrationChange?: (celebrationId: string | null) => void;
}

const CelebrationSelector: React.FC<CelebrationSelectorProps> = ({
  currentCelebrationId,
  onCelebrationChange
}) => {
  const [templates, setTemplates] = useState<CelebrationTemplate[]>([]);
  const [selectedCelebration, setSelectedCelebration] = useState<string>('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (currentCelebrationId) {
      setSelectedCelebration(currentCelebrationId);
    }
  }, [currentCelebrationId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('celebration_templates')
        .select('id, title, audio_url, is_active')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading celebration templates:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar comemorações disponíveis",
        variant: "destructive",
      });
    }
  };

  const playAudio = (audioUrl: string, templateId: string) => {
    if (playingAudio === templateId) {
      // Pausar áudio atual
      setPlayingAudio(null);
      return;
    }

    const audio = new Audio(audioUrl);
    setPlayingAudio(templateId);
    
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      setPlayingAudio(null);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio",
        variant: "destructive",
      });
    };
    
    audio.play().catch(() => {
      setPlayingAudio(null);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio",
        variant: "destructive",
      });
    });
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const celebrationId = selectedCelebration || null;

      const { error } = await supabase
        .from('profiles')
        .update({ selected_celebration_id: celebrationId })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: selectedCelebration 
          ? "Comemoração selecionada com sucesso!" 
          : "Comemoração removida com sucesso!",
      });

      // Recarregar perfil do usuário para atualizar selected_celebration_id
      await refreshProfile();

      onCelebrationChange?.(celebrationId);

    } catch (error) {
      console.error('Error saving celebration selection:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar seleção de comemoração",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCelebrationChange = (value: string) => {
    setSelectedCelebration(value === 'none' ? '' : value);
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Áudio de Comemoração</CardTitle>
          <p className="text-sm text-muted-foreground">
            Escolha um áudio que será reproduzido quando você fizer uma venda
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma comemoração disponível no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = selectedCelebration !== (currentCelebrationId || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Áudio de Comemoração</CardTitle>
        <p className="text-sm text-muted-foreground">
          Escolha um áudio que será reproduzido quando você fizer uma venda
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedCelebration || 'none'}
          onValueChange={handleCelebrationChange}
        >
          {/* Opção "Nenhuma comemoração" */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none" className="flex-1 cursor-pointer">
              <div>
                <h4 className="font-medium">Nenhuma comemoração</h4>
                <p className="text-sm text-muted-foreground">
                  Não reproduzir áudio ao fazer vendas
                </p>
              </div>
            </Label>
          </div>

          {/* Opções de comemoração disponíveis */}
          {templates.map((template) => (
            <div key={template.id} className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value={template.id} id={template.id} />
              <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Clique no botão de play para ouvir
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedCelebration === template.id && (
                      <Badge variant="default" className="mr-2">
                        <Check className="h-3 w-3 mr-1" />
                        Selecionada
                      </Badge>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        playAudio(template.audio_url, template.id);
                      }}
                    >
                      {playingAudio === template.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? 'Salvando...' : 'Salvar Seleção'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CelebrationSelector;