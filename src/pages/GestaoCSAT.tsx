import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown, Filter, Link2, Link2Off, Trash2, Star, Frown, Meh, Smile, Users, Eye, ChevronDown, Headphones, BarChart3, Package, AlertCircle, UserCog, User, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { CSATRadarChart } from "@/components/csat/CSATRadarChart";

interface CSATResponse {
  id: string;
  empresa: string;
  responsavel: string;
  telefone: string;
  email?: string;
  tipo_reuniao?: string;
  nota_atendimento: number;
  nota_conteudo: number;
  nota_performance: number;
  recomendacao: number;
  observacoes: string | null;
  created_at: string;
  card_id: string | null;
  squad: string | null;
  nota_po: number | null;
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

interface CSATStage {
  id: string;
  name: string;
  color: string;
  minScore: number;
  maxScore: number;
}

// Escala 1-5: Insatisfeitos (1-2), Neutros (3), Satisfeitos (4-5)
const CSAT_STAGES: CSATStage[] = [
  { id: 'insatisfeito', name: 'Insatisfeitos', color: '#ef4444', minScore: 1, maxScore: 2 },
  { id: 'neutro', name: 'Neutros', color: '#f59e0b', minScore: 3, maxScore: 3 },
  { id: 'satisfeito', name: 'Satisfeitos', color: '#10b981', minScore: 4, maxScore: 5 },
];

export default function GestaoCSAT() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [responses, setResponses] = useState<CSATResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<CSATResponse | null>(null);
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
  const [responseToDelete, setResponseToDelete] = useState<CSATResponse | null>(null);
  const [sortBy, setSortBy] = useState<'empresa' | 'date' | 'score'>('date');
  const [linkCardDialogOpen, setLinkCardDialogOpen] = useState(false);
  const [csmCards, setCsmCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [cardSearchTerm, setCardSearchTerm] = useState<string>("");
  const [userCustomRole, setUserCustomRole] = useState<string | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineFilter, setPipelineFilter] = useState<string>("todos");
  const [allLinkedCards, setAllLinkedCards] = useState<any[]>([]);
  const [notaPODialogOpen, setNotaPODialogOpen] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<CSATResponse | null>(null);
  const [notaPOValue, setNotaPOValue] = useState<string>("");
  const [pendingSquad, setPendingSquad] = useState<string>("");

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
      // Buscar pipelines de CSM para o filtro
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
      // Buscar todos os cards vinculados a respostas CSAT (para o filtro por pipeline)
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
        .from('csat_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Erro ao buscar respostas CSAT:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as respostas CSAT.",
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
        .select('id, name')
        .eq('name', 'Clientes ativos')
        .maybeSingle();

      if (pipeline) {
        const { data: cards, error } = await supabase
          .from('csm_cards')
          .select('id, title, company_name, squad, stage_id, pipeline_id')
          .eq('pipeline_id', pipeline.id)
          .order('company_name', { ascending: true });
        
        if (error) {
          console.error('Erro ao buscar cards:', error);
          return;
        }
        
        console.log('Cards CSM carregados:', cards?.length, 'do pipeline:', pipeline.name);
        
        setCsmCards(cards || []);
        
        // Auto-vincular por nome da empresa
        autoLinkByCompanyName(cards || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cards CSM:', error);
    }
  };

  const autoLinkByCompanyName = async (cards: any[]) => {
    // Buscar respostas não vinculadas
    const { data: unlinkedResponses } = await supabase
      .from('csat_responses')
      .select('id, empresa, nota_atendimento, nota_conteudo, nota_performance')
      .is('card_id', null);

    if (!unlinkedResponses || unlinkedResponses.length === 0) return;

    for (const response of unlinkedResponses) {
      // Buscar card por nome da empresa
      const matchingCard = cards.find(card => 
        card.company_name?.toLowerCase().trim() === response.empresa?.toLowerCase().trim()
      );

      if (matchingCard) {
        // Vincular automaticamente
        await supabase
          .from('csat_responses')
          .update({ card_id: matchingCard.id })
          .eq('id', response.id);

        // Registrar no histórico do card CSM - escala 1-5
        const avgScore = ((response.nota_atendimento + response.nota_conteudo + response.nota_performance) / 3).toFixed(1);
        await supabase.from('csm_card_stage_history').insert({
          card_id: matchingCard.id,
          stage_id: matchingCard.stage_id,
          event_type: 'csat_linked',
          notes: `CSAT vinculado automaticamente. Empresa: ${response.empresa}. Média CSAT: ${avgScore}/5`,
          moved_by: null
        });
      }
    }

    // Recarregar respostas após auto-vinculação
    fetchResponses();
  };

  const getSquadFromCardId = (cardId: string | null): string | null => {
    if (!cardId) return null;
    const card = csmCards.find(c => c.id === cardId);
    return card?.squad || null;
  };

  const getSquadColor = (squadName: string | null): string => {
    if (!squadName) return '';
    const squad = squads.find(s => s.name.toLowerCase() === squadName.toLowerCase());
    return squad?.color || '';
  };

  const handleSquadChange = async (responseId: string, newSquad: string) => {
    try {
      const { error } = await supabase
        .from('csat_responses')
        .update({ squad: newSquad })
        .eq('id', responseId);

      if (error) throw error;
      
      setResponses(prev => prev.map(r => 
        r.id === responseId ? { ...r, squad: newSquad } : r
      ));
      
      if (selectedResponse?.id === responseId) {
        setSelectedResponse(prev => prev ? { ...prev, squad: newSquad } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar squad:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o squad.",
        variant: "destructive",
      });
    }
  };

  // Calcula média usando apenas as 3 notas (escala 1-5), arredondando para baixo
  const calculateAverageScore = (response: CSATResponse): number => {
    const avg = (response.nota_atendimento + response.nota_conteudo + response.nota_performance) / 3;
    return Math.floor(avg); // Sempre arredonda para baixo
  };

  // Categorização para escala 1-5
  const getScoreCategory = (score: number): string => {
    if (score <= 2) return 'insatisfeito';
    if (score === 3) return 'neutro';
    return 'satisfeito';
  };

  const filteredResponsesData = useMemo(() => {
    let filtered = responses;

    // Filtro de período
    if (selectedPeriod.length > 0) {
      filtered = filtered.filter(res => {
        const resDate = new Date(res.created_at);
        const resMonth = resDate.getMonth();
        const resYear = resDate.getFullYear();
        return selectedPeriod.some(p => p.month === resMonth && p.year === resYear);
      });
    }

    if (scoreFilter !== "todos") {
      filtered = filtered.filter(res => getScoreCategory(calculateAverageScore(res)) === scoreFilter);
    }

    if (cardLinkFilter === "vinculado") {
      filtered = filtered.filter(res => res.card_id !== null);
    } else if (cardLinkFilter === "nao_vinculado") {
      filtered = filtered.filter(res => res.card_id === null);
    }

    // Filtro de squad
    if (squadFilter !== "todos") {
      if (squadFilter === "sem_squad") {
        filtered = filtered.filter(res => {
          const linkedSquad = getSquadFromCardId(res.card_id);
          const displaySquad = res.squad || linkedSquad;
          return !displaySquad;
        });
      } else {
        filtered = filtered.filter(res => {
          const linkedSquad = getSquadFromCardId(res.card_id);
          const displaySquad = res.squad || linkedSquad;
          return displaySquad?.toLowerCase() === squadFilter.toLowerCase();
        });
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
        res.telefone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'empresa') {
        return a.empresa.localeCompare(b.empresa);
      } else if (sortBy === 'score') {
        return calculateAverageScore(b) - calculateAverageScore(a);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return {
      responses: sorted,
      count: sorted.length
    };
  }, [responses, searchTerm, scoreFilter, sortBy, cardLinkFilter, squadFilter, pipelineFilter, selectedPeriod, csmCards, allLinkedCards, pipelines]);

  const getResponsesForStage = (stage: CSATStage) => {
    return filteredResponsesData.responses.filter(res => {
      const avg = calculateAverageScore(res);
      return avg >= stage.minScore && avg <= stage.maxScore;
    });
  };

  const handleViewDetails = (response: CSATResponse) => {
    const linkedSquad = getSquadFromCardId(response.card_id);
    const displaySquad = response.squad || linkedSquad || null;
    
    // Verificar campos obrigatórios: nota_po, card_id, squad
    // Usar ! para cobrir tanto null quanto undefined
    const needsNotaPO = !response.nota_po && response.nota_po !== 0;
    const needsCardLink = !response.card_id;
    const needsSquad = !displaySquad;
    
    // Se qualquer campo obrigatório estiver faltando, mostrar dialog
    if (needsNotaPO || needsCardLink || needsSquad) {
      setPendingResponse(response);
      setNotaPOValue(response.nota_po?.toString() || "");
      setSelectedCardId(response.card_id || "");
      setPendingSquad(response.squad || "");
      setNotaPODialogOpen(true);
      return;
    }
    setSelectedResponse(response);
    setIsDialogOpen(true);
  };

  const handleSaveRequiredFields = async () => {
    if (!pendingResponse) return;
    
    // PRIMEIRO: Cliente CSM é SEMPRE obrigatório
    const finalCardId = selectedCardId || pendingResponse.card_id;
    if (!finalCardId) {
      toast({
        title: "Campo obrigatório",
        description: "É necessário vincular um cliente CSM primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    // SEGUNDO: Nota do PO só pode ser preenchida após vincular cliente
    const needsNotaPO = !pendingResponse.nota_po && pendingResponse.nota_po !== 0;
    if (needsNotaPO && !notaPOValue) {
      toast({
        title: "Campo obrigatório",
        description: "A Nota do PO é obrigatória.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar squad do card selecionado
    const selectedCard = csmCards.find(c => c.id === finalCardId);
    const cardHasSquad = selectedCard?.squad ? true : false;
    
    // Squad é obrigatório se o card CSM não tem squad definido
    if (!cardHasSquad && !pendingSquad && !pendingResponse.squad) {
      toast({
        title: "Campo obrigatório",
        description: "O cliente CSM selecionado não possui squad definido. É necessário atribuir um squad.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = {};
      
      if (notaPOValue) {
        const nota = parseInt(notaPOValue);
        if (nota < 1 || nota > 5) {
          toast({
            title: "Erro",
            description: "A nota deve ser entre 1 e 5.",
            variant: "destructive",
          });
          return;
        }
        updateData.nota_po = nota;
      }
      
      // Sempre atualizar card_id se foi selecionado um diferente
      if (selectedCardId && selectedCardId !== pendingResponse.card_id) {
        updateData.card_id = selectedCardId;
        // Atualizar empresa com o nome da empresa do card CSM
        const selectedCard = csmCards.find(c => c.id === selectedCardId);
        if (selectedCard?.company_name) {
          updateData.empresa = selectedCard.company_name;
        }
      }
      
      // Salvar squad se foi preenchido manualmente (quando card CSM não tem squad)
      if (pendingSquad) {
        updateData.squad = pendingSquad;
      }
      
      const { error } = await supabase
        .from('csat_responses')
        .update(updateData)
        .eq('id', pendingResponse.id);

      if (error) throw error;

      // Se vinculou a um card, registrar no histórico
      if (updateData.card_id) {
        const { data: stageData } = await supabase
          .from('csm_cards')
          .select('stage_id')
          .eq('id', updateData.card_id)
          .single();

        if (stageData) {
          const avgScore = calculateAverageScore(pendingResponse).toFixed(1);
          await supabase.from('csm_card_stage_history').insert({
            card_id: updateData.card_id,
            stage_id: stageData.stage_id,
            event_type: 'csat_linked',
            notes: `CSAT vinculado. Empresa: ${pendingResponse.empresa}. Média CSAT: ${avgScore}/5`,
            moved_by: profile?.user_id || null
          });
        }
      }

      // Atualizar o estado local
      const updatedResponse = { 
        ...pendingResponse, 
        nota_po: updateData.nota_po ?? pendingResponse.nota_po,
        card_id: updateData.card_id ?? pendingResponse.card_id,
        squad: updateData.squad ?? pendingResponse.squad,
        empresa: updateData.empresa ?? pendingResponse.empresa
      };
      setResponses(prev => prev.map(r => 
        r.id === pendingResponse.id ? updatedResponse : r
      ));

      // Fechar dialog e abrir detalhes
      setNotaPODialogOpen(false);
      setSelectedResponse(updatedResponse);
      setIsDialogOpen(true);
      setPendingResponse(null);
      setNotaPOValue("");
      setSelectedCardId("");
      setPendingSquad("");

      toast({
        title: "Sucesso",
        description: "Dados salvos com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar campos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResponse = (response: CSATResponse) => {
    setResponseToDelete(response);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!responseToDelete) return;

    try {
      const { error } = await supabase
        .from('csat_responses')
        .delete()
        .eq('id', responseToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Resposta CSAT deletada com sucesso.",
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
        .from('csat_responses')
        .update({ card_id: selectedCardId })
        .eq('id', selectedResponse.id);

      if (error) throw error;

      // Buscar nome do usuário para o registro
      let userName = 'Sistema';
      if (profile?.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', profile.user_id)
          .single();
        if (userData) userName = userData.name;
      }

      // Registrar no histórico do card CSM
      const { data: stageData } = await supabase
        .from('csm_cards')
        .select('stage_id')
        .eq('id', selectedCardId)
        .single();

      if (stageData) {
        const avgScore = calculateAverageScore(selectedResponse).toFixed(1);
        await supabase.from('csm_card_stage_history').insert({
          card_id: selectedCardId,
          stage_id: stageData.stage_id,
          event_type: 'csat_linked',
          notes: `CSAT vinculado manualmente por ${userName}. Empresa: ${selectedResponse.empresa}. Média CSAT: ${avgScore}/5`,
          moved_by: profile?.user_id || null
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

  // Ícones para escala 1-5
  const getScoreIcon = (score: number) => {
    if (score <= 2) return <Frown className="w-4 h-4 text-red-500" />;
    if (score <= 3) return <Meh className="w-4 h-4 text-yellow-500" />;
    return <Smile className="w-4 h-4 text-green-500" />;
  };

  const getScoreBadge = (score: number) => {
    const category = getScoreCategory(score);
    const config = {
      insatisfeito: { variant: "destructive" as const, label: "Insatisfeito" },
      neutro: { variant: "secondary" as const, label: "Neutro" },
      satisfeito: { variant: "default" as const, label: "Satisfeito" },
    };

    return (
      <Badge variant={config[category].variant} className="flex items-center gap-1 w-fit">
        {getScoreIcon(score)}
        {score} - {config[category].label}
      </Badge>
    );
  };

  // Renderiza 5 estrelas para escala 1-5
  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < score ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  const handleOpenInCSM = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/?tab=csm&openCard=${cardId}`);
  };

  // Verifica se é Check-in (notas podem ser diferentes) ou outra reunião (nota única)
  const isCheckIn = (response: CSATResponse): boolean => {
    return response.tipo_reuniao === "Check-in";
  };

  const CSATCard = ({ response }: { response: CSATResponse }) => {
    const avgScore = calculateAverageScore(response);
    const linkedSquad = getSquadFromCardId(response.card_id);
    const displaySquad = response.squad || linkedSquad || null;
    const squadColor = getSquadColor(displaySquad);
    const needsNotaPO = !response.nota_po && response.nota_po !== 0;
    const needsCardLink = !response.card_id;
    const needsSquad = !displaySquad;
    const hasAlerts = needsNotaPO || needsCardLink || needsSquad;
    
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
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">{response.empresa}</h4>
                {/* Alertas ao lado do nome */}
                {needsNotaPO && (
                  <div className="flex items-center gap-1 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: '#EC4A55' }}>
                    <AlertCircle className="w-2.5 h-2.5" />
                    PO
                  </div>
                )}
                {needsCardLink && (
                  <div className="flex items-center gap-1 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                    <Link2Off className="w-2.5 h-2.5" />
                    CSM
                  </div>
                )}
                {needsSquad && (
                  <div className="flex items-center gap-1 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: '#8b5cf6' }}>
                    <Users className="w-2.5 h-2.5" />
                    Squad
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{response.responsavel}</p>
            </div>
            {/* Notas: PO à esquerda, Cliente à direita */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Nota do PO */}
              <div className="flex items-center gap-1.5" title="Nota do PO">
                <UserCog className="w-5 h-5" style={{ color: '#EC4A55' }} />
                {needsNotaPO ? (
                  <HelpCircle className="w-5 h-5" style={{ color: '#EC4A55' }} />
                ) : (
                  <span className="text-xl font-bold" style={{ color: '#EC4A55' }}>{response.nota_po}</span>
                )}
              </div>
              {/* Nota do Cliente - blur se nota_po não preenchida */}
              <div className={`flex items-center gap-1.5 ${needsNotaPO ? 'blur-sm select-none' : ''}`} title={needsNotaPO ? "Preencha a nota do PO para visualizar" : "Nota do Cliente"}>
                <User className="w-5 h-5" style={{ color: CSAT_STAGES.find(s => avgScore >= s.minScore && avgScore <= s.maxScore)?.color }} />
                <span className="text-xl font-bold" style={{ color: CSAT_STAGES.find(s => avgScore >= s.minScore && avgScore <= s.maxScore)?.color }}>
                  {avgScore}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground mb-2">
            {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          
          {/* Notas no card - condicional baseado no tipo de reunião - blur se nota_po não preenchida */}
          {isCheckIn(response) ? (
            // Check-in: mostra as 3 notas individuais
            <div className={`flex items-center gap-3 mb-2 text-xs ${needsNotaPO ? 'blur-sm select-none' : ''}`} title={needsNotaPO ? "Preencha a nota do PO para visualizar" : undefined}>
              <div className="flex items-center gap-1" title="Atendimento">
                <Headphones className="w-3 h-3 text-blue-500" />
                <span className="font-medium">{response.nota_atendimento}</span>
              </div>
              <div className="flex items-center gap-1" title="Campanhas">
                <BarChart3 className="w-3 h-3 text-purple-500" />
                <span className="font-medium">{response.nota_performance}</span>
              </div>
              <div className="flex items-center gap-1" title="Entregas">
                <Package className="w-3 h-3 text-green-500" />
                <span className="font-medium">{response.nota_conteudo}</span>
              </div>
            </div>
          ) : (
            // Outras reuniões: mostra apenas a nota única
            <div className={`flex items-center gap-2 mb-2 text-xs ${needsNotaPO ? 'blur-sm select-none' : ''}`} title={needsNotaPO ? "Preencha a nota do PO para visualizar" : undefined}>
              <span className="text-muted-foreground">Nota da reunião:</span>
              <span className="font-medium">{response.nota_atendimento}</span>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-2">
            {response.tipo_reuniao && (
              <Badge variant="secondary" className="h-6 px-2.5 text-xs rounded-full">
                {response.tipo_reuniao}
              </Badge>
            )}
            <Badge 
              variant={squadColor ? "outline" : "secondary"}
              className={`h-6 px-2.5 text-xs rounded-full flex items-center gap-1.5 ${!squadColor ? 'bg-muted-foreground/60 text-white border-0' : ''}`}
              style={squadColor ? { borderColor: squadColor, color: squadColor } : {}}
            >
              <Users className="w-3 h-3" />
              {displaySquad || 'Indefinido'}
            </Badge>
            {response.card_id ? (
              <Badge 
                variant="outline" 
                className="h-6 px-2.5 text-xs rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-accent transition-colors"
                onClick={(e) => handleOpenInCSM(response.card_id!, e)}
              >
                <Eye className="w-3 h-3" />
                Abrir no CSM
              </Badge>
            ) : (
              <Badge variant="outline" className="h-6 px-2.5 text-xs rounded-full flex items-center gap-1.5 text-muted-foreground">
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
                      Nota Média
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
                      <label className="text-xs text-muted-foreground">Categoria CSAT</label>
                      <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          <SelectItem value="satisfeito">Satisfeitos</SelectItem>
                          <SelectItem value="neutro">Neutros</SelectItem>
                          <SelectItem value="insatisfeito">Insatisfeitos</SelectItem>
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
                singleSelect={true}
                minYear={2024}
                minMonth={1}
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

          {/* Barra de ações estilo referência */}
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
                    Nota Média
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
                  {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos") && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {[scoreFilter !== "todos", cardLinkFilter !== "todos", squadFilter !== "todos"].filter(Boolean).length}
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
                      <label className="text-xs text-muted-foreground">Categoria CSAT</label>
                      <Select value={scoreFilter} onValueChange={setScoreFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as categorias</SelectItem>
                          <SelectItem value="satisfeito">Satisfeitos (4-5)</SelectItem>
                          <SelectItem value="neutro">Neutros (3)</SelectItem>
                          <SelectItem value="insatisfeito">Insatisfeitos (1-2)</SelectItem>
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

                    {(scoreFilter !== "todos" || cardLinkFilter !== "todos" || squadFilter !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScoreFilter("todos");
                          setCardLinkFilter("todos");
                          setSquadFilter("todos");
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
              {CSAT_STAGES.map((stage) => {
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
                        Média {stage.minScore} - {stage.maxScore}
                      </p>
                    </div>
                    <div className="p-3 flex-1">
                      {stageResponses.map((response) => (
                        <CSATCard key={response.id} response={response} />
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
          </ScrollArea>
        )}
                    const avgScore = calculateAverageScore(response);
                    const linkedSquad = getSquadFromCardId(response.card_id);
                    const displaySquad = response.squad || linkedSquad || 'Indefinido';
                    const squadColor = getSquadColor(displaySquad !== 'Indefinido' ? displaySquad : null);
                    const isCheckInResponse = isCheckIn(response);
                    return (
                      <TableRow key={response.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(response)}>
                        <TableCell className="font-medium">{response.empresa}</TableCell>
                        <TableCell>{response.responsavel}</TableCell>
                        <TableCell>
                          {response.tipo_reuniao ? (
                            <Badge variant="secondary" className="text-xs">{response.tipo_reuniao}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={squadColor ? { borderColor: squadColor, color: squadColor } : {}}
                          >
                            {displaySquad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isCheckInResponse ? (
                            <div className="flex flex-col gap-1">
                              {getScoreBadge(avgScore)}
                              <span className="text-xs text-muted-foreground">
                                ({response.nota_atendimento}/{response.nota_performance}/{response.nota_conteudo})
                              </span>
                            </div>
                          ) : (
                            getScoreBadge(response.nota_atendimento)
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(response.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
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
                          {canDelete && (
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
                          )}
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
            <DialogTitle>Detalhes da Resposta CSAT</DialogTitle>
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
                  <label className="text-xs text-muted-foreground">Data</label>
                  <p className="font-medium">
                    {format(new Date(selectedResponse.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {selectedResponse.tipo_reuniao && (
                  <div>
                    <label className="text-xs text-muted-foreground">Tipo de Reunião</label>
                    <p className="font-medium">{selectedResponse.tipo_reuniao}</p>
                  </div>
                )}
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
                  <label className="text-xs text-muted-foreground">Nota do PO</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {selectedResponse.nota_po}/5
                    </Badge>
                    {renderStars(selectedResponse.nota_po || 0)}
                  </div>
                </div>
              </div>

              {/* Conteúdo condicional baseado no tipo de reunião */}
              {isCheckIn(selectedResponse) ? (
                // Check-in: gráfico radar + 3 notas
                <>
                  <div className="border rounded-lg p-3">
                    <label className="text-xs text-muted-foreground mb-2 block">Análise Dimensional</label>
                    <CSATRadarChart 
                      atendimento={selectedResponse.nota_atendimento}
                      campanhas={selectedResponse.nota_performance}
                      entregas={selectedResponse.nota_conteudo}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Média Geral</label>
                    <div className="mt-1">{getScoreBadge(calculateAverageScore(selectedResponse))}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Headphones className="w-3 h-3 text-blue-500" />
                        Atendimento
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold">{selectedResponse.nota_atendimento}</span>
                        {renderStars(selectedResponse.nota_atendimento)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-purple-500" />
                        Campanhas
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold">{selectedResponse.nota_performance}</span>
                        {renderStars(selectedResponse.nota_performance)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3 text-green-500" />
                        Entregas
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold">{selectedResponse.nota_conteudo}</span>
                        {renderStars(selectedResponse.nota_conteudo)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Outras reuniões: só a nota única
                <div>
                  <label className="text-xs text-muted-foreground">Nota da Reunião</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getScoreBadge(selectedResponse.nota_atendimento)}
                    <div className="flex items-center gap-2 ml-2">
                      {renderStars(selectedResponse.nota_atendimento)}
                    </div>
                  </div>
                </div>
              )}

              {selectedResponse.observacoes && (
                <div>
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedResponse.observacoes}</p>
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

                {canDelete && (
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
      <Dialog open={linkCardDialogOpen} onOpenChange={(open) => {
        setLinkCardDialogOpen(open);
        if (!open) {
          setCardSearchTerm("");
          setSelectedCardId("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Card CSM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Buscar cliente</label>
              <Input
                placeholder="Digite o nome do cliente (ex: Itiban)..."
                value={cardSearchTerm}
                onChange={(e) => setCardSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            
            {/* Lista de resultados */}
            <div className="border rounded-md max-h-[250px] overflow-y-auto">
              {csmCards
                .filter(card => 
                  !cardSearchTerm || 
                  (card.company_name || card.title || '').toLowerCase().includes(cardSearchTerm.toLowerCase())
                )
                .slice(0, 50) // Limitar para performance
                .map((card) => {
                  const isSelected = selectedCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium">{card.company_name || card.title}</div>
                      {card.squad && (
                        <div className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          Squad: {card.squad}
                        </div>
                      )}
                    </div>
                  );
                })}
              {csmCards.filter(card => 
                !cardSearchTerm || 
                (card.company_name || card.title || '').toLowerCase().includes(cardSearchTerm.toLowerCase())
              ).length === 0 && (
                <div className="px-3 py-4 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              )}
              {csmCards.filter(card => 
                !cardSearchTerm || 
                (card.company_name || card.title || '').toLowerCase().includes(cardSearchTerm.toLowerCase())
              ).length > 50 && (
                <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted">
                  Mostrando 50 de {csmCards.filter(card => 
                    !cardSearchTerm || 
                    (card.company_name || card.title || '').toLowerCase().includes(cardSearchTerm.toLowerCase())
                  ).length} resultados. Digite para filtrar.
                </div>
              )}
            </div>

            {selectedCardId && (
              <div className="text-sm text-muted-foreground">
                Selecionado: <span className="font-medium text-foreground">
                  {csmCards.find(c => c.id === selectedCardId)?.company_name || 
                   csmCards.find(c => c.id === selectedCardId)?.title}
                </span>
              </div>
            )}

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
              Tem certeza que deseja excluir esta resposta CSAT de "{responseToDelete?.empresa}"? Esta ação não pode ser desfeita.
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

      {/* Dialog de campos obrigatórios */}
      <Dialog open={notaPODialogOpen} onOpenChange={(open) => {
        if (!open) {
          setNotaPODialogOpen(false);
          setPendingResponse(null);
          setNotaPOValue("");
          setSelectedCardId("");
          setPendingSquad("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Campos Obrigatórios
            </DialogTitle>
          </DialogHeader>
          {pendingResponse && (() => {
            const needsNotaPO = !pendingResponse.nota_po && pendingResponse.nota_po !== 0;
            
            // Verificar se o card selecionado (ou existente) tem squad
            const cardIdToCheck = selectedCardId || pendingResponse.card_id;
            const selectedCard = cardIdToCheck ? csmCards.find(c => c.id === cardIdToCheck) : null;
            const cardHasSquad = selectedCard?.squad ? true : false;
            const needsSquadInput = selectedCard && !cardHasSquad && !pendingResponse.squad;
            
            // Verificar se tem cliente vinculado (para habilitar nota_po)
            const hasLinkedClient = !!(selectedCardId || pendingResponse.card_id);
            
            return (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{pendingResponse.empresa}</p>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {!hasLinkedClient 
                    ? "Primeiro, vincule um cliente CSM para liberar o preenchimento da nota do PO:"
                    : "Para visualizar os detalhes deste card, preencha os campos obrigatórios:"
                  }
                </p>
                
                {/* Cliente CSM - sempre exibido primeiro */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    Cliente CSM
                    <span className="text-destructive">*</span>
                  </label>
                  <Select value={selectedCardId || pendingResponse.card_id || ""} onValueChange={(value) => {
                    setSelectedCardId(value);
                    // Limpar squad pendente quando mudar o card
                    setPendingSquad("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
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

                {/* Mostrar mensagem se card selecionado tem squad */}
                {selectedCard && cardHasSquad && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Squad do cliente: <strong>{selectedCard.squad}</strong>
                    </p>
                  </div>
                )}

                {/* Mostrar campo squad APENAS se cliente selecionado não tem squad */}
                {needsSquadInput && (
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                      Squad
                      <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-amber-600 mb-2">
                      O cliente CSM não possui squad definido. É necessário atribuir um.
                    </p>
                    <Select value={pendingSquad} onValueChange={setPendingSquad}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o squad" />
                      </SelectTrigger>
                      <SelectContent>
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
                )}

                {/* Nota do PO - só exibe após cliente CSM ser selecionado */}
                {needsNotaPO && hasLinkedClient && (
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <UserCog className="w-4 h-4" style={{ color: '#EC4A55' }} />
                      Nota do PO
                      <span className="text-destructive">*</span>
                    </label>
                    <Select value={notaPOValue} onValueChange={setNotaPOValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma nota de 1 a 5" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Muito insatisfeito</SelectItem>
                        <SelectItem value="2">2 - Insatisfeito</SelectItem>
                        <SelectItem value="3">3 - Neutro</SelectItem>
                        <SelectItem value="4">4 - Satisfeito</SelectItem>
                        <SelectItem value="5">5 - Muito satisfeito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setNotaPODialogOpen(false);
                      setPendingResponse(null);
                      setNotaPOValue("");
                      setSelectedCardId("");
                      setPendingSquad("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveRequiredFields}>
                    Salvar e Visualizar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
