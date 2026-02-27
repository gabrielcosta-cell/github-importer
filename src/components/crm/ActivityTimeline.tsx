import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  FileText,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

interface ActivityTimelineProps {
  cardId: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ cardId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newActivity, setNewActivity] = useState({
    type: 'meeting' as string,
    title: '',
    description: '',
    scheduled_date: undefined as Date | undefined
  });

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_activities')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast('Erro ao carregar atividades');
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [cardId]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { toast('Você precisa estar logado'); return; }

      const { error } = await supabase
        .from('csm_activities')
        .insert({
          card_id: cardId,
          activity_type: 'comment',
          description: newComment,
          created_by: userData.user.id,
          status: 'completed'
        });

      if (error) throw error;
      setNewComment('');
      fetchActivities();
      toast('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const scheduleActivity = async () => {
    if (!newActivity.title.trim()) return;
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { toast('Você precisa estar logado'); return; }

      const { error } = await supabase
        .from('csm_activities')
        .insert({
          card_id: cardId,
          activity_type: newActivity.type,
          title: newActivity.title,
          description: newActivity.description,
          scheduled_date: newActivity.scheduled_date?.toISOString(),
          created_by: userData.user.id,
          status: 'pending'
        });

      if (error) throw error;
      setNewActivity({ type: 'meeting', title: '', description: '', scheduled_date: undefined });
      fetchActivities();
      toast('Atividade agendada com sucesso!');
    } catch (error) {
      console.error('Erro ao agendar atividade:', error);
      toast('Erro ao agendar atividade');
    } finally {
      setLoading(false);
    }
  };

  const completeActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('csm_activities')
        .update({ status: 'completed', completed_date: new Date().toISOString() })
        .eq('id', activityId);

      if (error) throw error;
      fetchActivities();
      toast('Atividade marcada como concluída!');
    } catch (error) {
      console.error('Erro ao completar atividade:', error);
      toast('Erro ao completar atividade');
    }
  };

  // Ícones para tipos de atividade
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment': return MessageCircle;
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return CalendarIcon;
      case 'task': return FileText;
      default: return MessageCircle;
    }
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="comment" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="comment">Comentários</TabsTrigger>
          <TabsTrigger value="activity">Atividades</TabsTrigger>
        </TabsList>
        
        <TabsContent value="comment" className="space-y-3">
          <Textarea placeholder="Adicione um comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[80px]" />
          <Button onClick={addComment} disabled={loading || !newComment.trim()} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />Adicionar Comentário
          </Button>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-3">
          <div className="space-y-3">
            <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value as string})} className="w-full p-2 border rounded-md bg-background">
              <option value="meeting">Reunião</option>
              <option value="call">Ligação</option>
              <option value="email">E-mail</option>
              <option value="task">Tarefa</option>
            </select>
            <Input placeholder="Título da atividade" value={newActivity.title} onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} />
            <Textarea placeholder="Descrição (opcional)" value={newActivity.description} onChange={(e) => setNewActivity({...newActivity, description: e.target.value})} className="min-h-[60px]" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newActivity.scheduled_date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newActivity.scheduled_date ? format(newActivity.scheduled_date, "dd/MM/yyyy") : <span>Selecionar data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={newActivity.scheduled_date} onSelect={(date) => setNewActivity({...newActivity, scheduled_date: date})} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Button onClick={scheduleActivity} disabled={loading || !newActivity.title.trim()} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />Agendar Atividade
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Histórico</h3>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type);
              return (
                <Card key={activity.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-full", activity.status === 'completed' ? 'bg-green-100 text-green-600' : activity.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600')}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          {activity.title && <h4 className="font-medium text-sm">{activity.title}</h4>}
                          <div className="flex items-center gap-2">
                            <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {activity.status === 'completed' ? 'Concluído' : activity.status === 'pending' ? 'Pendente' : 'Cancelado'}
                            </Badge>
                            {activity.status === 'pending' && (
                              <Button variant="ghost" size="sm" onClick={() => completeActivity(activity.id)} className="h-6 w-6 p-0">
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatDate(activity.created_at)}</span>
                          {activity.scheduled_date && (
                            <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>Agendado: {formatDate(activity.scheduled_date)}</span></div>
                          )}
                          {activity.completed_date && (
                            <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /><span>Concluído: {formatDate(activity.completed_date)}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
