import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Music, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';

interface AudioUploadProps {
  onAudioUploaded?: (audioUrl: string) => void;
  currentAudioUrl?: string;
}

export const AudioUpload = ({ onAudioUploaded, currentAudioUrl }: AudioUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string>('');

  useEffect(() => {
    loadSavedAudio();
  }, []);

  useEffect(() => {
    if (currentAudioUrl !== savedAudioUrl) {
      setSavedAudioUrl(currentAudioUrl || '');
    }
  }, [currentAudioUrl]);

  const loadSavedAudio = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'celebration_audio_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setSavedAudioUrl(data.setting_value);
        onAudioUploaded?.(data.setting_value);
      }
    } catch (error: any) {
      console.error('Erro ao carregar áudio salvo:', error);
    }
  };

  const saveAudioUrl = async (url: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'celebration_audio_url',
          setting_value: url,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Erro ao salvar URL do áudio:', error);
      throw error;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo de áudio
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor, selecione um arquivo de áudio válido (MP3, WAV, etc.)');
        return;
      }
      
      // Verificar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo permitido: 10MB');
        return;
      }
      
      setAudioFile(file);
    }
  };

  const uploadAudio = async () => {
    if (!audioFile) return;

    setUploading(true);
    try {
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `celebration-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data, error } = await supabase.storage
        .from('celebration-audio')
        .upload(filePath, audioFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL público do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('celebration-audio')
        .getPublicUrl(data.path);

      await saveAudioUrl(publicUrl);
      setSavedAudioUrl(publicUrl);
      onAudioUploaded?.(publicUrl);
      toast.success('Áudio carregado com sucesso!');
      setAudioFile(null);
      
      // Limpar o input
      const input = document.getElementById('audio-upload') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do áudio: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAudio = async () => {
    if (!savedAudioUrl) return;

    try {
      // Extrair o caminho do arquivo da URL
      const url = new URL(savedAudioUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      const { error } = await supabase.storage
        .from('celebration-audio')
        .remove([fileName]);

      if (error) {
        throw error;
      }

      await saveAudioUrl('');
      setSavedAudioUrl('');
      onAudioUploaded?.('');
      toast.success('Áudio removido com sucesso!');
      
    } catch (error: any) {
      console.error('Erro ao remover áudio:', error);
      toast.error('Erro ao remover áudio: ' + error.message);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Áudio de Celebração
        </CardTitle>
        <CardDescription>
          Faça upload do arquivo MP3 para tocar quando um negócio for fechado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedAudioUrl && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <span className="text-sm">Áudio configurado</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAudio}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <audio controls className="w-full mt-2" src={savedAudioUrl}>
              Seu navegador não suporta áudio HTML5.
            </audio>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="audio-upload">Selecionar arquivo de áudio</Label>
          <Input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {audioFile && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              <span className="text-sm">{audioFile.name}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tamanho: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        <Button 
          onClick={uploadAudio} 
          disabled={!audioFile || uploading}
          className="w-full"
        >
          {uploading ? (
            'Carregando...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Formatos suportados: MP3, WAV, OGG. Tamanho máximo: 10MB
        </p>
      </CardContent>
    </Card>
  );
};