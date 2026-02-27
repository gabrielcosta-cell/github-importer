import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileIcon, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface ActivityAttachmentsProps {
  activityId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  currentUserId: string;
  compact?: boolean;
}

export const ActivityAttachments: React.FC<ActivityAttachmentsProps> = ({
  activityId,
  attachments,
  onAttachmentsChange,
  currentUserId,
  compact = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${activityId}-${Date.now()}.${fileExt}`;
        const filePath = `activity-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('crm-card-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
            .from('csm_activity_attachments')
          .insert({
            activity_id: activityId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: currentUserId,
          });

        if (dbError) throw dbError;
      }

      toast.success('Arquivo(s) anexado(s) com sucesso!');
      onAttachmentsChange();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao anexar arquivo');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

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
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleDelete = async (attachmentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('crm-card-attachments')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('csm_activity_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      toast.success('Anexo removido');
      onAttachmentsChange();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Erro ao remover anexo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 text-xs"
            >
              <FileIcon className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[150px]">{attachment.file_name}</span>
              <span className="text-muted-foreground">({formatFileSize(attachment.file_size)})</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => handleDownload(attachment)}
              >
                <Download className="h-3 w-3" />
              </Button>
              {attachment.uploaded_by === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment.id, attachment.file_path)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          type="file"
          id={`file-upload-${activityId}`}
          multiple
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 text-xs", compact && "h-6")}
          onClick={() => document.getElementById(`file-upload-${activityId}`)?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3 mr-1" />
          )}
          {uploading ? 'Enviando...' : 'Anexar arquivo'}
        </Button>
      </div>
    </div>
  );
};
