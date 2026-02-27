import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pin, MoreVertical, Edit2, Trash2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ActivityAttachments } from './ActivityAttachments';

interface Activity {
  id: string;
  activity_type: string;
  title?: string;
  description?: string;
  created_by: string;
  created_at: string;
  is_pinned?: boolean;
  parent_activity_id?: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface NoteThreadProps {
  activity: Activity;
  replies: Activity[];
  attachments: Attachment[];
  userProfiles: { [key: string]: { name: string; email: string } };
  currentUserId: string;
  replyText: string;
  isEditing: boolean;
  editingText: string;
  onReplyTextChange: (text: string) => void;
  onReply: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditTextChange: (text: string) => void;
  onAttachmentsRefresh: () => void;
}

export const NoteThread: React.FC<NoteThreadProps> = ({
  activity,
  replies,
  attachments,
  userProfiles,
  currentUserId,
  replyText,
  isEditing,
  editingText,
  onReplyTextChange,
  onReply,
  onTogglePin,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditTextChange,
  onAttachmentsRefresh,
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  const creator = userProfiles[activity.created_by];
  const initials = creator?.name.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  const isOwnNote = activity.created_by === currentUserId;

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      activity.is_pinned ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800" : "bg-card border-border"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm">{creator?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(activity.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {activity.is_pinned && (
            <Pin className="h-4 w-4 text-yellow-600 dark:text-yellow-500 fill-current" />
          )}
          
          {isOwnNote && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {activity.is_pinned ? 'Desafixar' : 'Fixar esta anotação'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pl-10 space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editingText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
            {attachments.length > 0 && (
              <ActivityAttachments
                activityId={activity.id}
                attachments={attachments}
                onAttachmentsChange={onAttachmentsRefresh}
                currentUserId={currentUserId}
                compact
              />
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="pl-10 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowReplyBox(!showReplyBox)}
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          Adicionar comentário
        </Button>
        
        {replies.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? 'Ocultar' : 'Mostrar'} {replies.length} {replies.length === 1 ? 'comentário' : 'comentários'}
          </Button>
        )}
      </div>

      {/* Reply Box */}
      {showReplyBox && (
        <div className="pl-10 space-y-2">
          <div className="flex items-start gap-2">
            <Avatar className="h-6 w-6 mt-2">
              <AvatarFallback className="text-[10px]">
                {userProfiles[currentUserId]?.name.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder="Escreva um comentário, @nome..."
                className="min-h-[60px] text-sm"
              />
              <ActivityAttachments
                activityId={activity.id}
                attachments={[]}
                onAttachmentsChange={onAttachmentsRefresh}
                currentUserId={currentUserId}
                compact
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setShowReplyBox(false);
                onReplyTextChange('');
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={onReply} disabled={!replyText.trim()}>Comentar</Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="pl-10 space-y-3 border-l-2 border-muted ml-4">
          {replies.map((reply) => {
            const replyCreator = userProfiles[reply.created_by];
            const replyInitials = replyCreator?.name.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
            
            return (
              <div key={reply.id} className="pl-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{replyInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{replyCreator?.name || 'Usuário'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(reply.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground">{reply.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};