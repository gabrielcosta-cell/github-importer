import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Download, 
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/external-client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface UploadProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface AttachmentsManagerProps {
  cardId: string;
}

export const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ cardId }) => {
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const queryClient = useQueryClient();

  // Buscar anexos
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['card-attachments', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    }
  });

  // Upload de arquivo
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const filesArray = Array.from(files);
    
    // Inicializar progresso para todos os arquivos
    const initialProgress: UploadProgress[] = filesArray.map(file => ({
      name: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(initialProgress);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Você precisa estar logado');
        setUploadProgress([]);
        return;
      }

      // Upload de cada arquivo com rastreamento de progresso
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        
        try {
          // Simular progresso inicial
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 10 } : p
          ));

          // Upload do arquivo para o Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${cardId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          // Progresso de upload
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 40 } : p
          ));

          const { error: uploadError } = await supabase.storage
            .from('crm-card-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Progresso do banco de dados
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 70 } : p
          ));

          // Salvar metadados no banco
          const { error: dbError } = await supabase
            .from('crm_card_attachments')
            .insert({
              card_id: cardId,
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              file_type: file.type || 'application/octet-stream',
              uploaded_by: userData.user.id
            });

          if (dbError) throw dbError;

          // Sucesso
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 100, status: 'success' } : p
          ));
        } catch (fileError) {
          console.error(`Erro ao fazer upload de ${file.name}:`, fileError);
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { 
              ...p, 
              status: 'error', 
              error: fileError instanceof Error ? fileError.message : 'Erro desconhecido' 
            } : p
          ));
        }
      }

      // Verificar se todos os uploads foram bem-sucedidos
      const hasErrors = uploadProgress.some(p => p.status === 'error');
      if (!hasErrors) {
        toast.success('Arquivo(s) enviado(s) com sucesso!');
      } else {
        toast.error('Alguns arquivos falharam no upload');
      }
      
      queryClient.invalidateQueries({ queryKey: ['card-attachments', cardId] });
      
      // Limpar progresso após 3 segundos
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do arquivo');
      setUploadProgress([]);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
      event.target.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  // Deletar anexo
  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Deletar do Storage
      const { error: storageError } = await supabase.storage
        .from('crm-card-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Deletar metadados
      const { error: dbError } = await supabase
        .from('crm_card_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Arquivo deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['card-attachments', cardId] });
    },
    onError: (error) => {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar arquivo');
    }
  });

  // Download de arquivo
  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('crm-card-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do arquivo');
    }
  };

  // Preview de arquivo
  const handlePreview = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('crm-card-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewFile({ url, name: attachment.file_name, type: attachment.file_type });
    } catch (error) {
      console.error('Erro ao fazer preview:', error);
      toast.error('Erro ao visualizar arquivo');
    }
  };

  // Ícone baseado no tipo de arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Área de upload com drag & drop */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className={`h-8 w-8 transition-colors ${
            isDragging ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Fazendo upload...' : isDragging ? 'Solte os arquivos aqui' : 'Clique para fazer upload ou arraste arquivos aqui'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tamanho máximo: 20MB por arquivo
            </p>
          </div>
        </label>
      </div>

      {/* Indicadores de progresso de upload */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {file.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Upload className="h-4 w-4 text-primary flex-shrink-0 animate-pulse" />
                    )}
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground flex-shrink-0">
                    {file.progress}%
                  </span>
                </div>
                <Progress value={file.progress} className="h-2" />
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-destructive">{file.error}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de anexos */}
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando anexos...
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                   <div className="flex gap-1">
                    {(attachment.file_type.startsWith('image/') || 
                      attachment.file_type === 'application/pdf' ||
                      attachment.file_type.includes('document') ||
                      attachment.file_type.includes('text/')) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handlePreview(attachment)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(attachment)}
                      disabled={deleteMutation.isPending}
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum arquivo anexado</p>
          </div>
        )}
      </ScrollArea>

      {/* Dialog de preview */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
                className="absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-[400px]">
              {previewFile && previewFile.type.startsWith('image/') && (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain"
                  onLoad={() => URL.revokeObjectURL(previewFile.url)}
                />
              )}
              {previewFile && previewFile.type === 'application/pdf' && (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] border-0 rounded"
                  title={previewFile.name}
                />
              )}
              {previewFile && (
                previewFile.type.includes('text/') ||
                previewFile.type.includes('document')
              ) && (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] border-0 rounded bg-background"
                  title={previewFile.name}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
