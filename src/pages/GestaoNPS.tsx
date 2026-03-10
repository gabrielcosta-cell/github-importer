import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown, Filter, Link2, Link2Off, ExternalLink, Heart, Frown, Meh, Smile, Trash2, Users, Eye, ChevronDown, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthYearPicker } from "@/components/MonthYearPicker";

interface NPSResponse {
  id: string;
  empresa: string;
  responsavel: string;
  email: string;
  cnpj: string | null;
  recomendacao: number;
  sentimento_sem_dot: string;
  observacoes: string | null;
  created_at: string;
  card_id: string | null;
  squad: string | null;
}

interface Squad {
  id: string;
  name: string;
  color: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface NPSStage {
  id: string;
  name: string;
  color: string;
  minScore: number;
  maxScore: number;
}

const NPS_STAGES: NPSStage[] = [
  { id: 'detrator', name: 'Detratores', color: '#ef4444', minScore: 1, maxScore: 6 },
  { id: 'neutro', name: 'Neutros', color: '#f59e0b', minScore: 7, maxScore: 8 },
  { id: 'promotor', name: 'Promotores', color: '#10b981', minScore: 9, maxScore: 10 },
];

// Helper para formatar data em UTC (evita problemas de timezone)
const formatDateUTC = (dateString: string, formatStr: string = "dd/MM/yyyy 'às' HH:mm") => {
  const date = new Date(dateString);
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return format(utcDate, formatStr, { locale: ptBR });
};

export default function GestaoNPS() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<NPSResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("todos");
  const [cardLinkFilter, setCardLinkFilter] = useState<string>("todos");
  const [squadFilter, setSquadFilter] = useState<string>("todos");
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<NPSResponse | null>(null);
  const [sortBy, setSortBy] = useState<'empresa' | 'date' | 'score'>('date');
  const [linkCardDialogOpen, setLinkCardDialogOpen] = useState(false);
  const [csmCards, setCsmCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [userCustomRole, setUserCustomRole] = useState<string | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineFilter, setPipelineFilter] = useState<string>("todos");
  const [allLinkedCards, setAllLinkedCards] = useState<any[]>([]);

  // Buscar custom_role do usuário
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!profile?.custom_role_id) return;
      
      const { data } = await supabase
        .from('custom_roles')
        .select('name')
        .eq('id', profile.custom_role_id)
        .single();
      
      if (data) {
        setUserCustomRole(data.name);
      }
    };
    fetchUserRole();
  }, [profile?.custom_role_id]);

  // Verificar se pode excluir (admin ou Head de Projetos)
  const canDelete = profile?.role === 'admin' || 
    userCustomRole === 'head_de_projetos' || 
    userCustomRole === 'head_projetos_performance_cs';

  useEffect(() => {
    fetchResponses();
    fetchCSMCards();
    fetchSquads();
    fetchPipelines();
    fetchAllLinkedCards();
  }, []);

  const fetchSquads = async () => {
    try {
      const { data } = await supabase
        .from('squads')
        .select('id, name, color')
        .eq('is_active', true)
        .order('position');
      setSquads(data || []);
    } catch (error) {
      console.error('Erro ao buscar squads:', error);
    }
  };

  const fetchPipelines = async () => {
    try {
      const { data } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .or('name.ilike.%clientes%,name.ilike.%csm%,name.ilike.%customer%')
        .eq('is_active', true)
        .order('name');
      setPipelines(data || []);
    } catch (error) {
      console.error('Erro ao buscar pipelines:', error);
    }
  };

  const fetchAllLinkedCards = async () => {
    try {
      const { data: pipelinesData } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .or('name.ilike.%clientes%,name.ilike.%csm%,name.ilike.%customer%');

      if (pipelinesData && pipelinesData.length > 0) {
        const pipelineIds = pipelinesData.map(p => p.id);
        const { data: cards } = await supabase
          .from('csm_cards')
          .select('id, pipeline_id')
          .in('pipeline_id', pipelineIds);
        
        setAllLinkedCards(cards || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cards vinculados:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Erro ao buscar respostas NPS:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as respostas NPS.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCSMCards = async () => {
    try {
      // Buscar apenas o pipeline "Clientes ativos" para novas vinculações
      const { data: pipeline } = await supabase
        .from('csm_pipelines')
        .select('id')
        .eq('name', 'Clientes ativos')
        .maybeSingle();

      if (pipeline) {
        const { data: cards } = await supabase
          .from('csm_cards')
          .select('id, title, company_name, squad')
          .eq('pipeline_id', pipeline.id)
          .order('company_name', { ascending: true });
        
        setCsmCards(cards || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cards CSM:', error);
    }
  };

  // Função para vincular automaticamente NPS responses com cards CSM pelo nome da empresa
  const autoLinkByCompanyName = async (showToast = true) => {
    try {
      // Buscar respostas NPS sem card_id vinculado diretamente do banco
      const { data: unlinkedResponses } = await supabase
        .from('nps_responses')
        .select('*')
        .is('card_id', null);

      if (!unlinkedResponses || unlinkedResponses.length === 0) {
        if (showToast) {
          toast({
            title: "Info",
            description: "Todas as respostas já estão vinculadas.",
          });
        }
        return;
      }

      // Buscar apenas cards do pipeline "Clientes ativos" para novas vinculações
      const { data: pipeline } = await supabase
        .from('csm_pipelines')
        .select('id')
        .eq('name', 'Clientes ativos')
        .maybeSingle();

      if (!pipeline) return;

      const { data: cards } = await supabase
          .from('csm_cards')
        .select('id, title, company_name, squad')
        .eq('pipeline_id', pipeline.id);

      if (!cards || cards.length === 0) return;

      let linkedCount = 0;
      
      for (const response of unlinkedResponses) {
        // Normalizar nome da empresa para comparação
        const normalizedEmpresa = response.empresa.toLowerCase().trim();
        
        // Procurar card CSM com mesmo nome de empresa (company_name ou title)
        const matchingCard = cards.find(card => {
          const normalizedCompanyName = (card.company_name || '').toLowerCase().trim();
          const normalizedTitle = (card.title || '').toLowerCase().trim();
          return normalizedCompanyName === normalizedEmpresa || normalizedTitle === normalizedEmpresa;
        });
        
        if (matchingCard) {
          // Vincular a resposta NPS ao card CSM
          const { error } = await supabase
            .from('nps_responses')
            .update({ 
              card_id: matchingCard.id,
              squad: matchingCard.squad || response.squad
            })
            .eq('id', response.id);
          
          if (!error) {
            linkedCount++;
            
            // Registrar no histórico do card CSM
            const { data: cardData } = await supabase
              .from('csm_cards')
              .select('stage_id')
              .eq('id', matchingCard.id)
              .single();
            
            if (cardData) {
              await supabase.from('csm_card_stage_history').insert({
                card_id: matchingCard.id,
                stage_id: cardData.stage_id,
                event_type: 'nps_linked',
                notes: `Pesquisa NPS vinculada automaticamente - Empresa: ${response.empresa}, Nota: ${response.recomendacao}/10`,
                moved_by: profile?.user_id || null
              });
            }
          }
        }
      }
      
      if (linkedCount > 0) {
        if (showToast) {
          toast({
            title: "Sucesso",
            description: `${linkedCount} resposta(s) NPS vinculada(s) automaticamente.`,
          });
        }
        fetchResponses();
      } else if (showToast) {
        toast({
          title: "Info",
          description: "Nenhuma correspondência encontrada entre empresas.",
        });
      }
    } catch (error) {
      console.error('Erro ao vincular automaticamente:', error);
      if (showToast) {
        toast({
          title: "Erro",
          description: "Não foi possível vincular automaticamente.",
          variant: "destructive",
        });
      }
    }
  };

  // Executar vinculação automática ao carregar a página
  useEffect(() => {
    autoLinkByCompanyName(false);
  }, []);

  const getSquadFromCardId = (cardId: string | null): string | null => {
    if (!cardId) return null;
    const card = csmCards.find(c => c.id === cardId);
    return card?.squad || null;
  };

  const handleSquadChange = async (responseId: string, newSquad: string) => {
    try {
      // Se o valor for "indefinido", salva como null
      const squadValue = newSquad === 'indefinido' ? null : newSquad;
      
      // Buscar a resposta atual para obter o squad antigo e o card_id
      const currentResponse = responses.find(r => r.id === responseId);
      const oldSquad = currentResponse?.squad;
      const cardId = currentResponse?.card_id;
      
      const { error } = await supabase
        .from('nps_responses')
        .update({ squad: squadValue })
        .eq('id', responseId);

      if (error) throw error;
      
      // Registrar no histórico do card CSM vinculado, se houver
      if (cardId && profile?.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', profile.user_id)
          .single();

        const userName = userData?.name || profile?.email || 'Usuário';
        const oldSquadDisplay = oldSquad || 'Sem squad';
        const newSquadDisplay = squadValue || 'Sem squad';

        await supabase.from('csm_card_stage_history').insert({
          card_id: cardId,
          stage_id: (await supabase.from('csm_cards').select('stage_id').eq('id', cardId).single()).data?.stage_id,
          event_type: 'field_change',
          notes: `Squad alterado de "${oldSquadDisplay}" para "${newSquadDisplay}" (via NPS) por ${userName}`,
          moved_by: profile.user_id
        });
      }
      
      setResponses(prev => prev.map(r => 
        r.id === responseId ? { ...r, squad: squadValue } : r
      ));
      
      if (selectedResponse?.id === responseId) {
        setSelectedResponse(prev => prev ? { ...prev, squad: squadValue } : null);
      }
      
      toast({
        title: "Sucesso",
        description: "Squad atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar squad:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o squad.",
        variant: "destructive",
      });
    }
  };

  const getScoreCategory = (score: number): string => {
    if (score <= 6) return 'detrator';
    if (score <= 8) return 'neutro';
    return 'promotor';
  };

  const filteredResponsesData = useMemo(() => {
    let filtered = responses;

    // Filtro por mês usando selectedPeriod (usar UTC para evitar problemas de timezone)
    if (selectedPeriod.length > 0) {
      filtered = filtered.filter(res => {
        const date = new Date(res.created_at);
        const resMonth = date.getUTCMonth();
        const resYear = date.getUTCFullYear();
        return selectedPeriod.some(p => p.month === resMonth && p.year === resYear);
      });
    }

    if (scoreFilter !== "todos") {
      filtered = filtered.filter(res => getScoreCategory(res.recomendacao) === scoreFilter);
    }

    if (cardLinkFilter === "vinculado") {
      filtered = filtered.filter(res => res.card_id !== null);
    } else if (cardLinkFilter === "nao_vinculado") {
      filtered = filtered.filter(res => res.card_id === null);
    }

    if (squadFilter !== "todos") {
      if (squadFilter === "sem_squad") {
        filtered = filtered.filter(res => !res.squad);
      } else {
        filtered = filtered.filter(res => res.squad === squadFilter);
      }
    }

    // Filtro de pipeline (funil)
    if (pipelineFilter !== "todos") {
      filtered = filtered.filter(res => {
        if (!res.card_id) return false;
        const linkedCard = allLinkedCards.find(c => c.id === res.card_id);
        if (!linkedCard) return false;
        const pipeline = pipelines.find(p => p.id === linkedCard.pipeline_id);
        return pipeline?.name === pipelineFilter;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(res =>
        res.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'empresa') {
        return a.empresa.localeCompare(b.empresa);
      } else if (sortBy === 'score') {
        return b.recomendacao - a.recomendacao;
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return {
      responses: sorted,
      count: sorted.length
    };
  }, [responses, searchTerm, scoreFilter, sortBy, cardLinkFilter, selectedPeriod, squadFilter, pipelineFilter, allLinkedCards, pipelines]);

  const getResponsesForStage = (stage: NPSStage) => {
    return filteredResponsesData.responses.filter(
      res => res.recomendacao >= stage.minScore && res.recomendacao <= stage.maxScore
    );
  };

  const handleViewDetails = (response: NPSResponse) => {
    setSelectedResponse(response);
    setIsDialogOpen(true);
  };

  const handleDeleteResponse = (response: NPSResponse) => {
    setResponseToDelete(response);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!responseToDelete) return;

    try {
      const { error } = await supabase
        .from('nps_responses')
        .delete()
        .eq('id', responseToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Resposta NPS deletada com sucesso.",
      });

      fetchResponses();
    } catch (error) {
      console.error('Erro ao deletar resposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a resposta.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
    }
  };

  const handleLinkCard = async () => {
    if (!selectedResponse || !selectedCardId) return;

    try {
      const { error } = await supabase
        .from('nps_responses')
        .update({ card_id: selectedCardId })
        .eq('id', selectedResponse.id);

      if (error) throw error;

      // Registrar no histórico do card CSM
      const { data: cardData } = await supabase
        .from('csm_cards')
        .select('stage_id')
        .eq('id', selectedCardId)
        .single();
      
      if (cardData && profile?.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', profile.user_id)
          .single();

        const userName = userData?.name || profile?.email || 'Usuário';

        await supabase.from('csm_card_stage_history').insert({
          card_id: selectedCardId,
          stage_id: cardData.stage_id,
          event_type: 'nps_linked',
          notes: `Pesquisa NPS vinculada manualmente por ${userName} - Empresa: ${selectedResponse.empresa}, Nota: ${selectedResponse.recomendacao}/10`,
          moved_by: profile.user_id
        });
      }

      toast({
        title: "Sucesso",
        description: "Card CSM vinculado com sucesso.",
      });

      setLinkCardDialogOpen(false);
      setSelectedCardId("");
      fetchResponses();
    } catch (error) {
      console.error('Erro ao vincular card:', error);
      toast({
        title: "Erro",
        description: "Não foi possível vincular o card.",
        variant: "destructive",
      });
    }
  };

  const getScoreIcon = (score: number) => {
    if (score <= 6) return <Frown className="w-4 h-4 text-red-500" />;
    if (score <= 8) return <Meh className="w-4 h-4 text-yellow-500" />;
    return <Smile className="w-4 h-4 text-green-500" />;
  };

  const getScoreBadge = (score: number) => {
    const category = getScoreCategory(score);
    const config = {
      detrator: { variant: "destructive" as const, label: "Detrator" },
      neutro: { variant: "secondary" as const, label: "Neutro" },
      promotor: { variant: "default" as const, label: "Promotor" },
    };

    return (
      <Badge variant={config[category].variant} className="flex items-center gap-1 w-fit">
        {getScoreIcon(score)}
        {score} - {config[category].label}
      </Badge>
    );
  };

  const getSquadColor = (squadName: string | null): string => {
    if (!squadName) return '';
    const squad = squads.find(s => s.name.toLowerCase() === squadName.toLowerCase());
    return squad?.color || '';
  };

  const handleOpenInCSM = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/?tab=csm&openCard=${cardId}`);
  };

  const NPSCard = ({ response }: { response: NPSResponse }) => {
    const linkedSquad = getSquadFromCardId(response.card_id);
    const displaySquad = response.squad || linkedSquad || null;
    const squadColor = getSquadColor(displaySquad);
    
    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDeleteResponse(response);
    };

    return (
      <Card 
        className="group relative mb-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleViewDetails(response)}
      >
        {canDelete && (
          <button
            onClick={handleDeleteClick}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all z-10"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{response.empresa}</h4>
              <p className="text-xs text-muted-foreground truncate">{response.responsavel}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold" style={{ color: NPS_STAGES.find(s => response.recomendacao >= s.minScore && response.recomendacao <= s.maxScore)?.color }}>
                {response.recomendacao}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground mb-1">
            {formatDateUTC(response.created_at)}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">CNPJ:</span> {response.cnpj || '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge 
              variant="outline" 
              className="text-xs flex items-center gap-1"
              style={squadColor ? { borderColor: squadColor, color: squadColor } : {}}
            >
              <Users className="w-3 h-3" />
              {displaySquad || 'Indefinido'}
            </Badge>
            {response.card_id ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs flex items-center gap-1"
                onClick={(e) => handleOpenInCSM(response.card_id!, e)}
              >
                <Eye className="w-3 h-3" />
                Abrir no CSM
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground">
                <Link2Off className="w-3 h-3" />
                Não vinculado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header com controles - otimizado para mobile */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-3">
        {/* Mobile: Layout empilhado */}
        <div className="flex flex-col gap-3 md:hidden">
          {/* Linha 1: Pesquisa */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar no DOT"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full bg-background h-10"
            />
          </div>
          
          {/* Linha 2: contador + ações */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Contador */}
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
              <span className="text-xs font-medium text-foreground">
                {filteredResponsesData.count}
              </span>
              <span className="text-xs text-muted-foreground">
                {filteredResponsesData.count === 1 ? 'resp.' : 'resp.'}
              </span>
            </div>
            
            {/* Ações compactas */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-none border-r">
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-1">
                    <Button
                      variant={sortBy === 'date' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSortBy('date')}
                    >
                      Data
                    </Button>
                    <Button
                      variant={sortBy === 'empresa' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSortBy('empresa')}
                    >
                      Empresa
                    </Button>
                    <Button
                      variant={sortBy === 'score' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSortBy('score')}
                    >
                      Nota
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-none border-r">
                    <Filter className="w-4 h-4" />
                    {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos" || pipelineFilter !== "todos") && (
                      <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {[scoreFilter !== "todos", cardLinkFilter !== "todos", squadFilter !== "todos", pipelineFilter !== "todos"].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Categoria NPS</label>
                      <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          <SelectItem value="promotor">Promotores</SelectItem>
                          <SelectItem value="neutro">Neutros</SelectItem>
                          <SelectItem value="detrator">Detratores</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Vinculação</label>
                      <Select value={cardLinkFilter} onValueChange={setCardLinkFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          <SelectItem value="vinculado">Vinculado</SelectItem>
                          <SelectItem value="nao_vinculado">Não vinculado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Squad</label>
                      <Select value={squadFilter} onValueChange={setSquadFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="sem_squad">Sem squad</SelectItem>
                          {squads.map(squad => (
                            <SelectItem key={squad.id} value={squad.name}>
                              {squad.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Funil do Cliente</label>
                      <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {pipelines.map(pipeline => (
                            <SelectItem key={pipeline.id} value={pipeline.name}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos" || pipelineFilter !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScoreFilter("todos");
                          setCardLinkFilter("todos");
                          setSquadFilter("todos");
                          setPipelineFilter("todos");
                        }}
                        className="w-full"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              <MonthYearPicker
                selectedPeriods={selectedPeriod}
                onPeriodsChange={setSelectedPeriod}
              />
            </div>
          </div>
        </div>
        
        {/* Desktop: Layout horizontal original */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Botões de visualização à esquerda */}

          {/* Campo de pesquisa centralizado */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar no DOT"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-md">
            <span className="text-sm font-medium text-foreground">
              {filteredResponsesData.count}
            </span>
            <span className="text-sm text-muted-foreground">
              {filteredResponsesData.count === 1 ? 'resposta' : 'respostas'}
            </span>
          </div>

          <div className="flex items-center border rounded-lg overflow-hidden">
            {/* Ordenar */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-none border-r h-9 px-3">
                  <ArrowUpDown className="w-4 h-4" />
                  Ordenar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  <Button
                    variant={sortBy === 'date' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSortBy('date')}
                  >
                    Data
                  </Button>
                  <Button
                    variant={sortBy === 'empresa' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSortBy('empresa')}
                  >
                    Empresa
                  </Button>
                  <Button
                    variant={sortBy === 'score' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSortBy('score')}
                  >
                    Nota
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filtros */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-none h-9 px-3">
                  <Filter className="w-4 h-4" />
                  Filtros
                  {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos" || pipelineFilter !== "todos") && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {[scoreFilter !== "todos", cardLinkFilter !== "todos", squadFilter !== "todos", pipelineFilter !== "todos"].filter(Boolean).length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Filtros</h4>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Categoria NPS</label>
                      <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as categorias</SelectItem>
                          <SelectItem value="promotor">Promotores (9-10)</SelectItem>
                          <SelectItem value="neutro">Neutros (7-8)</SelectItem>
                          <SelectItem value="detrator">Detratores (0-6)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Vinculação ao Card CSM</label>
                      <Select value={cardLinkFilter} onValueChange={setCardLinkFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          <SelectItem value="vinculado">
                            <div className="flex items-center gap-2">
                              <Link2 className="w-3 h-3" />
                              Vinculado
                            </div>
                          </SelectItem>
                          <SelectItem value="nao_vinculado">
                            <div className="flex items-center gap-2">
                              <Link2Off className="w-3 h-3" />
                              Não vinculado
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Squad</label>
                      <Select value={squadFilter} onValueChange={setSquadFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos os squads" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os squads</SelectItem>
                          <SelectItem value="sem_squad">Sem squad</SelectItem>
                          {squads.map(squad => (
                            <SelectItem key={squad.id} value={squad.name}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: squad.color }}
                                />
                                {squad.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Funil do Cliente</label>
                      <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos os funis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os funis</SelectItem>
                          {pipelines.map(pipeline => (
                            <SelectItem key={pipeline.id} value={pipeline.name}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos" || pipelineFilter !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScoreFilter("todos");
                          setCardLinkFilter("todos");
                          setSquadFilter("todos");
                          setPipelineFilter("todos");
                        }}
                        className="w-full h-7 text-xs"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Período */}
            <MonthYearPicker
              selectedPeriods={selectedPeriod}
              onPeriodsChange={setSelectedPeriod}
              singleSelect={true}
              minYear={2024}
              minMonth={1}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 px-4 md:px-6 py-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <ScrollArea className="w-full h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 h-full w-full" style={{ minHeight: 'calc(100vh - 180px)' }}>
              {NPS_STAGES.map((stage) => {
                const stageResponses = getResponsesForStage(stage);
                return (
                  <div
                    key={stage.id}
                    className="w-full bg-muted/30 rounded-lg flex flex-col"
                    style={{ minHeight: 'calc(100vh - 180px)' }}
                  >
                    <div 
                      className="p-3 rounded-t-lg flex-shrink-0"
                      style={{ backgroundColor: stage.color + '20' }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm" style={{ color: stage.color }}>
                          {stage.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {stageResponses.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Notas {stage.minScore} - {stage.maxScore}
                      </p>
                    </div>
                    <div className="p-3 flex-1">
                      {stageResponses.map((response) => (
                        <NPSCard key={response.id} response={response} />
                      ))}
                      {stageResponses.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Nenhuma resposta
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        ) : (
          <Card>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Sentimento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vínculo CSM</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponsesData.responses.map((response) => {
                    const linkedSquad = getSquadFromCardId(response.card_id);
                    const displaySquad = response.squad || linkedSquad || 'Indefinido';
                    const squadColor = getSquadColor(displaySquad !== 'Indefinido' ? displaySquad : null);
                    return (
                      <TableRow key={response.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(response)}>
                        <TableCell className="font-medium">{response.empresa}</TableCell>
                        <TableCell>{response.responsavel}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={squadColor ? { borderColor: squadColor, color: squadColor } : {}}
                          >
                            {displaySquad}
                          </Badge>
                        </TableCell>
                        <TableCell>{getScoreBadge(response.recomendacao)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{response.sentimento_sem_dot}</TableCell>
                        <TableCell>{formatDateUTC(response.created_at, "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          {response.card_id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs flex items-center gap-1"
                              onClick={(e) => handleOpenInCSM(response.card_id!, e)}
                            >
                              <Eye className="w-3 h-3" />
                              Abrir no CSM
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit text-muted-foreground">
                              <Link2Off className="w-3 h-3" />
                              Não vinculado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteResponse(response);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Resposta NPS</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Empresa</label>
                  <p className="font-medium">{selectedResponse.empresa}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Responsável</label>
                  <p className="font-medium">{selectedResponse.responsavel}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">E-mail</label>
                  <p className="font-medium">{selectedResponse.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Squad</label>
                  {selectedResponse.card_id ? (
                    <p className="font-medium">{getSquadFromCardId(selectedResponse.card_id) || selectedResponse.squad || 'Indefinido'}</p>
                  ) : (
                    <Select 
                      value={selectedResponse.squad || ''} 
                      onValueChange={(value) => handleSquadChange(selectedResponse.id, value)}
                    >
                      <SelectTrigger className="h-8 mt-1">
                        <SelectValue placeholder="Selecione o squad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinido">Indefinido</SelectItem>
                        {squads.map(squad => (
                          <SelectItem key={squad.id} value={squad.name}>{squad.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Data</label>
                  <p className="font-medium">
                    {formatDateUTC(selectedResponse.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Nota de Recomendação</label>
                <div className="mt-1">{getScoreBadge(selectedResponse.recomendacao)}</div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sentimento sem a DOT</label>
                <p className="font-medium">{selectedResponse.sentimento_sem_dot}</p>
              </div>

              {selectedResponse.observacoes && (
                <div>
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <p className="text-sm bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto">{selectedResponse.observacoes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                {selectedResponse.card_id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenInCSM(selectedResponse.card_id!)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Abrir no CSM
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkCardDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Vincular Card CSM
                  </Button>
                )}

                {profile?.role === 'admin' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setIsDialogOpen(false);
                      handleDeleteResponse(selectedResponse);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de vincular card */}
      <Dialog open={linkCardDialogOpen} onOpenChange={setLinkCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Card CSM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Selecione o card CSM</label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um card" />
                </SelectTrigger>
                <SelectContent>
                  {csmCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.company_name || card.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkCardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleLinkCard} disabled={!selectedCardId}>
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta resposta NPS de "{responseToDelete?.empresa}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}