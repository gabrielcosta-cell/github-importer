import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CelebrationTemplate {
  id: string;
  title: string;
  audio_url: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

const CelebrationManagement: React.FC = () => {
  const [templates, setTemplates] = useState<CelebrationTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CelebrationTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSelectCelebration = async (celebrationId: string) => {
    if (!profile) return;

    try {
      const newCelebrationId = profile.selected_celebration_id === celebrationId ? null : celebrationId;
      
      const { error } = await supabase
        .from('profiles')
        .update({ selected_celebration_id: newCelebrationId })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: newCelebrationId 
          ? "Comemoração selecionada como ativa!" 
          : "Comemoração desativada!",
      });

      // Atualizar o profile localmente
      profile.selected_celebration_id = newCelebrationId;

    } catch (error) {
      console.error('Error selecting celebration:', error);
      toast({
        title: "Erro",
        description: "Falha ao selecionar comemoração",
        variant: "destructive",
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('celebration_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading celebration templates:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar templates de comemoração",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo de áudio",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (30 segundos aproximadamente = 1MB para MP3)
    if (file.size > 2 * 1024 * 1024) { // 2MB máximo
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 30 segundos",
        variant: "destructive",
      });
      return;
    }

    setAudioFile(file);
  };

  const uploadAudio = async (): Promise<string | null> => {
    if (!audioFile) return null;

    const fileExt = audioFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `celebrations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('celebration-audio')
      .upload(filePath, audioFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('celebration-audio')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira um título para a comemoração",
        variant: "destructive",
      });
      return;
    }

    if (!editingTemplate && !audioFile) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um arquivo de áudio",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let audioUrl = editingTemplate?.audio_url;

      // Upload novo áudio se fornecido
      if (audioFile) {
        audioUrl = await uploadAudio();
        if (!audioUrl) throw new Error('Falha no upload do áudio');
      }

      if (editingTemplate) {
        // Atualizar template existente
        const { error } = await supabase
          .from('celebration_templates')
          .update({
            title: title.trim(),
            ...(audioUrl && { audio_url: audioUrl }),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Comemoração atualizada com sucesso!",
        });
      } else {
        // Criar novo template
        const { error } = await supabase
          .from('celebration_templates')
          .insert({
            title: title.trim(),
            audio_url: audioUrl!,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Nova comemoração criada com sucesso!",
        });
      }

      // Reset form
      setTitle('');
      setAudioFile(null);
      setEditingTemplate(null);
      setIsDialogOpen(false);
      loadTemplates();

    } catch (error) {
      console.error('Error saving celebration template:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar comemoração",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (template: CelebrationTemplate) => {
    setEditingTemplate(template);
    setTitle(template.title);
    setAudioFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('celebration_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Comemoração removida com sucesso!",
      });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting celebration template:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover comemoração",
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

  const openDialog = () => {
    setEditingTemplate(null);
    setTitle('');
    setAudioFile(null);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Comemorações</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione e gerencie os áudios de comemoração disponíveis para os usuários
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Comemoração
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Comemoração' : 'Nova Comemoração'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título da Comemoração</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sucesso da Venda"
                />
              </div>

              <div>
                <Label htmlFor="audio">Arquivo de Áudio (MP3, máx. 30 seg)</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                />
                {audioFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Arquivo selecionado: {audioFile.name} ({(audioFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma comemoração cadastrada ainda
            </p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => playAudio(template.audio_url, template.id)}
                  >
                    {playingAudio === template.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div>
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {profile?.selected_celebration_id === template.id ? (
                      <Badge 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700 cursor-pointer"
                        onClick={() => handleSelectCelebration(template.id)}
                      >
                        Ativa
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectCelebration(template.id)}
                      >
                        Disponível
                      </Badge>
                    )}
                    
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Sistema" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a comemoração "{template.title}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CelebrationManagement;