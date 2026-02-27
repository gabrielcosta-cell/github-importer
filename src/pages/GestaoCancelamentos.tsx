import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, FileText, CheckCircle, XCircle, Clock, Trash2, LayoutGrid, List, ArrowUpDown, Filter, Link2, Link2Off, ExternalLink, ChevronDown, Users, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { CancellationRequest, CancellationStage, StageNotes } from "@/components/cancellation/CancellationKanbanBoard";
import { CancellationList } from "@/components/cancellation/CancellationList";
import { LinkCardDialog } from "@/components/cancellation/LinkCardDialog";
import { LostReasonDialog } from "@/components/kanban/LostReasonDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, rectIntersection, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { StageRequirementsDialog, StageRequirement } from "@/components/cancellation/StageRequirementsDialog";
import { FinalOutcomeButtons, FinalOutcomeBadge } from "@/components/cancellation/FinalOutcomeButtons";
import { useChurnStageValidation, ChurnStage } from "@/hooks/useChurnStageValidation";
import { CardDetailsEditableSections } from "@/components/cancellation/CardDetailsEditableSections";

const CANCELLATION_STAGES: CancellationStage[] = [
  { id: 'nova', name: 'Novas Solicitações', color: '#3b82f6' },
  { id: 'triagem', name: 'Triagem', color: '#f59e0b' },
  { id: 'aguardando_briefings', name: 'Aguardando Briefings', color: '#8b5cf6' },
  { id: 'analise_briefings', name: 'Análise de Briefings', color: '#ec4899' },
  { id: 'call_agendada', name: 'Call de Retenção Agendada', color: '#10b981' },
  { id: 'call_realizada', name: 'Call de Retenção Realizada', color: '#06b6d4' },
];

export default function GestaoCancelamentos() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [attachments, setAttachments] = useState<Record<string, any[]>>({});
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [cardLinkFilter, setCardLinkFilter] = useState<string>("todos");
  const [currentStageNotes, setCurrentStageNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<CancellationRequest | null>(null);
  const [sortBy, setSortBy] = useState<'empresa' | 'date' | 'status'>('date');
  const [linkCardDialogOpen, setLinkCardDialogOpen] = useState(false);
  const [lostReasonDialogOpen, setLostReasonDialogOpen] = useState(false);
  const [requestToChurn, setRequestToChurn] = useState<CancellationRequest | null>(null);
  const requestToChurnRef = useRef<CancellationRequest | null>(null);
  const [userCustomRole, setUserCustomRole] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);
  const [csmCards, setCsmCards] = useState<any[]>([]);
  const [squads, setSquads] = useState<{ id: string; name: string; color: string }[]>([]);
  
  // Drag and drop states
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedRequest, setDraggedRequest] = useState<CancellationRequest | null>(null);
  const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ request: CancellationRequest; targetStage: ChurnStage } | null>(null);
  const [pendingRequirements, setPendingRequirements] = useState<StageRequirement[]>([]);
  
  const { getRequirementsForStage, canMoveToStage } = useChurnStageValidation();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    // Corrigir cards com stage inválido (UUIDs salvos por erro)
    const fixInvalidStages = async () => {
      const validStages = ['nova', 'triagem', 'aguardando_briefings', 'analise_briefings', 'call_agendada', 'call_realizada'];
      
      // Buscar cards com stage inválido
      const { data: invalidCards } = await supabase
        .from('cancellation_requests')
        .select('id, stage')
        .not('stage', 'in', `(${validStages.join(',')})`);
      
      if (invalidCards && invalidCards.length > 0) {
        console.log('Corrigindo cards com stage inválido:', invalidCards.length);
        
        for (const card of invalidCards) {
          await supabase
            .from('cancellation_requests')
            .update({ stage: 'nova', updated_at: new Date().toISOString() })
            .eq('id', card.id);
        }
      }
    };
    
    // Sincronizar nomes das empresas com os cards do CSM vinculados
    const syncCompanyNames = async () => {
      // Buscar todas as solicitações que têm card_id vinculado
      const { data: requestsWithCards } = await supabase
        .from('cancellation_requests')
        .select('id, card_id, empresa')
        .not('card_id', 'is', null);
      
      if (!requestsWithCards || requestsWithCards.length === 0) return;
      
      // Buscar os cards do CSM correspondentes
      const cardIds = requestsWithCards.map((r: any) => r.card_id).filter(Boolean);
      const { data: csmCards } = await supabase
        .from('csm_cards')
        .select('id, title, company_name')
        .in('id', cardIds);
      
      if (!csmCards || csmCards.length === 0) return;
      
      // Criar mapa de card_id -> nome da empresa
      const cardNameMap = new Map<string, string>();
      csmCards.forEach((card: any) => {
        const name = card.company_name || card.title;
        if (name) cardNameMap.set(card.id, name);
      });
      
      // Atualizar as solicitações cujo nome está diferente (usando campo 'empresa' do banco externo)
      let updatedCount = 0;
      for (const request of requestsWithCards) {
        const csmName = cardNameMap.get((request as any).card_id!);
        if (csmName && csmName !== (request as any).empresa) {
          await supabase
            .from('cancellation_requests')
            .update({ empresa: csmName, updated_at: new Date().toISOString() })
            .eq('id', request.id);
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        console.log(`Sincronizados ${updatedCount} nomes de empresas com cards do CSM`);
      }
    };
    
    fixInvalidStages();
    syncCompanyNames();
    fetchRequests();
    fetchCSMCards();
    fetchSquads();
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

  const fetchCSMCards = async () => {
    try {
      // Primeiro buscar todos os card_ids vinculados às solicitações de cancelamento
      const { data: linkedRequests } = await supabase
        .from('cancellation_requests')
        .select('card_id')
        .not('card_id', 'is', null);
      
      const linkedCardIds = linkedRequests?.map(r => r.card_id).filter(Boolean) || [];
      
      // Buscar cards de pipelines relevantes E cards vinculados diretamente
      const { data: pipelines } = await supabase
        .from('csm_pipelines')
        .select('id')
        .in('name', ['Clientes ativos', 'Clientes Perdidos']);

      let allCards: any[] = [];
      
      if (pipelines && pipelines.length > 0) {
        const pipelineIds = pipelines.map(p => p.id);
        const { data: pipelineCards } = await supabase
          .from('csm_cards')
          .select('id, title, company_name, squad')
          .in('pipeline_id', pipelineIds);
        
        allCards = pipelineCards || [];
      }
      
      // Buscar cards vinculados que podem não estar nos pipelines acima
      if (linkedCardIds.length > 0) {
        const existingIds = new Set(allCards.map(c => c.id));
        const missingIds = linkedCardIds.filter(id => !existingIds.has(id));
        
        if (missingIds.length > 0) {
          const { data: linkedCards } = await supabase
            .from('csm_cards')
            .select('id, title, company_name, squad')
            .in('id', missingIds);
          
          if (linkedCards) {
            allCards = [...allCards, ...linkedCards];
          }
        }
      }
      
      setCsmCards(allCards);
    } catch (error) {
      console.error('Erro ao buscar cards CSM:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select('*')
        .order('created_at', { ascending: false});

      if (error) throw error;

      // Normalizar campos do banco externo (responsavel/empresa/email → client_name/contract_name/client_email)
      const normalizedData = (data || []).map((req: any) => ({
        ...req,
        client_name: req.client_name ?? req.responsavel ?? '',
        contract_name: req.contract_name ?? req.empresa ?? '',
        client_email: req.client_email ?? req.email ?? null,
        // Mapear observacoes do banco externo para observations do frontend
        observations: req.observations ?? req.observacoes ?? '',
        // Garantir que stage_notes seja um objeto (pode vir como string JSON do banco)
        stage_notes: typeof req.stage_notes === 'string' 
          ? JSON.parse(req.stage_notes) 
          : (req.stage_notes || {}),
      }));

      setRequests(normalizedData);
      
      // Buscar attachments de todas as solicitações
      const requestIds = normalizedData.map(r => r.id);
      if (requestIds.length > 0) {
        const { data: attachmentsData } = await supabase
          .from('cancellation_attachments')
          .select('request_id, attachment_type, file_name')
          .in('request_id', requestIds);
        
        if (attachmentsData) {
          const groupedAttachments: Record<string, any[]> = {};
          attachmentsData.forEach(att => {
            if (!groupedAttachments[att.request_id]) {
              groupedAttachments[att.request_id] = [];
            }
            groupedAttachments[att.request_id].push(att);
          });
          setAttachments(groupedAttachments);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as solicitações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const request = requests.find(r => r.id === active.id);
    setDraggedRequest(request || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedRequest(null);

    console.log('🔄 handleDragEnd called', { active: active?.id, over: over?.id });

    if (!over) {
      console.log('❌ No over target');
      return;
    }

    // Se soltou sobre si mesmo, ignorar
    if (active.id === over.id) {
      console.log('⏹️ Dropped on self, ignoring');
      return;
    }

    const requestId = active.id as string;
    const overId = over.id as string;

    console.log('🔍 Looking for request:', requestId);
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      console.log('❌ Request not found');
      return;
    }

    console.log('✅ Found request:', request.contract_name, 'stage:', request.stage, 'card_id:', request.card_id, 'squad:', request.squad);

    const currentStage = request.stage as ChurnStage;
    
    // Determinar o stage de destino
    // Se overId é um stage válido, usar diretamente
    // Senão, verificar se é outro card e pegar o stage dele
    let targetStage: ChurnStage | undefined;
    
    const validStageIds = CANCELLATION_STAGES.map(s => s.id);
    if (validStageIds.includes(overId)) {
      targetStage = overId as ChurnStage;
      console.log('🎯 Target is a stage:', targetStage);
    } else {
      // É um card - buscar o stage do card de destino
      const overRequest = requests.find(r => r.id === overId);
      if (overRequest) {
        targetStage = overRequest.stage as ChurnStage;
        console.log('🎯 Target is a card in stage:', targetStage);
      } else {
        // Não encontrou nem stage nem card válido
        console.log('❌ Invalid target - neither stage nor card');
        return;
      }
    }

    // Se for a mesma etapa, não faz nada
    if (currentStage === targetStage) {
      console.log('⏹️ Same stage, no action needed');
      return;
    }

    console.log('➡️ Moving from', currentStage, 'to', targetStage);

    // Verificar pré-requisitos
    const requestAttachments = attachments[request.id] || [];

    // IMPORTANTE: vamos validar/mover usando um request "efetivo".
    // Ex.: em Triagem, o squad pode vir do card do CSM mesmo que request.squad esteja null.
    let requestForValidation: CancellationRequest = request;
    
    // Caso especial: mover para triagem precisa de card_id e squad
    if (targetStage === 'triagem') {
      console.log('🔍 Checking triagem requirements...');
      console.log('  card_id:', request.card_id);
      console.log('  squad:', request.squad);
      
      if (!request.card_id) {
        console.log('❌ No card_id - opening link dialog');
        // Não tem card vinculado - abrir dialog de vinculação
        setRequestToChurn(request);
        requestToChurnRef.current = request;
        setLinkCardDialogOpen(true);
        toast({
          title: "Vincular Card CSM",
          description: "Para mover para Triagem, é necessário vincular o card ao CSM.",
        });
        return;
      }
      
      // Tem card vinculado, mas precisa verificar squad
      const squadFromCard = getSquadFromCardId(request.card_id);
      console.log('  squadFromCard:', squadFromCard);
      const currentSquad = request.squad || squadFromCard;
      console.log('  currentSquad:', currentSquad);
      
      if (!currentSquad) {
        console.log('❌ No squad defined anywhere');
        // Nem a solicitação nem o card CSM tem squad definido
        toast({
          title: "Squad não definido",
          description: "O card CSM vinculado não possui squad. Defina o squad no card do CSM ou na solicitação.",
          variant: "destructive",
        });
        return;
      }

      // Garantir que a validação use o squad derivado
      requestForValidation = {
        ...request,
        squad: currentSquad,
      };
      
      // Se a solicitação não tem squad mas o card CSM tem, copiar o squad
      if (!request.squad && squadFromCard) {
        console.log('📋 Copying squad from CSM card:', squadFromCard);
        await supabase
          .from('cancellation_requests')
          .update({ squad: squadFromCard, updated_at: new Date().toISOString() })
          .eq('id', request.id);

        // Atualizar estado local para evitar bloquear novamente antes do refresh
        setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, squad: squadFromCard } : r)));

        // Manter o request usado na validação consistente
        requestForValidation = {
          ...requestForValidation,
          squad: squadFromCard,
        };
      }
      
      console.log('✅ Triagem requirements OK');
    }

    const { valid, requirements, missingFields } = getRequirementsForStage(targetStage, requestForValidation, requestAttachments);
    console.log('📋 Stage requirements check:', { valid, requirementsCount: requirements.length, missingFields });

    if (!valid && requirements.length > 0) {
      console.log('⚠️ Opening requirements dialog');
      // Abrir dialog para preencher os campos faltantes
      setPendingMove({ request: requestForValidation, targetStage });
      setPendingRequirements(requirements);
      setRequirementsDialogOpen(true);
      return;
    }

    if (!valid && missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      toast({
        title: "Pré-requisitos não atendidos",
        description: `Faltando: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    console.log('✅ All checks passed, moving card...');
    // Mover diretamente
    await moveCardToStage(request.id, targetStage!);
  };

  const moveCardToStage = async (requestId: string, targetStage: ChurnStage) => {
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({ 
          stage: targetStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Card movido com sucesso.",
      });

      fetchRequests();
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: "Erro",
        description: "Não foi possível mover o card.",
        variant: "destructive",
      });
    }
  };

  const handleRequirementsSubmit = async (values: Record<string, any>, files?: File[]) => {
    if (!pendingMove) return;

    const { request, targetStage } = pendingMove;

    try {
      // Atualizar campos no request
      const updates: Record<string, any> = {
        stage: targetStage,
        updated_at: new Date().toISOString(),
      };

      // Mapear campos do formulário para colunas do banco
      if (values.financial_analysis) {
        updates.financial_analysis = values.financial_analysis;
      }
      if (values.google_meet_link) {
        updates.google_meet_link = values.google_meet_link;
      }
      if (values.meetrox_link) {
        updates.meetrox_link = values.meetrox_link;
      }
      if (values.meeting_notes) {
        updates.meeting_notes = values.meeting_notes;
      }

      console.log('[Churn] Atualizando request:', request.id, 'updates:', updates);

      // Atualizar o request
      const { error } = await supabase
        .from('cancellation_requests')
        .update(updates)
        .eq('id', request.id);

      if (error) {
        console.error('[Churn] Erro ao atualizar request:', error);
        throw error;
      }

      // Upload de arquivos se houver
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = `${request.id}/${Date.now()}_${file.name}`;
          
          console.log('[Churn] Fazendo upload do arquivo:', file.name, 'para:', filePath);
          
          const { error: uploadError } = await supabase.storage
            .from('cancellation-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('[Churn] Erro ao fazer upload:', uploadError);
            toast({
              title: "Aviso",
              description: `Erro ao enviar arquivo "${file.name}": ${uploadError.message}`,
              variant: "destructive",
            });
            continue;
          }

          // Determinar o tipo de anexo baseado no campo
          let attachmentType = 'documento';
          if (pendingRequirements.some(r => r.field === 'contrato_file')) {
            attachmentType = 'contrato';
          } else if (pendingRequirements.some(r => r.field === 'briefing_request_file')) {
            attachmentType = 'solicitacao_briefing';
          } else if (pendingRequirements.some(r => r.field === 'churn_briefing_file')) {
            attachmentType = 'briefing_churn';
          }

          // Registrar o attachment no banco
          const { error: attachError } = await supabase
            .from('cancellation_attachments')
            .insert({
              request_id: request.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              attachment_type: attachmentType,
              uploaded_by: profile?.user_id,
            });
          
          if (attachError) {
            console.error('[Churn] Erro ao registrar attachment:', attachError);
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Card movido e dados salvos com sucesso.",
      });

      setRequirementsDialogOpen(false);
      setPendingMove(null);
      setPendingRequirements([]);
      fetchRequests();
    } catch (error: any) {
      console.error('[Churn] Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar os dados. ${error?.message || ''}`,
        variant: "destructive",
      });
    }
  };

  const handleFinalOutcomeChange = async (requestId: string, outcome: 'revertido' | 'cancelado' | null) => {
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({
          final_result: outcome,
          result_registered_at: outcome ? new Date().toISOString() : null,
          result_registered_by: outcome ? profile?.user_id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: outcome === 'revertido' 
          ? "Cliente marcado como revertido!" 
          : outcome === 'cancelado' 
            ? "Cancelamento confirmado." 
            : "Resultado removido.",
      });

      fetchRequests();
      
      // Atualizar o selectedRequest se estiver aberto
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, final_result: outcome } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar resultado:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o resultado.",
        variant: "destructive",
      });
    }
  };

  const filteredRequestsData = useMemo(() => {
    let filtered = requests;

    // Filtro por período
    if (selectedPeriod.length > 0) {
      filtered = filtered.filter(req => {
        const date = new Date(req.created_at);
        const reqMonth = date.getMonth();
        const reqYear = date.getFullYear();
        return selectedPeriod.some(p => p.month === reqMonth && p.year === reqYear);
      });
    }

    if (statusFilter !== "todos") {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (stageFilter !== "todos") {
      filtered = filtered.filter(req => req.stage === stageFilter);
    }

    if (cardLinkFilter === "vinculado") {
      filtered = filtered.filter(req => req.card_id !== null);
    } else if (cardLinkFilter === "nao_vinculado") {
      filtered = filtered.filter(req => req.card_id === null);
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        (req.contract_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.client_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.client_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'empresa') {
        return (a.contract_name || '').localeCompare(b.contract_name || '');
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return {
      requests: sorted,
      count: sorted.length
    };
  }, [requests, searchTerm, statusFilter, stageFilter, sortBy, cardLinkFilter, selectedPeriod]);

  const getRequestsForStage = (stage: CancellationStage) => {
    return filteredRequestsData.requests.filter(req => req.stage === stage.id);
  };

  const getSquadFromCardId = (cardId: string | null): string | null => {
    if (!cardId) return null;
    console.log('🔎 getSquadFromCardId - looking for:', cardId);
    console.log('🔎 csmCards count:', csmCards.length);
    const card = csmCards.find(c => c.id === cardId);
    console.log('🔎 Found card:', card ? { id: card.id, title: card.title, squad: card.squad } : 'NOT FOUND');
    return card?.squad || null;
  };

  const getSquadColor = (squadName: string | null): string | null => {
    if (!squadName) return null;
    const squad = squads.find(s => s.name.toLowerCase() === squadName.toLowerCase());
    return squad?.color || null;
  };

  const handleOpenInCSM = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/?tab=csm&openCard=${cardId}`);
  };

  // Componente de coluna droppable
  const DroppableColumn = ({ stage, children }: { stage: CancellationStage; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: stage.id,
    });

    return (
      <div
        ref={setNodeRef}
        className={`flex-1 min-w-64 rounded-lg flex flex-col transition-colors ${
          isOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/30'
        }`}
        style={{ minHeight: 'calc(100vh - 140px)' }}
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
              {getRequestsForStage(stage).length}
            </Badge>
          </div>
        </div>
        <div className="p-3 flex-1">
          {children}
        </div>
      </div>
    );
  };

  // Componente de card arrastável
  const DraggableCancellationCard = ({ request }: { request: CancellationRequest }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: request.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDeleteRequest(request);
    };

    const squadName = request.squad || getSquadFromCardId(request.card_id);
    const squadColor = getSquadColor(squadName);
    const finalResult = request.final_result as 'revertido' | 'cancelado' | null;

    return (
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`group relative mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-manipulation ${
          isDragging ? 'shadow-lg ring-2 ring-primary' : ''
        }`}
        onClick={() => handleViewDetails(request)}
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{request.contract_name || 'Sem empresa'}</h4>
              <p className="text-xs text-muted-foreground truncate">{request.client_name}</p>
            </div>
            {finalResult && (
              <div className="flex flex-col items-end gap-1">
                <FinalOutcomeBadge outcome={finalResult} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground mb-2">
            {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {request.reason || '-'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs flex items-center gap-1"
              style={squadColor ? { borderColor: squadColor, color: squadColor } : {}}
            >
              <Users className="w-3 h-3" />
              {squadName || 'Indefinido'}
            </Badge>
            {request.card_id ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs flex items-center gap-1"
                onClick={(e) => handleOpenInCSM(request.card_id!, e)}
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

  const handleViewDetails = (request: CancellationRequest) => {
    setSelectedRequest(request);

    // Campo de digitação deve SEMPRE iniciar vazio para evitar confusão
    // (a nota salva continua visível no histórico/observações)
    setCurrentStageNotes("");
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (request: CancellationRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .delete()
        .eq('id', requestToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação deletada com sucesso.",
      });

      fetchRequests();
    } catch (error) {
      console.error('Erro ao deletar solicitação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRequest) return;

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolvido') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = profile?.user_id;
        // Usar notas da etapa atual como notas de resolução
        updates.resolution_notes = currentStageNotes;
      }

      const { error } = await supabase
        .from('cancellation_requests')
        .update(updates)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso.",
      });

      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pendente: { variant: "secondary", icon: Clock, label: "Pendente" },
      em_analise: { variant: "default", icon: FileText, label: "Em Análise" },
      resolvido: { variant: "default", icon: CheckCircle, label: "Resolvido" },
      cancelado: { variant: "destructive", icon: XCircle, label: "Cancelado" },
    };

    const config = variants[status] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleChurnRequest = (request: CancellationRequest) => {
    setRequestToChurn(request);
    requestToChurnRef.current = request;
    
    // Se não tiver card vinculado, abre dialog de vinculação
    if (!request.card_id) {
      setLinkCardDialogOpen(true);
    } else {
      // Se já tiver vinculado, abre dialog de churn
      setLostReasonDialogOpen(true);
    }
  };

  const handleCardLinked = async (cardId: string) => {
    // Atualizar o request com o card_id
    const currentRequest = requestToChurnRef.current;
    if (currentRequest) {
      const updatedRequest = { ...currentRequest, card_id: cardId };
      setRequestToChurn(updatedRequest);
      requestToChurnRef.current = updatedRequest;
      
      // Se estiver no dialog de detalhes, atualizar também o selectedRequest
      if (selectedRequest && selectedRequest.id === currentRequest.id) {
        setSelectedRequest(updatedRequest);
      }
      
      await fetchRequests();
      setLinkCardDialogOpen(false);
      
      // Não abrir mais o dialog de churn automaticamente
      // O churn só deve ser registrado manualmente pelo botão "Registrar Churn" na etapa call_realizada
    }
  };

  const handleConfirmChurn = async (motivo: string, comentarios: string) => {
    // Usar ref para garantir o valor mais recente
    const currentRequest = requestToChurnRef.current;
    const cardId = currentRequest?.card_id;
    
    if (!currentRequest || !cardId) {
      toast({
        title: "Erro",
        description: "Card CSM não vinculado",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataPerda = new Date().toISOString();

      // Buscar o pipeline "Clientes perdidos" do CSM
      const { data: pipelines } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .or('name.ilike.%clientes perdidos%,name.ilike.%perdidos%')
        .eq('is_active', true);

      // Encontrar o pipeline CSM de clientes perdidos
      const clientesPerdidosPipeline = pipelines?.find(p => 
        p.name.toLowerCase().includes('clientes perdidos') || 
        p.name.toLowerCase().includes('perdidos csm')
      );

      let targetStageId: string | null = null;
      const updateData: any = {
        churn: true,
        motivo_perda: motivo,
        comentarios_perda: comentarios,
        data_perda: dataPerda,
      };

      if (clientesPerdidosPipeline) {
        // Buscar a etapa atual do card no pipeline de origem
        const { data: cardData } = await supabase
          .from('csm_cards')
          .select('stage_id, stage_entered_at')
          .eq('id', cardId)
          .maybeSingle();

        let currentStageName: string | null = null;
        const stageEnteredAt = cardData?.stage_entered_at || null;

        if (cardData?.stage_id) {
          const { data: currentStage } = await supabase
            .from('csm_stages')
            .select('name')
            .eq('id', cardData.stage_id)
            .maybeSingle();
          currentStageName = currentStage?.name || null;
        }

        // Buscar todas as etapas do pipeline de clientes perdidos
        const { data: stages } = await supabase
          .from('csm_stages')
          .select('id, name')
          .eq('pipeline_id', clientesPerdidosPipeline.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        // Tentar encontrar etapa com mesmo nome no pipeline de destino
        if (currentStageName && stages?.length) {
          const matchingStage = stages.find(s => 
            s.name.toLowerCase().trim() === currentStageName!.toLowerCase().trim()
          );
          targetStageId = matchingStage?.id || stages[0]?.id || null;
        } else {
          targetStageId = stages?.[0]?.id || null;
        }

        updateData.pipeline_id = clientesPerdidosPipeline.id;
        updateData.stage_id = targetStageId;

        // Preservar a data de entrada na etapa para manter a contagem de dias
        if (stageEnteredAt) {
          updateData.stage_entered_at = stageEnteredAt;
        }
      }

      const { error } = await supabase
        .from('csm_cards')
        .update(updateData)
        .eq('id', cardId);

      if (error) {
        console.error('[Churn] Erro ao atualizar csm_cards:', error);
        // Não bloquear — continuar com o registro na cancellation_requests
      }

      // Registrar no histórico do card CSM (best-effort)
      try {
        await supabase
          .from('csm_card_stage_history')
          .insert({
            card_id: cardId,
            stage_id: targetStageId || updateData.stage_id,
            entered_at: dataPerda,
            moved_by: profile?.user_id,
            notes: `Churn registrado via solicitação de cancelamento.\nMotivo: ${motivo}\nObservações: ${comentarios || 'Nenhuma'}`,
          });
      } catch (historyError) {
        console.error('[Churn] Erro ao registrar histórico:', historyError);
      }

      // Atualizar solicitação de cancelamento para status cancelado
      const { error: updateError } = await supabase
        .from('cancellation_requests')
        .update({
          status: 'cancelado',
          final_result: 'cancelado',
          result_registered_at: new Date().toISOString(),
          result_registered_by: profile?.user_id,
          observacoes: `${currentRequest.observations || (currentRequest as any).observacoes || ''}\n\n--- Churn registrado ---\nMotivo: ${motivo}${comentarios ? `\nObservações: ${comentarios}` : ''}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentRequest.id);

      if (updateError) {
        console.error('[Churn] Erro ao atualizar cancellation_request:', updateError);
        throw updateError;
      }

      toast({
        title: "Sucesso",
        description: "Churn registrado e card movido para Clientes Perdidos",
      });

      setLostReasonDialogOpen(false);
      setRequestToChurn(null);
      requestToChurnRef.current = null;
      // Atualizar selectedRequest para refletir o resultado imediatamente
      if (selectedRequest?.id === currentRequest.id) {
        setSelectedRequest(prev => prev ? { ...prev, final_result: 'cancelado', status: 'cancelado' } : null);
      }
      fetchRequests();
    } catch (error) {
      console.error('Erro ao registrar churn:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o churn",
        variant: "destructive",
      });
    }
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
              placeholder="Pesquisar no Skala"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full bg-background h-10"
            />
          </div>
          
          {/* Linha 2: View toggle + contador + ações */}
          <div className="flex items-center justify-between gap-2">
            {/* View toggle compacto */}
            <div className="flex gap-1 border rounded-lg p-0.5">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8 px-2 transition-all duration-200"
                style={viewMode === 'kanban' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2 transition-all duration-200"
                style={viewMode === 'list' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Contador */}
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
              <span className="text-xs font-medium text-foreground">
                {filteredRequestsData.count}
              </span>
              <span className="text-xs text-muted-foreground">
                {filteredRequestsData.count === 1 ? 'solic.' : 'solic.'}
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
                      variant={sortBy === 'status' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSortBy('status')}
                    >
                      Status
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-none border-r">
                    <Filter className="w-4 h-4" />
                    {(statusFilter !== "todos" || stageFilter !== "todos" || cardLinkFilter !== "todos") && (
                      <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {[statusFilter !== "todos", stageFilter !== "todos", cardLinkFilter !== "todos"].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_analise">Em Análise</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Etapa</label>
                      <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          {CANCELLATION_STAGES.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
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
                    
                    {(statusFilter !== "todos" || stageFilter !== "todos" || cardLinkFilter !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("todos");
                          setStageFilter("todos");
                          setCardLinkFilter("todos");
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
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8 transition-all duration-200"
              style={viewMode === 'kanban' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
            >
              <LayoutGrid className="h-4 w-4 mr-2 transition-transform duration-200" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 transition-all duration-200"
              style={viewMode === 'list' ? { backgroundColor: '#ec4a55', color: 'white' } : {}}
            >
              <List className="h-4 w-4 mr-2 transition-transform duration-200" />
              Lista
            </Button>
          </div>

          {/* Campo de pesquisa centralizado */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar no Skala"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-md">
            <span className="text-sm font-medium text-foreground">
              {filteredRequestsData.count}
            </span>
            <span className="text-sm text-muted-foreground">
              {filteredRequestsData.count === 1 ? 'solicitação' : 'solicitações'}
            </span>
          </div>

          {/* Barra de ações estilo NPS */}
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
                    variant={sortBy === 'status' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSortBy('status')}
                  >
                    Status
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
                  {(statusFilter !== "todos" || stageFilter !== "todos" || cardLinkFilter !== "todos") && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {[statusFilter !== "todos", stageFilter !== "todos", cardLinkFilter !== "todos"].filter(Boolean).length}
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
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os status</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_analise">Em Análise</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Etapa</label>
                      <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas as etapas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as etapas</SelectItem>
                          {CANCELLATION_STAGES.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
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

                    {(statusFilter !== "todos" || stageFilter !== "todos" || cardLinkFilter !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("todos");
                          setStageFilter("todos");
                          setCardLinkFilter("todos");
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
      <div className="flex-1 px-6 py-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <ScrollArea className="w-full h-full">
              <div className="flex gap-4 pb-4 h-full w-full" style={{ minHeight: 'calc(100vh - 140px)' }}>
                {CANCELLATION_STAGES.map((stage) => {
                  const stageRequests = getRequestsForStage(stage);
                  return (
                    <DroppableColumn key={stage.id} stage={stage}>
                      {stageRequests.map((request) => (
                        <DraggableCancellationCard key={request.id} request={request} />
                      ))}
                      {stageRequests.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Nenhuma solicitação
                        </p>
                      )}
                    </DroppableColumn>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
            
            <DragOverlay>
              {activeId && draggedRequest && (
                <Card className="w-64 shadow-xl opacity-90">
                  <CardHeader className="p-3 pb-2">
                    <h4 className="font-medium text-sm truncate">{draggedRequest.contract_name || 'Sem empresa'}</h4>
                    <p className="text-xs text-muted-foreground truncate">{draggedRequest.client_name}</p>
                  </CardHeader>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <CancellationList
            requests={filteredRequestsData.requests}
            onViewDetails={handleViewDetails}
            onDeleteRequest={handleDeleteRequest}
            isAdmin={canDelete}
          />
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Ao fechar, limpar qualquer rascunho que tenha ficado no textarea
            setCurrentStageNotes("");
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes da solicitação de cancelamento
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Informações da Solicitação (Read-only) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Informações da Solicitação
                  </h3>
                </div>
                
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                      <p className="text-sm font-medium">{selectedRequest.contract_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                      <p className="text-sm font-medium">{selectedRequest.client_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <p className="text-sm font-medium">{selectedRequest.client_email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data</label>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <label className="text-xs font-medium text-muted-foreground">Motivo</label>
                    <p className="text-sm font-medium">{selectedRequest.reason || '-'}</p>
                  </div>

                  <div className="pt-2 border-t">
                    <label className="text-xs font-medium text-muted-foreground">Observações da Solicitação</label>
                    <p className="text-sm whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">
                      {selectedRequest.observations || "Nenhuma Observação"}
                    </p>
                  </div>
                </div>

                {/* Histórico de notas das etapas anteriores */}
                {selectedRequest.stage_notes && Object.keys(selectedRequest.stage_notes).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Histórico de Notas por Etapa</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {CANCELLATION_STAGES.map((stage) => {
                        const notes = (selectedRequest.stage_notes as StageNotes)?.[stage.id as keyof StageNotes];
                        if (!notes || stage.id === selectedRequest.stage) return null;
                        return (
                          <div key={stage.id} className="p-2 bg-muted/50 rounded-md border">
                            <div className="flex items-center gap-2 mb-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="text-xs font-medium text-muted-foreground">{stage.name}</span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resultado final - badge se já definido, botões se pendente */}
                {selectedRequest.stage === 'call_realizada' && (
                  <div className="pt-4 border-t">
                    {selectedRequest.final_result ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Resultado da Retenção</p>
                        <FinalOutcomeBadge outcome={selectedRequest.final_result as 'revertido' | 'cancelado'} />
                      </div>
                    ) : (
                      <FinalOutcomeButtons
                        currentOutcome={null}
                        onOutcomeChange={async (outcome) => {
                          await handleFinalOutcomeChange(selectedRequest.id, outcome);
                        }}
                        onCanceladoClick={() => {
                          handleChurnRequest(selectedRequest);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Coluna Direita - Campos Interativos */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Ações e Preenchimentos
                  </h3>
                </div>

                {/* Seções editáveis: Anexos, Análise Financeira, Links, Observações da Reunião */}
                <CardDetailsEditableSections
                  requestId={selectedRequest.id}
                  currentStage={selectedRequest.stage || 'nova'}
                  financialAnalysis={selectedRequest.financial_analysis}
                  googleMeetLink={selectedRequest.google_meet_link}
                  meetroxLink={selectedRequest.meetrox_link}
                  meetingNotes={selectedRequest.meeting_notes}
                  onFieldSaved={(field, value) => {
                    // Atualizar o estado local quando um campo for salvo
                    setSelectedRequest({ ...selectedRequest, [field]: value });
                    setRequests(prev => prev.map(r => 
                      r.id === selectedRequest.id ? { ...r, [field]: value } : r
                    ));
                  }}
                  userId={profile?.user_id}
                />

                {/* Notas da Etapa */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    📝 Notas da Etapa: {CANCELLATION_STAGES.find(s => s.id === selectedRequest.stage)?.name || selectedRequest.stage}
                  </label>
                  <Textarea
                    value={currentStageNotes}
                    onChange={(e) => setCurrentStageNotes(e.target.value)}
                    placeholder="Adicione notas sobre esta etapa..."
                    className="mt-2"
                    rows={3}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      if (!selectedRequest) return;

                       // Como o textarea agora sempre inicia vazio, evitamos sobrescrever
                       // uma nota existente com conteúdo em branco.
                       if (!currentStageNotes.trim()) {
                         toast({
                           title: "Digite uma nota antes de salvar",
                           description: "O campo de notas está vazio.",
                           variant: "destructive",
                         });
                         return;
                       }
                      
                      // Usar o campo observations para armazenar notas da etapa atual
                      // já que stage_notes não existe no banco externo
                      const currentObservations = selectedRequest.observations || '';
                      const stageLabel = CANCELLATION_STAGES.find(s => s.id === selectedRequest.stage)?.name || selectedRequest.stage;
                      
                      // Criar timestamp para identificar cada nota
                      const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
                      const notePrefix = `[Nota - ${stageLabel} - ${timestamp}]: `;
                      
                      // SEMPRE adicionar nova nota ao final (não substituir)
                      // Isso permite múltiplas notas por etapa
                      const updatedObservations = currentObservations 
                        ? `${currentObservations}\n\n${notePrefix}${currentStageNotes}`
                        : `${notePrefix}${currentStageNotes}`;
                      
                      console.log('💾 Saving notes:', { 
                        currentObservations, 
                        updatedObservations, 
                        stageLabel,
                        noteContent: currentStageNotes 
                      });
                      
                      const { error } = await supabase
                        .from('cancellation_requests')
                        .update({ 
                          observacoes: updatedObservations,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedRequest.id);
                      
                      if (!error) {
                        // Atualizar estado local para refletir a mudança imediatamente
                        setRequests(prev => prev.map(r => 
                          r.id === selectedRequest.id 
                            ? { ...r, observations: updatedObservations } 
                            : r
                        ));
                        setSelectedRequest({ ...selectedRequest, observations: updatedObservations });
                        // Limpar o campo de notas após salvar
                        setCurrentStageNotes("");
                        toast({ title: "Notas salvas com sucesso!" });
                      } else {
                        console.error('Erro ao salvar notas:', error);
                        toast({ title: "Erro ao salvar notas", variant: "destructive" });
                      }
                    }}
                  >
                    Salvar Notas
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              {selectedRequest?.card_id ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate('/', { state: { view: 'csm', cardId: selectedRequest.card_id } });
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver card no CSM
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRequestToChurn(selectedRequest);
                    requestToChurnRef.current = selectedRequest;
                    setLinkCardDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Vincular card
                </Button>
              )}
              {/* Botão de Registrar Churn removido - agora integrado nos botões de resultado final */}
            </div>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
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

      {/* Dialog para vincular card CSM */}
      {requestToChurn && (
        <LinkCardDialog
          open={linkCardDialogOpen}
          onClose={() => {
            setLinkCardDialogOpen(false);
            setRequestToChurn(null);
          }}
          onCardLinked={handleCardLinked}
          cancellationRequestId={requestToChurn.id}
          empresaName={requestToChurn.contract_name || requestToChurn.client_name}
        />
      )}

      {/* Dialog para registrar churn */}
      <LostReasonDialog
        open={lostReasonDialogOpen}
        onClose={() => {
          setLostReasonDialogOpen(false);
          setRequestToChurn(null);
        }}
        onConfirm={handleConfirmChurn}
        isCSMPipeline={true}
      />

      {/* Dialog para preencher pré-requisitos de etapa */}
      <StageRequirementsDialog
        open={requirementsDialogOpen}
        onOpenChange={setRequirementsDialogOpen}
        targetStage={pendingMove?.targetStage || ''}
        requirements={pendingRequirements}
        currentValues={pendingMove?.request || {}}
        onSubmit={handleRequirementsSubmit}
        onCancel={() => {
          setRequirementsDialogOpen(false);
          setPendingMove(null);
          setPendingRequirements([]);
        }}
      />
    </div>
  );
}
