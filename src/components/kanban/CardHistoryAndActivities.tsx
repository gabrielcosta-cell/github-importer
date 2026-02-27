import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MessageCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Filter,
  X as XIcon,
  Paperclip,
  FileIcon,
  Receipt,
  Video,
  Users,
  AlertCircle,
  Flag,
  MoreHorizontal,
  AlertTriangle,
  ExternalLink,
  Pin,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { HealthScoreChart } from '@/components/csm/HealthScoreChart';
import { AttachmentsManager } from './AttachmentsManager';
import { useNavigate } from 'react-router-dom';
import { NoteThread } from './NoteThread';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CardTasksList } from './CardTasksList';

interface Activity {
  id: string;
  activity_type: string;
  title?: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  parent_activity_id?: string | null;
}

interface StageHistoryEntry {
  id: string;
  stage_id: string;
  entered_at: string;
  exited_at: string | null;
  moved_by: string | null;
  reason: string | null;
  notes: string | null;
  stage_name?: string;
  stage_color?: string;
  user_name?: string;
}

interface CancellationRequest {
  id: string;
  empresa: string;
  responsavel: string;
  email: string;
  motivo: string;
  observacoes: string | null;
  status: string;
  stage: string | null;
  created_at: string;
  resolution_notes: string | null;
  resolved_at: string | null;
}

interface CardHistoryAndActivitiesProps {
  cardId: string;
  stageId?: string;
  stages: Array<{ id: string; name: string; color: string }>;
}

type ActiveTab = 'anotacoes' | 'atividade' | 'arquivos';
type HistoryFilter = 'todos' | 'anotacoes' | 'atividades' | 'alteracoes' | 'cancelamentos' | 'health_score';

export const CardHistoryAndActivities: React.FC<CardHistoryAndActivitiesProps> = ({ cardId, stageId, stages }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('anotacoes');
  const [noteText, setNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isFocusOpen, setIsFocusOpen] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('todos');
  const [activityDate, setActivityDate] = useState<Date | undefined>(new Date());
  const [activityTime, setActivityTime] = useState('12:00');
  const [activityPriority, setActivityPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    title: '',
    description: '',
    date: new Date(),
  });
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ [key: string]: any[] }>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: { name: string; email: string } }>({});

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  // Fetch user profiles
  const fetchUserProfiles = async (userIds: string[]) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);

    if (error) {
      console.error('Erro ao buscar perfis:', error);
      return;
    }

    const profilesMap: { [key: string]: { name: string; email: string } } = {};
    data?.forEach(profile => {
      profilesMap[profile.user_id] = {
        name: profile.name,
        email: profile.email,
      };
    });
    setUserProfiles(profilesMap);
  };

  // Fetch activities
  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar atividades:', error);
      return;
    }

    setActivities(data || []);
    
    // Fetch attachments for all activities
    if (data && data.length > 0) {
      const activityIds = data.map(a => a.id);
      const { data: attachmentsData } = await supabase
        .from('crm_activity_attachments')
        .select('*')
        .in('activity_id', activityIds);
      
      if (attachmentsData) {
        const attachmentsMap: { [key: string]: any[] } = {};
        attachmentsData.forEach(att => {
          if (!attachmentsMap[att.activity_id]) {
            attachmentsMap[att.activity_id] = [];
          }
          attachmentsMap[att.activity_id].push(att);
        });
        setAttachments(attachmentsMap);
      }
      
      // Fetch user profiles
      const userIds = [...new Set(data.map(a => a.created_by))];
      fetchUserProfiles(userIds);
    }
  };

  // Fetch cancellation requests
  const fetchCancellationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCancellationRequests(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico de cancelamentos:', error);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchCancellationRequests();
  }, [cardId]);

  // Fetch stage history
  const { data: stageHistory = [] } = useQuery({
    queryKey: ['stageHistory', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_card_stage_history')
        .select('*')
        .eq('card_id', cardId)
        .order('entered_at', { ascending: false });

      if (error) throw error;

      const enrichedHistory = await Promise.all(
        (data || []).map(async (entry) => {
          const stage = stages.find((s) => s.id === entry.stage_id);
          
          let userName = 'Sistema';
          if (entry.moved_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', entry.moved_by)
              .single();
            
            if (profile?.name) {
              userName = profile.name;
            }
          }

          return {
            ...entry,
            stage_name: stage?.name || 'Desconhecido',
            stage_color: stage?.color || '#666',
            user_name: userName,
          };
        })
      );

      return enrichedHistory as StageHistoryEntry[];
    },
  });

  // Add note
  const addNote = async () => {
    if (!noteText.trim()) {
      toast.error('Digite uma anotação');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('crm_activities')
      .insert({
        card_id: cardId,
        activity_type: 'comment',
        title: 'Anotação',
        description: noteText,
        status: 'completed',
        completed_date: new Date().toISOString(),
        created_by: user.id,
        is_pinned: false,
      });

    if (error) {
      console.error('Erro ao adicionar anotação:', error);
      toast.error('Erro ao adicionar anotação');
      return;
    }

    toast.success('Anotação adicionada!');
    setNoteText('');
    setIsEditingNote(false);
    fetchActivities();
  };

  // Toggle pin
  const togglePin = async (activityId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('crm_activities')
      .update({ is_pinned: !currentPinned })
      .eq('id', activityId);

    if (error) {
      console.error('Erro ao fixar/desfixar anotação:', error);
      toast.error('Erro ao fixar/desfixar anotação');
      return;
    }

    toast.success(currentPinned ? 'Anotação desfixada!' : 'Anotação fixada!');
    fetchActivities();
  };

  // Edit activity
  const saveEditedActivity = async () => {
    if (!editingActivityId || !editingText.trim()) return;

    const { error } = await supabase
      .from('crm_activities')
      .update({ description: editingText })
      .eq('id', editingActivityId);

    if (error) {
      console.error('Erro ao editar anotação:', error);
      toast.error('Erro ao editar anotação');
      return;
    }

    toast.success('Anotação editada!');
    setEditingActivityId(null);
    setEditingText('');
    fetchActivities();
  };

  // Delete activity
  const deleteActivity = async () => {
    if (!deletingActivityId) return;

    const { error } = await supabase
      .from('crm_activities')
      .delete()
      .eq('id', deletingActivityId);

    if (error) {
      console.error('Erro ao excluir anotação:', error);
      toast.error('Erro ao excluir anotação');
      return;
    }

    toast.success('Anotação excluída!');
    setDeletingActivityId(null);
    fetchActivities();
  };

  // Add reply to activity
  const addReply = async (parentId: string) => {
    const text = replyText[parentId];
    if (!text?.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('crm_activities')
      .insert({
        card_id: cardId,
        activity_type: 'comment',
        title: 'Resposta',
        description: text,
        status: 'completed',
        completed_date: new Date().toISOString(),
        created_by: user.id,
        parent_activity_id: parentId,
      });

    if (error) {
      console.error('Erro ao adicionar resposta:', error);
      toast.error('Erro ao adicionar resposta');
      return;
    }

    toast.success('Comentário adicionado!');
    setReplyText({ ...replyText, [parentId]: '' });
    fetchActivities();
  };

  // Schedule activity
  const scheduleActivity = async () => {
    if (!newActivity.title.trim()) {
      toast.error('Digite um título para a atividade');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Combinar data e hora
    const scheduledDateTime = activityDate ? new Date(activityDate) : new Date();
    const [hours, minutes] = activityTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    const { error } = await supabase
      .from('crm_activities')
      .insert({
        card_id: cardId,
        activity_type: newActivity.type,
        title: newActivity.title,
        description: newActivity.description,
        scheduled_date: scheduledDateTime.toISOString(),
        status: 'pending',
        created_by: user.id,
      });

    if (error) {
      console.error('Erro ao agendar atividade:', error);
      toast.error('Erro ao agendar atividade');
      return;
    }

    toast.success('Atividade agendada!');
    setNewActivity({ type: 'call', title: '', description: '', date: new Date() });
    setActivityDate(new Date());
    setActivityTime('12:00');
    setActivityPriority('media');
    setActiveTab('anotacoes');
    fetchActivities();
  };

  // Complete activity
  const completeActivity = async (activityId: string) => {
    const { error } = await supabase
      .from('crm_activities')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
      })
      .eq('id', activityId);

    if (error) {
      console.error('Erro ao completar atividade:', error);
      toast.error('Erro ao completar atividade');
      return;
    }

    toast.success('Atividade marcada como concluída!');
    fetchActivities();
  };

  const getActivityIcon = (type: string, completed: boolean) => {
    const iconClass = "h-3 w-3";
    
    if (completed) {
      return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
    }

    switch (type) {
      case 'call': return <Phone className={iconClass} />;
      case 'email': return <Mail className={iconClass} />;
      case 'meeting': return <Users className={iconClass} />;
      case 'note': return <MessageCircle className={iconClass} />;
      default: return <Clock className={iconClass} />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Filtrar atividades para o histórico - SEMPRE incluir todos, independente se estão pinados
  const filteredActivities = activities.filter((activity) => {
    if (historyFilter === 'todos') return true;
    if (historyFilter === 'anotacoes') return activity.activity_type === 'comment';
    if (historyFilter === 'atividades') return activity.activity_type !== 'comment';
    return false;
  });

  // Separar itens para a seção Foco (apenas anotações fixadas)
  const pinnedItems = activities
    .filter(activity => activity.is_pinned === true)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const notesCount = activities.filter(a => a.activity_type === 'comment').length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs superiores */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('anotacoes')}
            className={cn(
              "rounded-none border-b-2 px-3 h-9 text-xs",
              activeTab === 'anotacoes' ? "border-primary text-primary" : "border-transparent"
            )}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Anotações
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('atividade')}
            className={cn(
              "rounded-none border-b-2 px-3 h-9 text-xs",
              activeTab === 'atividade' ? "border-primary text-primary" : "border-transparent"
            )}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            Atividade
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('arquivos')}
            className={cn(
              "rounded-none border-b-2 px-3 h-9 text-xs",
              activeTab === 'arquivos' ? "border-primary text-primary" : "border-transparent"
            )}
          >
            <Paperclip className="h-3 w-3 mr-1" />
            Arquivos
          </Button>
        </div>
      </div>

      {/* Área de conteúdo das tabs */}
      <div className="px-3 pt-3 pb-2">
        {activeTab === 'anotacoes' && (
          <div className="space-y-2">
            {!isEditingNote ? (
              <div
                onClick={() => setIsEditingNote(true)}
                className="min-h-[60px] p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground">Escreva uma anotação, @nome...</span>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Escreva uma anotação, @nome..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[80px] text-sm resize-none border-border"
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{notesCount}/100 notes</span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setIsEditingNote(false);
                        setNoteText('');
                      }} 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={addNote} size="sm" className="h-7 text-xs">
                      Adicionar nota
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'atividade' && (
          <div className="space-y-3">
            <Input
              placeholder="Título da atividade"
              value={newActivity.title}
              onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
              className="text-sm h-9"
            />
            
            <Select value={newActivity.type} onValueChange={(value) => setNewActivity({...newActivity, type: value})}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Chamada
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    E-mail
                  </div>
                </SelectItem>
                <SelectItem value="meeting">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Reunião
                  </div>
                </SelectItem>
                <SelectItem value="task">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    Tarefa
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 text-xs justify-start">
                    <CalendarIcon className="h-3 w-3 mr-2" />
                    {activityDate ? format(activityDate, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={activityDate}
                    onSelect={setActivityDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <select
              value={activityPriority}
              onChange={(e) => setActivityPriority(e.target.value as 'baixa' | 'media' | 'alta')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="baixa">Prioridade: Baixa</option>
              <option value="media">Prioridade: Média</option>
              <option value="alta">Prioridade: Alta</option>
            </select>
            
            <Textarea
              placeholder="Descrição"
              value={newActivity.description}
              onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
              className="min-h-[60px] text-sm resize-none"
            />
            
            <Button onClick={scheduleActivity} size="sm" className="h-8 text-xs w-full">
              Agendar atividade
            </Button>
          </div>
        )}

        {activeTab === 'arquivos' && (
          <div className="py-2">
            <AttachmentsManager cardId={cardId} />
          </div>
        )}
      </div>

      <Separator className="my-2" />

      {/* Seção Foco */}
      <Collapsible open={isFocusOpen} onOpenChange={setIsFocusOpen} className="px-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Foco
              {isFocusOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </h3>
            {pinnedItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {pinnedItems.length}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          {/* Seção de Tarefas Obrigatórias */}
          <CardTasksList cardId={cardId} stageId={stageId} onTasksChange={fetchActivities} />
          
          {/* Anotações Fixadas */}
          {pinnedItems.length === 0 ? null : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 pr-2">
                {pinnedItems.map((item) => {
                  const isNote = item.activity_type === 'comment';
                  const replies = activities.filter(a => a.parent_activity_id === item.id);
                  
                  return (
                    <NoteThread
                      key={item.id}
                      activity={item}
                      replies={replies}
                      attachments={attachments[item.id] || []}
                      userProfiles={userProfiles}
                      currentUserId={currentUserId}
                      replyText={replyText[item.id] || ''}
                      isEditing={editingActivityId === item.id}
                      editingText={editingText}
                      onReplyTextChange={(text) => setReplyText({ ...replyText, [item.id]: text })}
                      onReply={() => addReply(item.id)}
                      onTogglePin={() => togglePin(item.id, item.is_pinned || false)}
                      onEdit={() => {
                        setEditingActivityId(item.id);
                        setEditingText(item.description || '');
                      }}
                      onSaveEdit={saveEditedActivity}
                      onCancelEdit={() => {
                        setEditingActivityId(null);
                        setEditingText('');
                      }}
                      onDelete={() => setDeletingActivityId(item.id)}
                      onEditTextChange={setEditingText}
                      onAttachmentsRefresh={fetchActivities}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator className="my-2" />

      {/* Seção Histórico */}
      <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="px-3 flex-1 flex flex-col min-h-0">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Histórico
              {isHistoryOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </h3>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex-1 flex flex-col min-h-0">
          {/* Sub-abas do histórico */}
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-0 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryFilter('todos')}
              className={cn(
                "rounded-none border-b-2 px-2 h-7 text-xs",
                historyFilter === 'todos' ? "border-primary text-primary" : "border-transparent"
              )}
            >
              Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryFilter('anotacoes')}
              className={cn(
                "rounded-none border-b-2 px-2 h-7 text-xs",
                historyFilter === 'anotacoes' ? "border-primary text-primary" : "border-transparent"
              )}
            >
              Anotações ({activities.filter(a => a.activity_type === 'comment').length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryFilter('atividades')}
              className={cn(
                "rounded-none border-b-2 px-2 h-7 text-xs",
                historyFilter === 'atividades' ? "border-primary text-primary" : "border-transparent"
              )}
            >
              Atividades ({activities.filter(a => a.activity_type !== 'comment').length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryFilter('alteracoes')}
              className={cn(
                "rounded-none border-b-2 px-2 h-7 text-xs",
                historyFilter === 'alteracoes' ? "border-primary text-primary" : "border-transparent"
              )}
            >
              Registro de alterações
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryFilter('cancelamentos')}
              className={cn(
                "rounded-none border-b-2 px-2 h-7 text-xs",
                historyFilter === 'cancelamentos' ? "border-primary text-primary" : "border-transparent"
              )}
            >
              Cancelamentos ({cancellationRequests.length})
            </Button>
          </div>

          {/* Timeline de histórico */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-2">
              {/* Health Score Chart */}
              {historyFilter === 'health_score' && (
                <div className="pt-2">
                  <HealthScoreChart cardId={cardId} />
                </div>
              )}

              {/* Stage History */}
              {(historyFilter === 'todos' || historyFilter === 'alteracoes') && stageHistory.map((entry, index) => {
                const isCurrentStage = !entry.exited_at;
                const isCreationEvent = (entry as any).event_type === 'card_created';
                
                return (
                  <div key={entry.id} className="relative pl-6 pb-2">
                    {/* Linha vertical */}
                    {index !== stageHistory.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px border-l border-dashed border-border" />
                    )}
                    
                    {/* Ícone */}
                    <div className="absolute left-0 top-0.5">
                      <div className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background",
                        isCreationEvent ? "bg-green-500" : isCurrentStage ? "bg-primary" : "bg-muted"
                      )}>
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isCreationEvent ? "bg-white" : isCurrentStage ? "bg-primary-foreground" : "bg-muted-foreground"
                        )} />
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">
                          {isCreationEvent ? 'Card criado' : entry.stage_name}
                        </span>
                        {isCurrentStage && !isCreationEvent && (
                          <Badge variant="default" className="text-xs h-4 px-1.5">Atual</Badge>
                        )}
                        {isCreationEvent && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5 bg-green-500/10 text-green-600">Criação</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.entered_at)}
                      </div>
                      {entry.user_name && (
                        <div className="text-xs text-muted-foreground">
                          por {entry.user_name}
                        </div>
                      )}
                      {entry.notes && (
                        <div className="text-xs text-muted-foreground italic">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Activities */}
              {(historyFilter === 'todos' || historyFilter === 'anotacoes' || historyFilter === 'atividades') && filteredActivities
                .filter(activity => !activity.parent_activity_id) // Apenas atividades principais (não respostas)
                .map((activity, index) => {
                const isCompleted = activity.status === 'completed';
                const isPending = activity.status === 'pending';
                const isNote = activity.activity_type === 'comment';
                
                // Design especial para anotações (comment type) usando NoteThread
                if (isNote) {
                  // Buscar respostas para esta anotação
                  const replies = activities.filter(a => a.parent_activity_id === activity.id);
                  
                  return (
                    <div key={activity.id} className="relative pl-6 pb-2">
                      {/* Linha vertical */}
                      {index !== filteredActivities.filter(a => !a.parent_activity_id).length - 1 && (
                        <div className="absolute left-[7px] top-5 bottom-0 w-px border-l border-dashed border-border" />
                      )}
                      
                      {/* Ícone */}
                      <div className="absolute left-0 top-0.5">
                        <div className="h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background bg-yellow-500">
                          <MessageCircle className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>

                      {/* NoteThread Component */}
                      <NoteThread
                        activity={activity}
                        replies={replies}
                        attachments={attachments[activity.id] || []}
                        userProfiles={userProfiles}
                        currentUserId={currentUserId}
                        replyText={replyText[activity.id] || ''}
                        isEditing={editingActivityId === activity.id}
                        editingText={editingText}
                        onReplyTextChange={(text) => setReplyText({ ...replyText, [activity.id]: text })}
                        onReply={() => addReply(activity.id)}
                        onTogglePin={() => togglePin(activity.id, activity.is_pinned || false)}
                        onEdit={() => {
                          setEditingActivityId(activity.id);
                          setEditingText(activity.description || '');
                        }}
                        onSaveEdit={saveEditedActivity}
                        onCancelEdit={() => {
                          setEditingActivityId(null);
                          setEditingText('');
                        }}
                        onDelete={() => setDeletingActivityId(activity.id)}
                        onEditTextChange={setEditingText}
                        onAttachmentsRefresh={fetchActivities}
                      />
                    </div>
                  );
                }
                
                // Design padrão para atividades (não-anotações)
                return (
                  <div key={activity.id} className="relative pl-6 pb-2 group">
                    {/* Linha vertical */}
                    {index !== filteredActivities.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px border-l border-dashed border-border" />
                    )}
                    
                    {/* Ícone */}
                    <div className="absolute left-0 top-0.5">
                      <div className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background",
                        isCompleted ? "bg-green-500" : "bg-muted"
                      )}>
                        {getActivityIcon(activity.activity_type, isCompleted)}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium flex-1">
                          {activity.title || 'Atividade sem título'}
                        </div>
                        <div className="flex items-center gap-1">
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => completeActivity(activity.id)}
                              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                      {activity.description && (
                        <div className="text-xs text-muted-foreground">
                          {activity.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(activity.scheduled_date || activity.created_at)}
                      </div>
                      {isCompleted && activity.completed_date && (
                        <div className="text-xs text-green-600">
                          ✓ Concluída em {formatDate(activity.completed_date)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Cancellation Requests */}
              {(historyFilter === 'todos' || historyFilter === 'cancelamentos') && cancellationRequests.map((request, index) => {
                const getStatusBadge = (status: string) => {
                  const statusConfig = {
                    pendente: { label: 'Pendente', variant: 'secondary' as const },
                    em_analise: { label: 'Em Análise', variant: 'default' as const },
                    resolvido: { label: 'Resolvido', variant: 'default' as const },
                    cancelado: { label: 'Cancelado', variant: 'destructive' as const },
                  };
                  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
                  return <Badge variant={config.variant} className="text-xs h-4 px-1.5">{config.label}</Badge>;
                };

                return (
                  <div key={request.id} className="relative pl-6 pb-2">
                    {/* Linha vertical */}
                    {index !== cancellationRequests.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px border-l border-dashed border-border" />
                    )}
                    
                    {/* Ícone */}
                    <div className="absolute left-0 top-0.5">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background bg-orange-500">
                        <AlertTriangle className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">
                          Solicitação de Cancelamento
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {formatDate(request.created_at)}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {request.responsavel}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        <strong>Motivo:</strong> {request.motivo}
                      </div>

                      {request.observacoes && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          {request.observacoes}
                        </div>
                      )}

                      {request.resolution_notes && (
                        <div className="text-xs text-muted-foreground mt-1 p-2 bg-card/50 rounded border">
                          <strong>Resolução:</strong> {request.resolution_notes}
                        </div>
                      )}

                      {request.resolved_at && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Resolvida em {formatDate(request.resolved_at)}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/gestao-cancelamentos')}
                        className="h-6 px-2 text-xs mt-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivityId} onOpenChange={() => setEditingActivityId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Anotação</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            placeholder="Digite a anotação..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingActivityId(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEditedActivity}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Activity Confirmation */}
      <AlertDialog open={!!deletingActivityId} onOpenChange={() => setDeletingActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Anotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteActivity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
