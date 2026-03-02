import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, User, Mail, Phone, DollarSign, Calendar, X, TrendingUp, Tag, Trophy, XCircle, ChevronDown, ChevronRight, BarChart3, Settings, AlertTriangle, MoreVertical, Trash2, GitMerge, ArrowRight, ArrowLeft, Copy, Plus, Search, ClipboardCheck, Globe, Target, Flag, Pencil } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PerformanceManager } from './PerformanceManager';
import { UpsellManager } from './UpsellManager';
import { VariableManager } from './VariableManager';
import { CSMCard, CSMStage } from '@/types/kanban';
import { EditableField } from '../crm/EditableField';
import { UTMSection } from '../crm/UTMSection';
import { QualificationScoreSection } from '../crm/QualificationScoreSection';
import { RequiredFieldsDialog, RequiredFieldsData } from './RequiredFieldsDialog';
import { LostReasonDialog } from './LostReasonDialog';
import { CardHistoryAndActivities } from '@/components/kanban/CardHistoryAndActivities';
import { MRRInput } from '@/components/kanban/MRRInput';
import { CNPJInput } from '@/components/kanban/CNPJInput';
import { CEPInput } from '@/components/kanban/CEPInput';
import { CardEmailsManager } from '@/components/kanban/CardEmailsManager';
// WinRequiredFieldsDialog removed - commercial module
import { usePipelineAutomations } from '@/hooks/usePipelineAutomations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sortTags } from '@/utils/tagSorting';

interface CardDetailsDialogProps {
  card: CSMCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  stages: CSMStage[];
  pipelineName?: string;
  moduleType?: 'csm';
}

export const CardDetailsDialog: React.FC<CardDetailsDialogProps> = ({
  card,
  open,
  onClose,
  onUpdate,
  stages,
  pipelineName,
  moduleType = 'csm'
}) => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'dados' | 'atividades'>('dados');
  const [showRequiredFields, setShowRequiredFields] = useState(false);
  const [showLostReasonDialog, setShowLostReasonDialog] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [availableCards, setAvailableCards] = useState<Array<{ id: string; title: string; company_name?: string; pipeline_id: string }>>([]);
  const [selectedMergeCard, setSelectedMergeCard] = useState<string>('');
  const [squads, setSquads] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; effectiveRole: string; baseRole?: string | null; customRoleName?: string | null }>>([]);
  const [availablePipelines, setAvailablePipelines] = useState<Array<{ id: string; name: string }>>([]);
  const [currentPipelineInfo, setCurrentPipelineInfo] = useState<{ id: string; name: string } | null>(null);
  const [briefingQuestions, setBriefingQuestions] = useState<Array<{ id: string; question: string }>>([]);
  const [briefingAnswers, setBriefingAnswers] = useState<Record<string, string>>({});
  const [dataPerdaPopoverOpen, setDataPerdaPopoverOpen] = useState(false);
  
  // Estados para diálogo de reabertura
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenPipelines, setReopenPipelines] = useState<Array<{ id: string; name: string }>>([]);
  const [reopenStages, setReopenStages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedReopenPipeline, setSelectedReopenPipeline] = useState<string>('');
  const [selectedReopenStage, setSelectedReopenStage] = useState<string>('');
  
  // Estados para seleção de funil/etapa CSM (Clientes ativos)
  const [csmPipelines, setCsmPipelines] = useState<Array<{ id: string; name: string }>>([]);
  const [csmPipelineStages, setCsmPipelineStages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCsmPipeline, setSelectedCsmPipeline] = useState<string>('');
  
  // Verificar se o usuário pode editar data de perda (admin ou head_de_projetos)
  const customRoleName = profile?.customRoleDisplayName?.toLowerCase() || profile?.custom_roles?.display_name?.toLowerCase() || '';
  const canEditDataPerda = moduleType === 'csm' && (
    profile?.effectiveRole === 'admin' ||
    customRoleName.includes('head') && customRoleName.includes('projeto')
  );
  
  // Ref para evitar execuções paralelas de automação
  const automationRunningRef = useRef(false);
  
  // CRÍTICO: Forçar fechamento se card for null enquanto dialog está "aberto"
  // Isso resolve a condição de corrida onde card é excluído mas o dialog não fecha
  useEffect(() => {
    if (!card && open) {
      // Forçar fechamento imediato
      onClose();
    }
  }, [card, open, onClose]);
  
  // Estados para histórico de upsells
  const [upsellHistory, setUpsellHistory] = useState<Array<{
    id: string;
    upsell_value: number;
    upsell_month: number;
    upsell_year: number;
    created_at: string;
    notes?: string;
  }>>([]);
  const [newUpsellValue, setNewUpsellValue] = useState<number>(0);
  const [newUpsellMonth, setNewUpsellMonth] = useState<number>(new Date().getMonth() + 1);
  const [newUpsellYear, setNewUpsellYear] = useState<number>(new Date().getFullYear());
  const [newUpsellNotes, setNewUpsellNotes] = useState<string>('');
  const [newUpsellType, setNewUpsellType] = useState<'upsell' | 'crosssell'>('upsell');
  const [newPaymentType, setNewPaymentType] = useState<'recorrente' | 'unico' | 'parcelado'>('recorrente');
  const [newInstallments, setNewInstallments] = useState<number | null>(null);
  
  // Estados para histórico de variáveis
  const [variableHistory, setVariableHistory] = useState<Array<{
    id: string;
    variable_type: 'investimento' | 'venda';
    variable_value: number;
    variable_month: number;
    variable_year: number;
    notes?: string;
    created_at: string;
  }>>([]);
  const [newVariableType, setNewVariableType] = useState<'investimento' | 'venda'>('investimento');
  const [newVariableValue, setNewVariableValue] = useState<number>(0);
  const [newVariableMonth, setNewVariableMonth] = useState<number>(new Date().getMonth() + 1);
  const [newVariableYear, setNewVariableYear] = useState<number>(new Date().getFullYear());
  const [newVariableNotes, setNewVariableNotes] = useState<string>('');
  
  // Estados para seções colapsáveis
  const [sectionStates, setSectionStates] = useState({
    resumo: true,
    contratuais: false,
    basicas: false,
    comerciais: false,
    contato: false,
    qualificacao: false,
    status: moduleType === 'csm' ? false : true,
    perda: moduleType === 'csm' ? false : true,
    metricas: false,
    utm: false,
    briefing: false,
    upsells: false,
    variables: false,
    variablesSales: false,
    performance: false,
  });
  
  // Estados para etiquetas
  const [searchEtiqueta, setSearchEtiqueta] = useState('');
  const [openEtiquetaPopover, setOpenEtiquetaPopover] = useState(false);
  const [openEtiquetaPopoverResumo, setOpenEtiquetaPopoverResumo] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [cardTags, setCardTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  
  // Hook para automações de pipeline
  const { executeAutomation } = usePipelineAutomations();
  
  const toggleSection = (section: keyof typeof sectionStates) => {
    setSectionStates(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Identificar se é um pipeline CSM (para usar terminologia "Churn" ao invés de "Perdido")
  const isCSMPipeline = pipelineName?.toLowerCase().includes('ativos') || 
                       pipelineName?.toLowerCase().includes('csm') ||
                       pipelineName?.toLowerCase().includes('customer success');
  
  // Estado para histórico de movimentações
  const [stageHistory, setStageHistory] = React.useState<Record<string, number>>({});
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);

  // Buscar squads do Supabase
  React.useEffect(() => {
    const fetchSquads = async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('id, name, color')
        .eq('is_active', true)
        .order('position');

      if (error) {
        console.error('Erro ao buscar squads:', error);
        return;
      }

      setSquads(data || []);
    };

    fetchSquads();
  }, []);

  // Buscar usuários com base no tipo de módulo
  React.useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, role, custom_role_id, custom_roles(base_role, name)')
         .eq('is_active', true)
         .order('name');

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        return;
      }

      const mappedUsers = (data || []).map((user: any) => {
        const baseRole = user.custom_roles?.base_role as string | null | undefined;
        const customRoleName = user.custom_roles?.name as string | null | undefined;
        const effectiveRole = (baseRole && baseRole !== 'custom') ? baseRole : user.role;
        return {
          id: user.user_id, // USAR user_id, não profiles.id
          name: user.name,
          role: user.role,
          effectiveRole,
          baseRole: baseRole ?? null,
          customRoleName: customRoleName ?? null,
        };
      });

      // Filtrar usuários baseado no tipo de módulo
      const filteredUsers = mappedUsers.filter(user => {
        // Admin sempre pode
        if (user.effectiveRole === 'admin') {
          return true;
        }
        // Todos os usuários ativos são elegíveis
        return true;
      });

      setUsers(filteredUsers);
    };

    fetchUsers();
  }, [moduleType]);

  // Buscar pipeline atual e pipelines disponíveis para movimentação
  React.useEffect(() => {
    if (!card || !open) return;

    const fetchPipelineInfo = async () => {
      // Buscar informações do pipeline atual
      const { data: currentPipeline, error: currentError } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .eq('id', card.pipeline_id)
        .single();

      if (currentError) {
        console.error('Erro ao buscar pipeline atual:', currentError);
        return;
      }

      setCurrentPipelineInfo(currentPipeline);

      // Se estiver no funil Closer OU SDR, buscar pipelines SDR disponíveis
      const isCloserPipeline = currentPipeline?.name?.toLowerCase().includes('closer');
      const isSDRPipeline = currentPipeline?.name?.toLowerCase().includes('sdr');
      const isClientesAtivosPipeline = currentPipeline?.name?.toLowerCase() === 'clientes ativos';
      
      if (isCloserPipeline || isSDRPipeline) {
        const { data: sdrPipelines, error: sdrError } = await supabase
          .from('csm_pipelines')
          .select('id, name')
          .eq('is_active', true)
          .or('name.ilike.%SDR | Principal%,name.ilike.%SDR | Refugo%')
          .order('name');

        if (sdrError) {
          console.error('Erro ao buscar pipelines SDR:', sdrError);
          return;
        }

        // Filtrar para não incluir o pipeline atual na lista
        const filteredPipelines = (sdrPipelines || []).filter(p => p.id !== currentPipeline.id);
        setAvailablePipelines(filteredPipelines);
      }
      
      // Se estiver no funil "Clientes ativos", buscar outros pipelines CSM (exceto Clientes Perdidos)
      if (isClientesAtivosPipeline) {
        const { data: allCsmPipelines, error: csmError } = await supabase
          .from('csm_pipelines')
          .select('id, name')
          .eq('is_active', true)
          .order('position');

        if (csmError) {
          console.error('Erro ao buscar pipelines CSM:', csmError);
          return;
        }

        // Filtrar: excluir pipelines de vendas e pipelines de perdidos/excluídos
        const filteredCsmPipelines = (allCsmPipelines || []).filter(p => {
          const lowerName = p.name.toLowerCase();
          // Excluir pipelines de vendas (SDR, Closer, Leads ganhos, Leads perdidos, Leads Excluídos sem CSM)
          if (lowerName.includes('sdr')) return false;
          if (lowerName.includes('closer')) return false;
          if (lowerName.includes('leads ganhos')) return false;
          if (lowerName.includes('leads perdidos')) return false;
          // Excluir "Leads Excluídos" mas manter "Leads Excluídos CSM"
          if (lowerName === 'leads excluídos') return false;
          // Excluir "Clientes Perdidos" e pipelines de exclusão CSM
          if (lowerName.includes('perdido') || lowerName.includes('excluído')) return false;
          return true;
        });
        
        setCsmPipelines(filteredCsmPipelines);
        setSelectedCsmPipeline('');
        setCsmPipelineStages([]);
      }
    };

    fetchPipelineInfo();
  }, [card?.id, card?.pipeline_id, open]);
  
  // Buscar estágios quando um pipeline CSM é selecionado
  React.useEffect(() => {
    if (!selectedCsmPipeline) {
      setCsmPipelineStages([]);
      return;
    }
    
    const fetchCsmStages = async () => {
      const { data: stagesData, error } = await supabase
        .from('csm_stages')
        .select('id, name')
        .eq('pipeline_id', selectedCsmPipeline)
        .eq('is_active', true)
        .order('position');
      
      if (error) {
        console.error('Erro ao buscar estágios do pipeline CSM:', error);
        return;
      }
      
      setCsmPipelineStages(stagesData || []);
    };
    
    fetchCsmStages();
  }, [selectedCsmPipeline]);

  // Buscar histórico de upsells
  React.useEffect(() => {
    if (!card || !open) return;

    const fetchUpsellHistory = async () => {
      const { data, error } = await supabase
        .from('csm_card_upsell_history')
        .select('*')
        .eq('card_id', card.id)
        .order('upsell_year', { ascending: false })
        .order('upsell_month', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de upsells:', error);
        return;
      }

      setUpsellHistory(data || []);
    };

    fetchUpsellHistory();
  }, [card, open]);

  // Buscar histórico de variáveis
  React.useEffect(() => {
    if (!card || !open) return;

    const fetchVariableHistory = async () => {
      const { data, error } = await supabase
        .from('csm_card_variable_history')
        .select('*')
        .eq('card_id', card.id)
        .order('variable_year', { ascending: false })
        .order('variable_month', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de variáveis:', error);
        return;
      }

      setVariableHistory((data || []) as Array<{
        id: string;
        variable_type: 'investimento' | 'venda';
        variable_value: number;
        variable_month: number;
        variable_year: number;
        notes?: string;
        created_at: string;
      }>);
    };

    fetchVariableHistory();
  }, [card, open]);

  // Estados para histórico de performance
  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    id: string;
    performance_type: string;
    performance_value: string;
    performance_month: number;
    performance_year: number;
    created_at: string;
  }>>([]);

  // Buscar histórico de performance
  React.useEffect(() => {
    if (!card || !open || moduleType !== 'csm') return;

    const fetchPerformanceHistory = async () => {
      const { data, error } = await supabase
        .from('csm_card_performance_history')
        .select('*')
        .eq('card_id', card.id)
        .order('performance_year', { ascending: false })
        .order('performance_month', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de performance:', error);
        return;
      }

      setPerformanceHistory(data || []);
    };

    fetchPerformanceHistory();
  }, [card, open, moduleType]);

  // Buscar histórico de movimentações do card
  React.useEffect(() => {
    if (!card || !open) {
      setIsLoadingHistory(false);
      return;
    }

    const fetchStageHistory = async () => {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
        .from('csm_card_stage_history')
        .select('stage_id, entered_at, exited_at, event_type')
        .eq('card_id', card.id)
        .or('event_type.is.null,event_type.eq.stage_change,event_type.eq.churn,event_type.eq.lost');

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        setIsLoadingHistory(false);
        return;
      }

      // Calcular dias para cada etapa
      const historyMap: Record<string, number> = {};
      const isLostPipeline = pipelineName?.toLowerCase().includes('perdidos');
      
      if (data && data.length > 0) {
        // Para pipelines de perdidos, mapear por nome da etapa (IDs são diferentes entre pipelines)
        if (isLostPipeline) {
          // Buscar nomes das etapas referenciadas no histórico
          const stageIds = [...new Set(data.map(h => h.stage_id))];
          const { data: historyStages } = await supabase
            .from('csm_stages')
            .select('id, name')
            .in('id', stageIds);

          const stageIdToName: Record<string, string> = {};
          historyStages?.forEach(s => { stageIdToName[s.id] = s.name.toLowerCase().trim(); });

          // Mapear nome da etapa do histórico → ID da etapa no pipeline atual
          const currentStageNameToId: Record<string, string> = {};
          stages.forEach(s => { currentStageNameToId[s.name.toLowerCase().trim()] = s.id; });

          data.forEach((history) => {
            const enteredAt = new Date(history.entered_at);
            const exitedAt = history.exited_at ? new Date(history.exited_at) : new Date(history.entered_at);
            const diffTime = exitedAt.getTime() - enteredAt.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Encontrar ID correspondente no pipeline atual pelo nome
            const histStageName = stageIdToName[history.stage_id];
            const mappedId = histStageName ? (currentStageNameToId[histStageName] || history.stage_id) : history.stage_id;

            if (historyMap[mappedId]) {
              historyMap[mappedId] += diffDays;
            } else {
              historyMap[mappedId] = diffDays;
            }
          });
        } else {
          // Separar registros fechados (com exited_at) e abertos (sem exited_at)
          const closedRecords = data.filter((h) => h.exited_at);
          const openRecords = data.filter((h) => !h.exited_at);

          // Registros fechados: somar normalmente
          closedRecords.forEach((history) => {
            const enteredAt = new Date(history.entered_at);
            const exitedAt = new Date(history.exited_at!);
            const diffTime = exitedAt.getTime() - enteredAt.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (historyMap[history.stage_id]) {
              historyMap[history.stage_id] += diffDays;
            } else {
              historyMap[history.stage_id] = diffDays;
            }
          });

          // Registros abertos: usar apenas o mais recente por stage_id
          const latestOpenByStage: Record<string, typeof openRecords[0]> = {};
          openRecords.forEach((history) => {
            const existing = latestOpenByStage[history.stage_id];
            if (!existing || new Date(history.entered_at) > new Date(existing.entered_at)) {
              latestOpenByStage[history.stage_id] = history;
            }
          });

          Object.values(latestOpenByStage).forEach((history) => {
            const enteredAt = new Date(history.entered_at);
            const diffTime = new Date().getTime() - enteredAt.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (historyMap[history.stage_id]) {
              historyMap[history.stage_id] += diffDays;
            } else {
              historyMap[history.stage_id] = diffDays;
            }
          });
        }
      }

      setStageHistory(historyMap);
      setIsLoadingHistory(false);
    };

    fetchStageHistory();
    fetchAvailableTags();
    fetchCardTags();
    loadBriefingQuestions();
  }, [card?.id, open]);

  // Buscar etiquetas disponíveis
  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_tags')
        .select('id, name, color')
        .eq('is_active', true)
        .or(`module_scope.eq.${moduleType},module_scope.eq.both`);

      if (error) throw error;
      setAvailableTags(sortTags(data || []));
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
    }
  };

  // Buscar etiquetas do card
  const fetchCardTags = async () => {
    if (!card) return;

    try {
      const { data, error } = await supabase
        .from('csm_card_tags')
        .select(`
          tag_id,
          csm_tags (
            id,
            name,
            color
          )
        `)
        .eq('card_id', card.id);

      if (error) throw error;

      const tags = data
        ?.map((ct: any) => ct.csm_tags)
        .filter((tag): tag is { id: string; name: string; color: string } => tag !== null) || [];
      
      setCardTags(tags);
    } catch (error) {
      console.error('Erro ao buscar etiquetas do card:', error);
    }
  };

  // Adicionar ou remover etiqueta do card
  const toggleCardTag = async (tagId: string) => {
    if (!card) return;

    setLoading(true);
    try {
      const hasTag = cardTags.some(t => t.id === tagId);
      const tag = availableTags.find(t => t.id === tagId);
      const tagName = tag?.name || 'Etiqueta';

      if (hasTag) {
        // Remover etiqueta
        const { error } = await supabase
          .from('csm_card_tags')
          .delete()
          .eq('card_id', card.id)
          .eq('tag_id', tagId);

        if (error) throw error;
        
        // Registrar no histórico
        await supabase
          .from('csm_card_stage_history')
          .insert({
            card_id: card.id,
            stage_id: card.stage_id,
            entered_at: new Date().toISOString(),
            moved_by: (await supabase.auth.getUser()).data.user?.id,
            notes: `Etiqueta "${tagName}" removida`,
            event_type: 'field_update'
          });
        
        toast.success('Etiqueta removida com sucesso!');
      } else {
        // Adicionar etiqueta
        const { error } = await supabase
          .from('csm_card_tags')
          .insert({
            card_id: card.id,
            tag_id: tagId,
          });

        if (error) throw error;
        
        // Registrar no histórico
        await supabase
          .from('csm_card_stage_history')
          .insert({
            card_id: card.id,
            stage_id: card.stage_id,
            entered_at: new Date().toISOString(),
            moved_by: (await supabase.auth.getUser()).data.user?.id,
            notes: `Etiqueta "${tagName}" adicionada`,
            event_type: 'field_update'
          });
        
        toast.success('Etiqueta adicionada com sucesso!');
      }

      fetchCardTags();
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast.error('Erro ao atualizar etiqueta');
    } finally {
      setLoading(false);
    }
  };

  if (!card) return null;

  const formatCurrency = (value: number | undefined) => {
    if (!value || value === 0) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para atualizar campo no banco
  // Mapeamento de nomes de campos para português
  const fieldNameMap: Record<string, string> = {
    'title': 'Título',
    'company_name': 'Nome da Empresa',
    'contact_name': 'Nome do Cliente',
    'instagram': 'Instagram',
    'contact_email': 'Email do Contato',
    'contact_phone': 'Telefone do Contato',
    'monthly_revenue': 'MRR',
    'implementation_value': 'Valor de Implementação',
    'plano': 'Plano',
    'squad': 'Squad',
    'niche': 'Nicho',
    'cnpj': 'CNPJ',
    'cep': 'CEP',
    'endereco_rua': 'Rua',
    'endereco_numero': 'Número',
    'endereco_complemento': 'Complemento',
    'endereco_cidade': 'Cidade',
    'endereco_estado': 'Estado',
    'health_score': 'Health Score',
    'satisfacao_cliente': 'Satisfação do Cliente',
    'nivel_engajamento': 'Nível de Engajamento',
    'nota_nps': 'Nota NPS',
    'data_renovacao': 'Data de Renovação',
    'investimento_midia': 'Investimento em Mídia',
    'receita_gerada_cliente': 'Receita Gerada pelo Cliente',
    'teve_vendas': 'Teve Vendas',
    'teve_roas_maior_1': 'Teve ROAS > 1',
    'teve_roi_maior_1': 'Teve ROI > 1',
    'categoria': 'Categoria',
    'website': 'Website',
    'description': 'Descrição',
    'inadimplente': 'Inadimplente',
    'aviso_previo': 'Aviso Prévio',
    'pausa_contratual': 'Pausa Contratual',
    'possivel_churn': 'Possível Churn',
    'utm_source': 'UTM Source',
    'utm_medium': 'UTM Medium',
    'utm_campaign': 'UTM Campaign',
    'utm_term': 'UTM Term',
    'utm_content': 'UTM Content',
    'utm_url': 'UTM URL',
    'qual_nicho_certo': 'Nicho certo?',
    'qual_porte_empresa': 'Porte da empresa?',
    'qual_tomador_decisao': 'Tomador de decisão?',
    'qual_investe_marketing': 'Já investe em marketing?',
    'qual_urgencia_real': 'Urgência real?',
    'qual_clareza_objetivos': 'Nível de clareza sobre os objetivos?',
  };

  // Função para formatar o valor para exibição no histórico
  const formatValueForHistory = (field: string, value: any): string => {
    if (value === null || value === undefined || value === '') return 'Vazio';
    
    // Valores booleanos
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    
    // Valores monetários
    if (field === 'monthly_revenue' || field === 'implementation_value' || field === 'investimento_midia' || field === 'receita_gerada_cliente') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(value));
    }
    
    // Datas
    if (field === 'data_renovacao') {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    
    // Health Score e Satisfação
    if (field === 'health_score' || field === 'satisfacao_cliente' || field === 'nota_nps') {
      return String(value);
    }
    
    return String(value);
  };

  const loadBriefingQuestions = async () => {
    if (!card?.pipeline_id || !card?.id) {
      console.log('loadBriefingQuestions: card não disponível', { pipeline_id: card?.pipeline_id, id: card?.id });
      return;
    }

    console.log('loadBriefingQuestions: iniciando para card', card.id);

    try {
      // Buscar as respostas do card primeiro
      const { data: cardData, error: cardError } = await supabase
        .from("csm_cards")
        .select("briefing_answers")
        .eq("id", card.id)
        .single();

      if (cardError) {
        console.error("Erro ao buscar briefing_answers:", cardError);
        throw cardError;
      }

      const answers = (cardData?.briefing_answers as Record<string, string>) || {};
      console.log('loadBriefingQuestions: answers encontradas', Object.keys(answers).length);
      setBriefingAnswers(answers);
      
      // Se temos respostas, buscar perguntas de TODOS os pipelines para encontrar as correspondentes
      const answerIds = Object.keys(answers);
      
      if (answerIds.length > 0) {
        console.log('loadBriefingQuestions: buscando perguntas para', answerIds.length, 'respostas');
        
        // Buscar todas as perguntas de todos os pipelines
        const { data: allPipelineData, error: allError } = await supabase
          .from("pipeline_required_fields")
          .select("briefing_questions");
        
        if (allError && allError.code !== "PGRST116") {
          console.error("Erro ao buscar pipeline_required_fields:", allError);
          throw allError;
        }
        
        console.log('loadBriefingQuestions: pipeline_required_fields retornou', allPipelineData?.length, 'registros');
        
        // Coletar todas as perguntas únicas
        const allQuestions: Array<{ id: string; question: string }> = [];
        const seenIds = new Set<string>();
        
        allPipelineData?.forEach((pd: any) => {
          const questions = pd.briefing_questions as Array<{ id: string; question: string }> | null;
          if (Array.isArray(questions)) {
            questions.forEach(q => {
              if (answerIds.includes(q.id) && !seenIds.has(q.id)) {
                allQuestions.push(q);
                seenIds.add(q.id);
              }
            });
          }
        });
        
        console.log('loadBriefingQuestions: perguntas encontradas para respostas', allQuestions.length);
        setBriefingQuestions(allQuestions);
      } else {
        console.log('loadBriefingQuestions: sem respostas, buscando perguntas do pipeline', card.pipeline_id);
        
        // Se não há respostas, buscar as perguntas do funil atual
        const { data: pipelineData, error: pipelineError } = await supabase
          .from("pipeline_required_fields")
          .select("briefing_questions")
          .eq("pipeline_id", card.pipeline_id)
          .maybeSingle();

        if (pipelineError && pipelineError.code !== "PGRST116") {
          console.error("Erro ao buscar perguntas do pipeline:", pipelineError);
          throw pipelineError;
        }

        const questions = pipelineData?.briefing_questions as Array<{ id: string; question: string }> | null;
        console.log('loadBriefingQuestions: perguntas do pipeline', Array.isArray(questions) ? questions.length : 0);
        setBriefingQuestions(Array.isArray(questions) ? questions : []);
      }
    } catch (error) {
      console.error("Error loading briefing questions:", error);
    }
  };

  const updateBriefingAnswer = async (questionId: string, answer: string) => {
    const oldAnswer = briefingAnswers[questionId] || '';
    const newAnswers = { ...briefingAnswers, [questionId]: answer };
    setBriefingAnswers(newAnswers);

    try {
      const { error } = await supabase
        .from("csm_cards")
        .update({ briefing_answers: newAnswers } as any)
        .eq("id", card.id);

      if (error) throw error;
      
      // Registrar alteração no histórico se houve mudança
      if (oldAnswer !== answer) {
        const question = briefingQuestions.find(q => q.id === questionId);
        const questionText = question?.question || 'Pergunta do briefing';
        
        await supabase
          .from('csm_card_stage_history')
          .insert({
            card_id: card.id,
            stage_id: card.stage_id,
            entered_at: new Date().toISOString(),
            moved_by: (await supabase.auth.getUser()).data.user?.id,
            notes: `Resposta do briefing "${questionText}" atualizada`,
            event_type: 'field_update'
          });
      }
    } catch (error) {
      console.error("Error saving briefing answer:", error);
      toast.error("Erro ao salvar resposta");
    }
  };

  const updateCardField = async (field: string, value: string | number | boolean) => {
    setLoading(true);
    try {
      // Guardar valor antigo para o histórico
      const oldValue = (card as any)[field];
      
      // Converter valores numéricos adequadamente
      let processedValue: any = value;
      const numericFields = ['implementation_value', 'monthly_revenue', 'health_score', 'satisfacao_cliente', 'qual_nicho_certo', 'qual_porte_empresa', 'qual_tomador_decisao', 'qual_investe_marketing', 'qual_urgencia_real', 'qual_clareza_objetivos'];
      
      if (numericFields.includes(field)) {
        // Se for string vazia, converter para null
        if (value === '' || value === null || value === undefined) {
          processedValue = null;
        } else {
          // Normalizar números em formato brasileiro (ex: 12.345,67 -> 12345.67)
          const raw = typeof value === 'string' ? value : String(value);
          let normalized = raw
            .replace(/\s/g, '') // remover espaços
            .replace(/[R$\u00A0]/g, ''); // remover símbolos de moeda e nbsp
          if (normalized.includes(',')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
          }
          const numValue = Number(normalized);
          
          // Validação adicional: valores monetários devem ser positivos
          if ((field === 'monthly_revenue' || field === 'implementation_value') && numValue < 0) {
            toast.error('Valores monetários devem ser positivos');
            setLoading(false);
            return;
          }
          
          // Validação: health_score deve estar entre 0 e 100
          if (field === 'health_score' && (numValue < 0 || numValue > 100)) {
            toast.error('Health Score deve estar entre 0 e 100');
            setLoading(false);
            return;
          }
          
          // Validação: satisfacao_cliente deve estar entre 0 e 10
          if (field === 'satisfacao_cliente' && (numValue < 0 || numValue > 10)) {
            toast.error('Satisfação do Cliente deve estar entre 0 e 10');
            setLoading(false);
            return;
          }
          
          processedValue = isNaN(numValue) ? null : numValue;
        }
      }

      const updates: any = { [field]: processedValue };
      
      // Se estiver atualizando company_name ou faturamento_display, atualizar o título também
      if (field === 'company_name' || field === 'faturamento_display') {
        const companyName = field === 'company_name' ? processedValue : card.company_name;
        const faturamento = field === 'faturamento_display' ? processedValue : (card as any).faturamento_display;
        
        // Gerar novo título
        const newTitle = `${companyName || 'Sem nome'} - ${faturamento || 'Sem faturamento'}`;
        updates.title = newTitle;
      }

      const { error } = await supabase
        .from('csm_cards')
        .update(updates)
        .eq('id', card.id);

      if (error) throw error;

      // Registrar alteração no histórico
      const fieldDisplayName = fieldNameMap[field] || field;
      const oldValueFormatted = formatValueForHistory(field, oldValue);
      const newValueFormatted = formatValueForHistory(field, processedValue);
      
      // Normalizar valores para comparação (null, undefined e string vazia são tratados como iguais)
      const normalizeValue = (val: any) => {
        if (val === null || val === undefined || val === '') return null;
        return val;
      };
      
      const normalizedOldValue = normalizeValue(oldValue);
      const normalizedNewValue = normalizeValue(processedValue);
      
      // Só registrar se houve mudança real
      if (normalizedOldValue !== normalizedNewValue) {
        const historyNote = `${fieldDisplayName} alterado de "${oldValueFormatted}" para "${newValueFormatted}"`;
        
        try {
          const { error: historyError } = await supabase
            .from('csm_card_stage_history')
            .insert({
              card_id: card.id,
              stage_id: card.stage_id,
              entered_at: new Date().toISOString(),
              moved_by: (await supabase.auth.getUser()).data.user?.id,
              notes: historyNote,
              event_type: 'field_update'
            });
          
          if (historyError) {
            console.error('Erro ao registrar no histórico:', historyError);
            // Não bloquear a operação principal se o histórico falhar
          }
        } catch (historyErr) {
          console.error('Erro ao registrar no histórico:', historyErr);
        }
      }

      toast.success('Campo atualizado com sucesso!');
      
      // Atualizar o card local com todos os campos modificados
      Object.assign(card, updates);
      
      // Chamar callback de atualização se fornecido
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar campo:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao salvar informações no servidor';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar campos obrigatórios
  const checkRequiredFields = (cardData: any): string[] => {
    const missing: string[] = [];
    
    if (!cardData.receita_gerada_cliente && cardData.receita_gerada_cliente !== 0) {
      missing.push('receita_gerada_cliente');
    }
    if (!cardData.investimento_midia && cardData.investimento_midia !== 0) {
      missing.push('investimento_midia');
    }
    if (!cardData.teve_vendas) {
      missing.push('teve_vendas');
    }
    if (!cardData.teve_roas_maior_1) {
      missing.push('teve_roas_maior_1');
    }
    if (!cardData.teve_roi_maior_1) {
      missing.push('teve_roi_maior_1');
    }
    if (cardData.nota_nps === null || cardData.nota_nps === undefined) {
      missing.push('nota_nps');
    }
    
    return missing;
  };

  // Função para lidar com clique no botão perdido
  const handleLostClick = async () => {
    // Para CSM, verificar se existe solicitação de cancelamento pendente
    if (isCSMPipeline) {
      // Verificar se existe card de cancelamento pendente para este cliente
      const { data: pendingCancellations, error } = await supabase
        .from('cancellation_requests')
        .select('id, empresa, status, stage')
        .or(`card_id.eq.${card.id},empresa.ilike.${card.company_name || card.title}`)
        .not('status', 'eq', 'resolvido')
        .not('stage', 'eq', 'churned');

      if (!error && pendingCancellations && pendingCancellations.length > 0) {
        toast.error(
          'Não é possível registrar churn diretamente. Existe uma solicitação de cancelamento pendente no pipeline de Churn para este cliente. Finalize a tratativa antes de prosseguir.',
          { duration: 6000 }
        );
        return;
      }

      const missing = checkRequiredFields(card);
      
      if (missing.length > 0) {
        setMissingFields(missing);
        setShowRequiredFields(true);
      } else {
        setShowLostReasonDialog(true);
      }
    } else {
      // Pipelines não-CSM: abrir diretamente o dialog de motivo
      setShowLostReasonDialog(true);
    }
  };

  // Função para salvar campos obrigatórios e abrir dialog de motivo
  const handleSaveRequiredFields = async (data: RequiredFieldsData) => {
    setLoading(true);
    try {
      // Guardar valores antigos para o histórico
      const oldValues = {
        receita_gerada_cliente: (card as any).receita_gerada_cliente,
        investimento_midia: (card as any).investimento_midia,
        teve_vendas: (card as any).teve_vendas,
        teve_roas_maior_1: (card as any).teve_roas_maior_1,
        teve_roi_maior_1: (card as any).teve_roi_maior_1,
        nota_nps: (card as any).nota_nps,
      };
      
      // Atualizar os campos no card
      const { error } = await supabase
        .from('csm_cards')
        .update({
          receita_gerada_cliente: data.receita_gerada_cliente,
          investimento_midia: data.investimento_midia,
          teve_vendas: data.teve_vendas,
          teve_roas_maior_1: data.teve_roas_maior_1,
          teve_roi_maior_1: data.teve_roi_maior_1,
          nota_nps: data.nota_nps,
        })
        .eq('id', card.id);

      if (error) throw error;

      // Registrar alterações no histórico
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const changes: string[] = [];
      
      if (oldValues.receita_gerada_cliente !== data.receita_gerada_cliente) {
        changes.push(`Receita gerada ao cliente: ${formatValueForHistory('receita_gerada_cliente', data.receita_gerada_cliente)}`);
      }
      if (oldValues.investimento_midia !== data.investimento_midia) {
        changes.push(`Investimento em mídia: ${formatValueForHistory('investimento_midia', data.investimento_midia)}`);
      }
      if (oldValues.teve_vendas !== data.teve_vendas) {
        changes.push(`Teve vendas: ${data.teve_vendas}`);
      }
      if (oldValues.teve_roas_maior_1 !== data.teve_roas_maior_1) {
        changes.push(`Teve ROAS > 1: ${data.teve_roas_maior_1}`);
      }
      if (oldValues.teve_roi_maior_1 !== data.teve_roi_maior_1) {
        changes.push(`Teve ROI > 1: ${data.teve_roi_maior_1}`);
      }
      if (oldValues.nota_nps !== data.nota_nps) {
        changes.push(`Nota NPS: ${data.nota_nps}`);
      }
      
      if (changes.length > 0) {
        await supabase
          .from('csm_card_stage_history')
          .insert({
            card_id: card.id,
            stage_id: card.stage_id,
            entered_at: new Date().toISOString(),
            moved_by: userId,
            notes: `Campos obrigatórios preenchidos: ${changes.join(', ')}`,
            event_type: 'field_update'
          });
      }

      // Atualizar o card local
      Object.assign(card, data);

      // Fechar o dialog de campos obrigatórios
      setShowRequiredFields(false);

      // Abrir dialog de motivo de perda
      setShowLostReasonDialog(true);
    } catch (error) {
      console.error('Erro ao salvar campos obrigatórios:', error);
      toast.error('Erro ao salvar campos obrigatórios');
    } finally {
      setLoading(false);
    }
  };

  // Função para confirmar perda/churn com motivo e comentários
  const handleConfirmLost = async (motivo: string, comentarios: string) => {
    setLoading(true);
    try {
      // Buscar o pipeline de perdidos apropriado
      const lostPipelineName = isCSMPipeline ? 'Clientes Perdidos' : 'Leads Perdidos';
      
      const { data: pipelines, error: pipelineError } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .ilike('name', lostPipelineName)
        .limit(1);

      if (pipelineError) {
        console.error('Erro ao buscar pipeline:', pipelineError);
        throw pipelineError;
      }

      if (!pipelines || pipelines.length === 0) {
        toast.error(`Pipeline "${lostPipelineName}" não encontrado. Por favor, atualize a página.`);
        return;
      }

      const lostPipelineId = pipelines[0].id;

      // Buscar a primeira etapa do pipeline de perdidos (ordenada por position)
      const { data: lostStages, error: lostStageError } = await supabase
        .from('csm_stages')
        .select('id')
        .eq('pipeline_id', lostPipelineId)
        .order('position', { ascending: true })
        .limit(1);

      if (lostStageError) {
        console.error('Erro ao buscar etapa no pipeline perdidos:', lostStageError);
        toast.error('Erro ao encontrar etapa no pipeline perdidos');
        return;
      }

      if (!lostStages || lostStages.length === 0) {
        toast.error('Nenhuma etapa encontrada no pipeline perdidos');
        return;
      }

      const lostStage = lostStages[0];

      const dataPerda = new Date();

      // Atualizar o card com motivo, comentários, data de perda e mover para pipeline perdidos
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          motivo_perda: motivo,
          comentarios_perda: comentarios,
          data_perda: dataPerda.toISOString(),
          pipeline_id: lostPipelineId,
          stage_id: lostStage.id,
          churn: isCSMPipeline, // Marca como churn apenas se for pipeline CSM
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Registrar no histórico de etapas
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: card.id,
          stage_id: lostStage.id,
          entered_at: dataPerda.toISOString(),
          moved_by: userId,
          notes: `${isCSMPipeline ? 'Cliente marcado como churn' : 'Lead marcado como perdido'} - Motivo: ${motivo}${comentarios ? ` - ${comentarios}` : ''}`,
          event_type: isCSMPipeline ? 'churn' : 'lost'
        });

      // Criar atividade no histórico com o comentário da perda
      const { error: activityError } = await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: `${isCSMPipeline ? 'Cliente marcado como churn' : 'Lead marcado como perdido'} - ${motivo}`,
          description: comentarios,
          status: 'completed',
          completed_date: dataPerda.toISOString(),
          created_by: userId,
        });

      if (activityError) {
        console.error('Erro ao criar atividade:', activityError);
        // Não bloquear o fluxo se falhar ao criar atividade
      }

      toast.success(`${isCSMPipeline ? 'Cliente' : 'Lead'} marcado como ${isCSMPipeline ? 'churn' : 'perdido'} e movido para o pipeline "${lostPipelineName}"!`);
      
      // Executar automação se configurada
      await executeAutomation(card.pipeline_id, 'lost', card.id);
      
      setShowLostReasonDialog(false);
      onUpdate?.(); // Chamar apenas uma vez no final
      onClose();
    } catch (error) {
      console.error(`Erro ao marcar como ${isCSMPipeline ? 'churn' : 'perdido'}:`, error);
      toast.error(`Erro ao marcar como ${isCSMPipeline ? 'churn' : 'perdido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para duplicar o card
  const handleDuplicateCard = async () => {
    setLoading(true);
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Criar uma cópia do card (excluindo id, created_at, updated_at)
      const { id, created_at, updated_at, ...cardData } = card;
      
      // Criar novo card com os mesmos dados
      const { data: newCard, error } = await supabase
        .from('csm_cards')
        .insert({
          ...cardData,
          title: `${card.title} (Cópia)`,
          created_by: user.id,
          position: 0, // Colocar no início da coluna
        })
        .select()
        .single();

      if (error) throw error;

      // Criar histórico de etapa para o novo card
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: newCard.id,
          stage_id: card.stage_id,
          entered_at: new Date().toISOString(),
          moved_by: user.id,
          reason: 'Card duplicado',
        });

      // Registrar atividade no card original
      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: 'Card duplicado',
          description: `Uma cópia deste card foi criada: "${newCard.title}"`,
          status: 'completed',
          created_by: user.id,
        });

      toast.success('Card duplicado com sucesso!');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao duplicar card:', error);
      toast.error('Erro ao duplicar card');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir o card (move para funil "Leads Excluídos")
  const handleDeleteCard = async () => {
    if (!card) return;
    
    if (!confirm('Tem certeza que deseja excluir este lead? Ele será movido para o funil "Leads Excluídos".')) {
      return;
    }

    const cardIdToMove = card.id;
    // Determinar qual pipeline usar baseado no módulo
    const deletedPipelineName = moduleType === 'csm' ? 'Leads Excluídos CSM' : 'Leads Excluídos';
    
    setLoading(true);
    try {
      // Buscar o pipeline "Leads Excluídos" apropriado
      const { data: deletedPipeline } = await supabase
        .from('csm_pipelines')
        .select('id')
        .eq('name', deletedPipelineName)
        .maybeSingle();

      if (deletedPipeline) {
        // Pipeline existe: mover o card para lá
        const { data: deletedStage } = await supabase
          .from('csm_stages')
          .select('id')
          .eq('pipeline_id', deletedPipeline.id)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (deletedStage) {
          const { error: updateError } = await supabase
            .from('csm_cards')
            .update({ 
              pipeline_id: deletedPipeline.id,
              stage_id: deletedStage.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', cardIdToMove);

          if (updateError) throw updateError;

          // Registrar no histórico
          await supabase
            .from('csm_card_stage_history')
            .insert({
              card_id: cardIdToMove,
              stage_id: deletedStage.id,
              entered_at: new Date().toISOString(),
              moved_by: (await supabase.auth.getUser()).data.user?.id,
              notes: `Lead movido para ${deletedPipelineName}`,
              event_type: 'deleted'
            });

          toast.success(`Lead movido para "${deletedPipelineName}"`);
        } else {
          // Sem estágio no pipeline de excluídos: deletar permanentemente
          const { error: deleteError } = await supabase
            .from('csm_cards')
            .delete()
            .eq('id', cardIdToMove);
          if (deleteError) throw deleteError;
          toast.success('Lead excluído permanentemente');
        }
      } else {
        // Pipeline de excluídos não existe: deletar permanentemente
        const { error: deleteError } = await supabase
          .from('csm_cards')
          .delete()
          .eq('id', cardIdToMove);
        if (deleteError) throw deleteError;
        toast.success('Lead excluído permanentemente');
      }
      
      // CRÍTICO: Fechar o dialog IMEDIATAMENTE
      onClose();
      
      // Delay para garantir que o dialog fechou
      setTimeout(() => {
        onUpdate?.();
      }, 200);
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      toast.error('Erro ao excluir card');
      setLoading(false);
    }
  };

  // Função para buscar cards disponíveis para mesclar
  const fetchAvailableCards = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_cards')
        .select('id, title, company_name, pipeline_id')
        .neq('id', card.id) // Excluir o card atual
        .order('title');

      if (error) throw error;

      setAvailableCards(data || []);
      setShowMergeDialog(true);
    } catch (error) {
      console.error('Erro ao buscar cards:', error);
      toast.error('Erro ao buscar cards disponíveis');
    }
  };

  // Função para salvar novo upsell no histórico
  const handleSaveUpsell = async () => {
    if (!card || !newUpsellValue || newUpsellValue <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (newPaymentType === 'parcelado' && (!newInstallments || newInstallments < 2)) {
      toast.error('Informe o número de parcelas (mínimo 2)');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('csm_card_upsell_history')
        .insert({
          card_id: card.id,
          upsell_value: newUpsellValue,
          upsell_month: newUpsellMonth,
          upsell_year: newUpsellYear,
          notes: newUpsellNotes || null,
          recorded_by: user.user.id,
          upsell_type: newUpsellType,
          payment_type: newPaymentType,
          installments: newPaymentType === 'parcelado' ? newInstallments : null,
          start_month: newPaymentType === 'recorrente' ? newUpsellMonth : null,
          start_year: newPaymentType === 'recorrente' ? newUpsellYear : null,
        });

      if (error) throw error;

      // Registrar atividade
      const typeLabel = newUpsellType === 'upsell' ? 'Upsell' : 'Crosssell';
      const paymentLabel = newPaymentType === 'recorrente' ? 'Recorrente' : 
                          newPaymentType === 'parcelado' ? `Parcelado (${newInstallments}x)` : 
                          'Pagamento Único';
      
      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: `${typeLabel} registrado`,
          description: `${typeLabel} de R$ ${newUpsellValue.toFixed(2)} - ${paymentLabel} - ${new Date(newUpsellYear, newUpsellMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}. ${newUpsellNotes ? `Notas: ${newUpsellNotes}` : ''}`,
          status: 'completed',
          created_by: user.user.id,
        });

      toast.success(`${typeLabel} registrado com sucesso!`);
      
      // Recarregar histórico
      const { data: updatedHistory } = await supabase
        .from('csm_card_upsell_history')
        .select('*')
        .eq('card_id', card.id)
        .order('upsell_year', { ascending: false })
        .order('upsell_month', { ascending: false });

      setUpsellHistory(updatedHistory || []);
      
      // Limpar campos
      setNewUpsellValue(0);
      setNewUpsellNotes('');
      setNewUpsellType('upsell');
      setNewPaymentType('recorrente');
      setNewInstallments(null);
      
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar novo registro de variável
  const handleSaveVariable = async () => {
    if (!card || !newVariableValue || newVariableValue <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('csm_card_variable_history')
        .insert({
          card_id: card.id,
          variable_type: newVariableType,
          variable_value: newVariableValue,
          variable_month: newVariableMonth,
          variable_year: newVariableYear,
          notes: newVariableNotes || null,
          recorded_by: user.user.id,
        });

      if (error) throw error;

      // Registrar atividade
      const typeLabel = newVariableType === 'investimento' ? 'Investimento' : 'Venda';
      
      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: `${typeLabel} registrado`,
          description: `${typeLabel} de R$ ${newVariableValue.toFixed(2)} - ${new Date(newVariableYear, newVariableMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}. ${newVariableNotes ? `Notas: ${newVariableNotes}` : ''}`,
          status: 'completed',
          created_by: user.user.id,
        });

      toast.success(`${typeLabel} registrado com sucesso!`);
      
      // Recarregar histórico
      const { data: updatedHistory } = await supabase
        .from('csm_card_variable_history')
        .select('*')
        .eq('card_id', card.id)
        .order('variable_year', { ascending: false })
        .order('variable_month', { ascending: false });

      setVariableHistory((updatedHistory || []) as Array<{
        id: string;
        variable_type: 'investimento' | 'venda';
        variable_value: number;
        variable_month: number;
        variable_year: number;
        notes?: string;
        created_at: string;
      }>);
      
      // Limpar campos
      setNewVariableValue(0);
      setNewVariableNotes('');
      setNewVariableType('investimento');
      
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao salvar variável:', error);
      toast.error('Erro ao salvar registro de variável');
    } finally {
      setLoading(false);
    }
  };

  // Função para deletar upsell do histórico
  const handleDeleteUpsell = async (upsellId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de upsell?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('csm_card_upsell_history')
        .delete()
        .eq('id', upsellId);

      if (error) throw error;

      toast.success('Registro de upsell excluído');
      
      // Recarregar histórico
      const { data: updatedHistory } = await supabase
        .from('csm_card_upsell_history')
        .select('*')
        .eq('card_id', card.id)
        .order('upsell_year', { ascending: false })
        .order('upsell_month', { ascending: false });

      setUpsellHistory(updatedHistory || []);
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao excluir upsell:', error);
      toast.error('Erro ao excluir upsell');
    }
  };

  // Função para mesclar cards
  const handleMergeCards = async () => {
    if (!selectedMergeCard) {
      toast.error('Selecione um card para mesclar');
      return;
    }

    setLoading(true);
    try {
      // Buscar dados do card de destino
      const { data: targetCard, error: fetchError } = await supabase
        .from('csm_cards')
        .select('*')
        .eq('id', selectedMergeCard)
        .single();

      if (fetchError) throw fetchError;

      // Mesclar informações: manter as do card de destino, mas adicionar notas
      const mergedDescription = `${targetCard.description || ''}\n\n--- Mesclado de: ${card.title} ---\n${card.description || ''}`.trim();

      // Atualizar card de destino com informações mescladas
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          description: mergedDescription,
          // Manter valores maiores de MRR e implementação
          monthly_revenue: Math.max(targetCard.monthly_revenue || 0, card.monthly_revenue || 0),
          implementation_value: Math.max(targetCard.implementation_value || 0, card.implementation_value || 0),
        })
        .eq('id', selectedMergeCard);

      if (updateError) throw updateError;

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Registrar no histórico do card de destino
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: selectedMergeCard,
          stage_id: targetCard.stage_id,
          entered_at: new Date().toISOString(),
          moved_by: userId,
          notes: `Card "${card.title}" mesclado neste card - MRR: ${formatCurrency(Math.max(targetCard.monthly_revenue || 0, card.monthly_revenue || 0))}`,
          event_type: 'card_merged'
        });

      // Registrar atividade no card de destino
      await supabase
        .from('csm_activities')
        .insert({
          card_id: selectedMergeCard,
          activity_type: 'comment',
          title: `Card mesclado: ${card.title}`,
          description: `Informações do card "${card.title}" foram mescladas neste card.`,
          status: 'completed',
          created_by: userId,
        });

      // Excluir o card atual
      const { error: deleteError } = await supabase
        .from('csm_cards')
        .delete()
        .eq('id', card.id);

      if (deleteError) throw deleteError;

      toast.success('Cards mesclados com sucesso!');
      setShowMergeDialog(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao mesclar cards:', error);
      toast.error('Erro ao mesclar cards');
    } finally {
      setLoading(false);
    }
  };

  // Função para converter para lead (mover para SDR Principal)
  const handleConvertToLead = async () => {
    if (!confirm('Tem certeza que deseja converter este card para lead e movê-lo para o funil SDR Principal?')) {
      return;
    }

    setLoading(true);
    try {
      // Buscar o pipeline SDR Principal
      const { data: sdrPipeline, error: pipelineError } = await supabase
        .from('csm_pipelines')
        .select('id')
        .eq('name', 'SDR | Principal')
        .single();

      if (pipelineError) throw pipelineError;

      if (!sdrPipeline) {
        toast.error('Pipeline "SDR | Principal" não encontrado');
        return;
      }

      // Buscar a primeira etapa do pipeline SDR Principal
      const { data: firstStage, error: stageError } = await supabase
        .from('csm_stages')
        .select('id')
        .eq('pipeline_id', sdrPipeline.id)
        .order('position')
        .limit(1)
        .single();

      if (stageError) throw stageError;

      if (!firstStage) {
        toast.error('Nenhuma etapa encontrada no pipeline SDR Principal');
        return;
      }

      // Finalizar histórico da etapa atual
      await supabase
        .from('csm_card_stage_history')
        .update({ exited_at: new Date().toISOString() })
        .eq('card_id', card.id)
        .is('exited_at', null);

      // Mover o card para o pipeline SDR Principal
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          pipeline_id: sdrPipeline.id,
          stage_id: firstStage.id,
          position: 0,
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Criar histórico da nova etapa
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: card.id,
          stage_id: firstStage.id,
          entered_at: new Date().toISOString(),
          moved_by: (await supabase.auth.getUser()).data.user?.id,
          reason: 'Convertido para lead',
        });

      // Registrar atividade
      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: 'Convertido para lead',
          description: `Card foi convertido para lead e movido para o funil "SDR | Principal"`,
          status: 'completed',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      toast.success('Card convertido para lead com sucesso!');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao converter para lead:', error);
      toast.error('Erro ao converter para lead');
    } finally {
      setLoading(false);
    }
  };

  // Função para reabrir card perdido - agora abre diálogo
  const handleReopenCard = async () => {
    setLoading(true);
    try {
      // Carregar pipelines disponíveis (excluindo os de perdidos/excluídos)
      const { data: pipelines, error } = await supabase
        .from('csm_pipelines')
        .select('id, name')
        .eq('is_active', true)
        .order('position');

      if (error) throw error;

      const filteredPipelines = (pipelines || []).filter(p => 
        !p.name.toLowerCase().includes('perdido') &&
        !p.name.toLowerCase().includes('excluído') &&
        !p.name.toLowerCase().includes('excluido') &&
        !p.name.toLowerCase().includes('ganho')
      );

      setReopenPipelines(filteredPipelines);
      setSelectedReopenPipeline('');
      setSelectedReopenStage('');
      setReopenStages([]);
      setShowReopenDialog(true);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      toast.error('Erro ao carregar pipelines');
    } finally {
      setLoading(false);
    }
  };

  // Carregar estágios ao selecionar pipeline de reabertura
  const handleReopenPipelineChange = async (pipelineId: string) => {
    setSelectedReopenPipeline(pipelineId);
    setSelectedReopenStage('');
    
    if (!pipelineId) {
      setReopenStages([]);
      return;
    }

    try {
      const { data: stages, error } = await supabase
        .from('csm_stages')
        .select('id, name')
        .eq('pipeline_id', pipelineId)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      setReopenStages(stages || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast.error('Erro ao carregar etapas');
    }
  };

  // Executar reabertura do card
  const executeReopenCard = async () => {
    if (!selectedReopenPipeline || !selectedReopenStage) {
      toast.error('Selecione o funil e a etapa');
      return;
    }

    setLoading(true);
    try {
      const dataReabertura = new Date();
      const selectedPipelineName = reopenPipelines.find(p => p.id === selectedReopenPipeline)?.name || '';

      // Finalizar histórico da etapa atual
      await supabase
        .from('csm_card_stage_history')
        .update({ exited_at: dataReabertura.toISOString() })
        .eq('card_id', card.id)
        .is('exited_at', null);

      // Atualizar o card - mover para pipeline e etapa selecionados
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          motivo_perda: null,
          comentarios_perda: null,
          data_perda: null,
          pipeline_id: selectedReopenPipeline,
          stage_id: selectedReopenStage,
          position: 0,
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Criar histórico da nova etapa
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: card.id,
          stage_id: selectedReopenStage,
          entered_at: dataReabertura.toISOString(),
          moved_by: (await supabase.auth.getUser()).data.user?.id,
          reason: 'Card reaberto',
        });

      // Criar atividade no histórico
      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: 'Card reaberto',
          description: `Card foi reaberto e movido para o funil "${selectedPipelineName}" em ${dataReabertura.toLocaleString('pt-BR')}`,
          status: 'completed',
          completed_date: dataReabertura.toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      toast.success(`Card reaberto com sucesso e movido para "${selectedPipelineName}"!`);
      setShowReopenDialog(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao reabrir card:', error);
      toast.error('Erro ao reabrir card');
    } finally {
      setLoading(false);
    }
  };

  // Verificar campos obrigatórios para ganho
  const checkWinRequirements = async () => {
    if (!card) return;

    try {
      // Buscar configurações de campos obrigatórios E perguntas de briefing para este pipeline
      const { data: config, error } = await supabase
        .from("pipeline_required_fields")
        .select("required_fields, briefing_questions")
        .eq("pipeline_id", card.pipeline_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      // Verificar campos obrigatórios para este pipeline
      const requiredFields = Array.isArray(config?.required_fields) ? (config.required_fields as string[]) : [];
      const briefingQuestions = Array.isArray(config?.briefing_questions)
        ? (config.briefing_questions as Array<{ id: string; question: string }>)
        : [];

      // Verificar se existe automação com transferência obrigatória de propriedade
      const { data: automation } = await supabase
        .from("pipeline_automations")
        .select("require_owner_transfer")
        .eq("source_pipeline_id", card.pipeline_id)
        .eq("trigger_event", "won")
        .eq("is_active", true)
        .maybeSingle();

      const automationRequiresTransfer = !!automation?.require_owner_transfer;

      // Se não há campos obrigatórios, nem briefing, e também não há transferência obrigatória, seguir direto
      if (requiredFields.length === 0 && briefingQuestions.length === 0 && !automationRequiresTransfer) {
        await moveToSpecialList("ganho");
        return;
      }

      // Verificar se algum campo obrigatório está vazio
      const missing: string[] = [];
      requiredFields.forEach((field) => {
        // Para tags, sempre marcar como pendente (será verificado no dialog)
        if (field === "tags") {
          // Não adicionar como missing aqui, deixar o dialog validar
          return;
        }
        
        // Para qualification_score, verificar se pelo menos uma nota foi preenchida
        if (field === "qualification_score") {
          const hasAnyScore =
            (card.qual_nicho_certo !== null && card.qual_nicho_certo !== undefined) ||
            (card.qual_porte_empresa !== null && card.qual_porte_empresa !== undefined) ||
            (card.qual_tomador_decisao !== null && card.qual_tomador_decisao !== undefined) ||
            (card.qual_investe_marketing !== null && card.qual_investe_marketing !== undefined) ||
            (card.qual_urgencia_real !== null && card.qual_urgencia_real !== undefined) ||
            (card.qual_clareza_objetivos !== null && card.qual_clareza_objetivos !== undefined);

          if (!hasAnyScore) {
            missing.push(field);
          }
        } else {
          const value = (card as any)[field];
          if (!value || value === "" || value === 0) {
            missing.push(field);
          }
        }
      });

      // Verificar se há perguntas de briefing não respondidas
      const currentBriefingAnswers = (card.briefing_answers as any) || {};
      const missingBriefing = briefingQuestions.filter(
        (q) => !currentBriefingAnswers[q.id] || currentBriefingAnswers[q.id].trim() === ""
      );

      // Para CSM, seguir direto com o processo de ganho
      await moveToSpecialList("ganho");
    } catch (error) {
      console.error("Error checking win requirements:", error);
      toast.error("Erro ao verificar campos obrigatórios");
    }
  };

  // Função para mover card para lista especial (ganho)
  const moveToSpecialList = async (status: 'ganho' | 'perdido', selectedOwner?: string | null) => {
    // Evitar execuções paralelas
    if (automationRunningRef.current) {
      console.log('[moveToSpecialList] Automação já em execução, ignorando');
      return;
    }
    automationRunningRef.current = true;
    
    setLoading(true);
    try {
      const triggerEvent = status === 'ganho' ? 'won' : 'lost';
      
      // Verificar se existe automação configurada
      const { data: automations } = await supabase
        .from("pipeline_automations")
        .select("*")
        .eq("source_pipeline_id", card.pipeline_id)
        .eq("trigger_event", triggerEvent)
        .eq("is_active", true);

      // Se houver automação, apenas executá-la (card será movido, não arquivado)
      if (automations && automations.length > 0) {
        const ownerToUse = selectedOwner ?? card.assigned_to ?? null;
        console.log('[Automation] Executando automação de ganho/perda', {
          status,
          triggerEvent,
          selectedOwner,
          cardAssignedTo: card.assigned_to,
          ownerToUse,
        });

        await executeAutomation(card.pipeline_id, triggerEvent, card.id, ownerToUse);

        // Garantir que o proprietário selecionado permaneça após a automação
        if (ownerToUse) {
          console.log('[Automation] Reforçando assigned_to após automação com ownerToUse:', ownerToUse);
          await supabase
            .from("csm_cards")
            .update({ assigned_to: ownerToUse, updated_at: new Date().toISOString() })
            .eq("id", card.id);
        }

        // Criar histórico de etapa para o card movido (verificar se já existe antes)
        const { data: updatedCard } = await supabase
          .from("csm_cards")
          .select("stage_id")
          .eq("id", card.id)
          .single();

        if (updatedCard) {
          // Verificar se já existe um registro idêntico nos últimos 60 segundos
          const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
          const { data: existingHistory } = await supabase
            .from("csm_card_stage_history")
            .select("id")
            .eq("card_id", card.id)
            .eq("stage_id", updatedCard.stage_id)
            .eq("notes", "Card movido automaticamente via automação de funil")
            .gte("entered_at", oneMinuteAgo)
            .limit(1);

          // Só criar se não existir registro recente
          if (!existingHistory || existingHistory.length === 0) {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
              .from("csm_card_stage_history")
              .insert({
                card_id: card.id,
                stage_id: updatedCard.stage_id,
                entered_at: new Date().toISOString(),
                moved_by: user?.id,
                notes: "Card movido automaticamente via automação de funil",
                event_type: "stage_change",
              });
          } else {
            console.log('[moveToSpecialList] Histórico de automação já existe, pulando criação');
          }
        }

        onUpdate?.(); // Chamar apenas uma vez no final
        onClose();
        return;
      }
      
      // Se NÃO houver automação, seguir fluxo normal de arquivamento
      // Criar uma entrada na tabela de clientes ganhos/perdidos
      const { error: insertError } = await supabase
        .from('csm_special_lists' as any)
        .insert({
          original_card_id: card.id,
          card_title: card.title,
          company_name: card.company_name,
          contact_name: card.contact_name,
          contact_email: card.contact_email,
          contact_phone: card.contact_phone,
          value: card.monthly_revenue, // Usando monthly_revenue como valor unificado
          monthly_revenue: card.monthly_revenue,
          implementation_value: card.implementation_value,
          niche: card.niche,
          description: card.description,
          list_type: status,
          created_by: card.created_by,
          pipeline_id: card.pipeline_id
        });

      if (insertError) throw insertError;

      // Remover o card da tabela principal DEPOIS da automação
      const { error: deleteError } = await supabase
        .from('csm_cards')
        .delete()
        .eq('id', card.id);

      if (deleteError) throw deleteError;

      toast(`Lead arquivado em ${status === 'ganho' ? 'Clientes Ganhos' : 'Clientes Perdidos'}!`);
      
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error(`Erro ao mover para ${status}:`, error);
      toast(`Erro ao mover para ${status}`);
    } finally {
      setLoading(false);
      automationRunningRef.current = false;
    }
  };

  // Função para mudar estágio
  const changeStage = async (newStageId: string) => {
    await updateCardField('stage_id', newStageId);
  };

  // Função para mover card para outro pipeline
  const moveToPipeline = async (newPipelineId: string) => {
    if (!card || !newPipelineId) return;

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Buscar o primeiro estágio do pipeline de destino
      const { data: firstStage, error: stageError } = await supabase
        .from('csm_stages')
        .select('id')
        .eq('pipeline_id', newPipelineId)
        .eq('is_active', true)
        .order('position')
        .limit(1)
        .single();

      if (stageError || !firstStage) {
        throw new Error('Não foi possível encontrar um estágio no pipeline de destino');
      }

      // Atualizar o card para o novo pipeline e primeiro estágio
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          pipeline_id: newPipelineId,
          stage_id: firstStage.id,
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: card.id,
          stage_id: firstStage.id,
          entered_at: new Date().toISOString(),
          moved_by: user.user.id,
          event_type: 'pipeline_change',
          notes: `Card movido do pipeline ${currentPipelineInfo?.name} para o novo pipeline`,
        });

      // Registrar atividade
      const { data: targetPipeline } = await supabase
        .from('csm_pipelines')
        .select('name')
        .eq('id', newPipelineId)
        .single();

      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: 'Card movido para outro funil',
          description: `Card movido do funil "${currentPipelineInfo?.name}" para "${targetPipeline?.name}"`,
          status: 'completed',
          created_by: user.user.id,
        });

      toast.success('Card movido para o novo funil com sucesso!');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao mover card para outro pipeline:', error);
      toast.error('Erro ao mover card para outro funil');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para mover card para outro pipeline CSM com estágio específico
  const moveToCSMPipelineStage = async (newStageId: string) => {
    if (!card || !selectedCsmPipeline || !newStageId) return;

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Atualizar o card para o novo pipeline e estágio selecionado
      const { error: updateError } = await supabase
        .from('csm_cards')
        .update({
          pipeline_id: selectedCsmPipeline,
          stage_id: newStageId,
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: card.id,
          stage_id: newStageId,
          entered_at: new Date().toISOString(),
          moved_by: user.user.id,
          event_type: 'pipeline_change',
          notes: `Card movido do pipeline ${currentPipelineInfo?.name}`,
        });

      // Registrar atividade
      const { data: targetPipeline } = await supabase
        .from('csm_pipelines')
        .select('name')
        .eq('id', selectedCsmPipeline)
        .single();
      
      const targetStage = csmPipelineStages.find(s => s.id === newStageId);

      await supabase
        .from('csm_activities')
        .insert({
          card_id: card.id,
          activity_type: 'comment',
          title: 'Card movido para outro funil',
          description: `Card movido do funil "${currentPipelineInfo?.name}" para "${targetPipeline?.name}" - Etapa: ${targetStage?.name}`,
          status: 'completed',
          created_by: user.user.id,
        });

      toast.success('Card movido com sucesso!');
      setSelectedCsmPipeline('');
      setCsmPipelineStages([]);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Erro ao mover card para outro pipeline:', error);
      toast.error('Erro ao mover card para outro funil');
    } finally {
      setLoading(false);
    }
  };

  // Encontrar estágio atual - só calcula se card existir
  const currentStage = card ? stages.find(stage => stage.id === card.stage_id) : undefined;
  const currentStageIndex = card ? stages.findIndex(stage => stage.id === card.stage_id) : -1;

  // O Dialog DEVE ser renderizado mesmo com card null para que o Radix feche o overlay corretamente
  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`w-screen h-screen max-w-none max-h-none overflow-hidden p-0 [&>button]:hidden bg-card rounded-none border-0 flex flex-col`}>
        {/* Se não tem card, renderiza conteúdo mínimo para permitir fechamento */}
        {!card ? (
          <DialogHeader className="p-4">
            <h2 className="text-lg font-semibold text-foreground sr-only">Carregando</h2>
            <p className="text-muted-foreground">Carregando...</p>
          </DialogHeader>
        ) : isMobile ? (
          /* ======================= MOBILE LAYOUT ======================= */
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/20">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-base font-semibold text-foreground truncate flex-1">{card.company_name || card.title}</h2>
            </div>

            {/* Mobile Action Bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border overflow-x-auto">
              {/* Proprietário - takes available space */}
              <Select
                value={card.assigned_to || 'none'}
                onValueChange={(value) => updateCardField('assigned_to', value === 'none' ? null : value)}
              >
                <SelectTrigger className="flex-1 min-w-[140px] max-w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Sem..." />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-[50vh]">
                  <SelectItem value="none">Sem proprietário</SelectItem>
                  {moduleType === 'csm' ? (
                    <>
                      {users.filter(u => u.effectiveRole === 'admin').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Admin</div>
                          {users.filter(u => u.effectiveRole === 'admin').map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'cs').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">CS</div>
                          {users.filter(u => u.customRoleName === 'cs').map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'head_de_projetos').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Head</div>
                          {users.filter(u => u.customRoleName === 'head_de_projetos').map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'project_owner').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">PO</div>
                          {users.filter(u => u.customRoleName === 'project_owner').map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Spacer to push action buttons right */}
              <div className="flex-1" />

              {/* Botão Ganho */}
              {!pipelineName?.toLowerCase().includes('ativos') && 
               !pipelineName?.toLowerCase().includes('perdidos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkWinRequirements()}
                  className="bg-green-600 text-white hover:bg-green-700 border-green-600 h-8 shrink-0"
                  disabled={loading}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  Ganho
                </Button>
              )}
              {/* Botão Reabrir */}
              {pipelineName?.toLowerCase().includes('perdidos') && (
                <Button variant="outline" size="sm" onClick={handleReopenCard} className="bg-muted border-border text-foreground h-8 shrink-0" disabled={loading}>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Reabrir
                </Button>
              )}
              {/* Botão Perdido/Churn */}
              {!pipelineName?.toLowerCase().includes('perdidos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLostClick}
                  className="bg-red-600 text-white hover:bg-red-700 border-red-600 h-8 shrink-0"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {isCSMPipeline ? 'Churn' : 'Perdido'}
                </Button>
              )}

              {/* Menu 3 pontos */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" disabled={loading}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                  <DropdownMenuItem onClick={handleDuplicateCard}>
                    <Copy className="h-4 w-4 mr-2" />Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchAvailableCards}>
                    <GitMerge className="h-4 w-4 mr-2" />Mesclar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleConvertToLead}>
                    <ArrowRight className="h-4 w-4 mr-2" />Converter para lead
                  </DropdownMenuItem>
                  {(profile?.is_global_admin || profile?.role === 'admin') && (
                    <DropdownMenuItem onClick={handleDeleteCard} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Tabs */}
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'dados' | 'atividades')} className="flex flex-col flex-1 min-h-0">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="dados" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:shadow-none py-2.5 text-sm"
                >
                  Dados
                </TabsTrigger>
                <TabsTrigger 
                  value="atividades" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:shadow-none py-2.5 text-sm"
                >
                  Atividades
                </TabsTrigger>
              </TabsList>

              {/* Dados Tab */}
              <TabsContent value="dados" className="flex-1 overflow-y-auto m-0 p-0">
                <div className="p-3 pb-20">
                  {/* Stage select */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium">Etapa:</span>
                    <Select value={card.stage_id} onValueChange={changeStage} disabled={loading}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 text-[0.75rem]">
                    {/* Reuse all the same collapsible sections from desktop left column */}
                    {/* Seção Resumo */}
                    <Collapsible open={sectionStates.resumo} onOpenChange={() => toggleSection('resumo')}>
                      <div className="space-y-1 p-1.5 bg-primary/5 rounded-md border border-primary/20">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-0">
                            <h4 className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                              Resumo
                              {sectionStates.resumo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                            </h4>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1">
                          <EditableField value={card.company_name} onSave={(value) => updateCardField('company_name', value)} label="Nome da empresa" icon={<Building2 className="h-3 w-3 text-primary" />} placeholder="Nome da empresa" compact />
                          <div className="space-y-0">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span>MRR</span>
                            </div>
                            <MRRInput value={card.monthly_revenue} onChange={(value) => updateCardField('monthly_revenue', value)} placeholder="Ex: R$ 5.000,00" compact />
                          </div>
                          <Separator className="my-1" />
                          <div className="space-y-0">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Tag className="h-3 w-3 text-blue-600" />
                              <span>Categoria de MRR</span>
                            </div>
                            <Select value={card.categoria || 'none'} onValueChange={(value) => updateCardField('categoria', value === 'none' ? null : value)}>
                              <SelectTrigger className={`w-full h-6 text-[10px] ${card.categoria === 'MRR Vendido' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : card.categoria === 'MRR Recorrente' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : ''}`}>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="MRR Vendido">MRR Vendido</SelectItem>
                                <SelectItem value="MRR Recorrente">MRR Recorrente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {moduleType === 'csm' && (
                            <>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <User className="h-3 w-3 text-cyan-600" />
                                  <span>Squad</span>
                                </div>
                                <Select value={card.squad || 'none'} onValueChange={(value) => updateCardField('squad', value === 'none' ? null : value)}>
                                  <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Selecione o squad" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    <SelectItem value="Apollo">Apollo</SelectItem>
                                    <SelectItem value="Ares">Ares</SelectItem>
                                    <SelectItem value="Artemis">Artemis</SelectItem>
                                    <SelectItem value="Athena">Athena</SelectItem>
                                    <SelectItem value="Atlas">Atlas</SelectItem>
                                    <SelectItem value="Aurora">Aurora</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Target className="h-3 w-3 text-orange-600" />
                                  <span>Plano</span>
                                </div>
                                <Select value={card.plano || 'none'} onValueChange={(value) => updateCardField('plano', value === 'none' ? null : value)}>
                                  <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    <SelectItem value="Starter">Starter</SelectItem>
                                    <SelectItem value="Business">Business</SelectItem>
                                    <SelectItem value="Pro">Pro</SelectItem>
                                    <SelectItem value="Social">Social</SelectItem>
                                    <SelectItem value="Conceito">Conceito</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Flag className="h-3 w-3" />
                                  <span>Flag</span>
                                </div>
                                <Select value={(card as any).flag || 'none'} onValueChange={(value) => updateCardField('flag', value === 'none' ? null : value)}>
                                  <SelectTrigger className={`w-full h-6 text-[10px] ${(card as any).flag === 'verde' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : (card as any).flag === 'amarela' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' : (card as any).flag === 'vermelha' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' : ''}`}>
                                    <SelectValue placeholder="Selecione a flag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    <SelectItem value="verde">Verde</SelectItem>
                                    <SelectItem value="amarela">Amarela</SelectItem>
                                    <SelectItem value="vermelha">Vermelha</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <GitMerge className="h-3 w-3 text-indigo-600" />
                                  <span>Fase do projeto</span>
                                </div>
                                <Select value={(card as any).fase_projeto || 'none'} onValueChange={(value) => updateCardField('fase_projeto', value === 'none' ? null : value)}>
                                  <SelectTrigger className="w-full h-6 text-[10px]"><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                                    <SelectItem value="Implementação">Implementação</SelectItem>
                                    <SelectItem value="Refinamento">Refinamento</SelectItem>
                                    <SelectItem value="Escala">Escala</SelectItem>
                                    <SelectItem value="Expansão">Expansão</SelectItem>
                                    <SelectItem value="Renovação">Renovação</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                          <Separator className="my-1" />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Tag className="h-3 w-3 text-amber-600" />
                              <span>Etiquetas</span>
                            </div>
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {cardTags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-[9px] cursor-pointer hover:opacity-80 px-1 py-0" style={{ backgroundColor: `${tag.color}15`, borderColor: `${tag.color}40`, color: tag.color }} onClick={() => toggleCardTag(tag.id)}>
                                  {tag.name}<X className="ml-0.5 h-2.5 w-2.5" />
                                </Badge>
                              ))}
                              {cardTags.length === 0 && <p className="text-[9px] text-muted-foreground">Nenhuma etiqueta</p>}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Informações Contratuais - CSM */}
                    {moduleType === 'csm' && (
                      <Collapsible open={sectionStates.contratuais} onOpenChange={() => toggleSection('contratuais')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                Informações Contratuais
                                {sectionStates.contratuais ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Target className="h-4 w-4 text-orange-600" /><span>Plano</span></div>
                              <Select value={card.plano || 'none'} onValueChange={(value) => updateCardField('plano', value === 'none' ? null : value)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  <SelectItem value="Starter">Starter</SelectItem>
                                  <SelectItem value="Business">Business</SelectItem>
                                  <SelectItem value="Pro">Pro</SelectItem>
                                  <SelectItem value="Social">Social</SelectItem>
                                  <SelectItem value="Conceito">Conceito</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Settings className="h-4 w-4 text-blue-600" /><span>Serviço contratado</span></div>
                              <Select value={(card as any).servico_contratado || 'none'} onValueChange={(value) => updateCardField('servico_contratado', value === 'none' ? null : value)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  <SelectItem value="social">Social</SelectItem>
                                  <SelectItem value="perfomance">Perfomance</SelectItem>
                                  <SelectItem value="social & perfomance">Social & Perfomance</SelectItem>
                                  <SelectItem value="ID Visual">ID Visual</SelectItem>
                                  <SelectItem value="Site">Site</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Calendar className="h-4 w-4 text-green-600" /><span>Tempo de contrato</span></div>
                              <Select value={(card as any).tempo_contrato || 'none'} onValueChange={(value) => updateCardField('tempo_contrato', value === 'none' ? null : value)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o tempo" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  <SelectItem value="1 mês">1 mês</SelectItem>
                                  <SelectItem value="3 meses">3 meses</SelectItem>
                                  <SelectItem value="6 meses">6 meses</SelectItem>
                                  <SelectItem value="12 meses">12 meses</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Calendar className="h-4 w-4 text-purple-600" /><span>Frequência de reunião</span></div>
                              <Select value={(card as any).frequencia_reuniao || 'none'} onValueChange={(value) => updateCardField('frequencia_reuniao', value === 'none' ? null : value)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  <SelectItem value="semanal">Semanal</SelectItem>
                                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                  <SelectItem value="mensal">Mensal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><DollarSign className="h-4 w-4 text-yellow-600" /><span>Limite de investimento</span></div>
                              <MRRInput value={(card as any).limite_investimento} onChange={(value) => updateCardField('limite_investimento', value)} placeholder="Ex: R$ 10.000,00" />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* UPSELL/CROSSELL - CSM */}
                    {moduleType === 'csm' && (
                      <Collapsible open={sectionStates.upsells} onOpenChange={() => toggleSection('upsells')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                UPSELL/CROSSELL
                                {sectionStates.upsells ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <UpsellManager cardId={card.id} upsellHistory={upsellHistory} />
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Variável Investimento - CSM */}
                    {moduleType === 'csm' && (
                      <Collapsible open={sectionStates.variables} onOpenChange={() => toggleSection('variables')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 truncate">
                                Variável sobre investimento
                                {sectionStates.variables ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <VariableManager cardId={card.id} variableHistory={variableHistory} filterType="investimento" />
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Variável Vendas - CSM */}
                    {moduleType === 'csm' && (
                      <Collapsible open={sectionStates.variablesSales} onOpenChange={() => toggleSection('variablesSales')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 truncate">
                                Variável sobre Vendas
                                {sectionStates.variablesSales ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <VariableManager cardId={card.id} variableHistory={variableHistory} filterType="venda" />
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Performance - CSM */}
                    {moduleType === 'csm' && (
                      <Collapsible open={sectionStates.performance} onOpenChange={() => toggleSection('performance')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Performance
                                {sectionStates.performance ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-2">
                            <PerformanceManager cardId={card.id} performanceHistory={performanceHistory} />
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Informações base */}
                    <Collapsible open={sectionStates.contato} onOpenChange={() => toggleSection('contato')}>
                      <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                              Informações base
                              {sectionStates.contato ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </h4>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2">
                          <EditableField value={card.contact_name} onSave={(value) => updateCardField('contact_name', value)} label="Nome do Cliente" icon={<User className="h-4 w-4 text-purple-600" />} placeholder="Nome do cliente" />
                          <Separator className="my-3" />
                          <EditableField value={card.company_name} onSave={(value) => updateCardField('company_name', value)} label="Nome da Empresa" icon={<Building2 className="h-4 w-4 text-primary" />} placeholder="Nome da empresa" />
                          <Separator className="my-3" />
                          <EditableField value={(card as any).instagram} onSave={(value) => updateCardField('instagram', value)} label="Instagram" icon={<Globe className="h-4 w-4 text-pink-600" />} placeholder="@usuario" />
                          <Separator className="my-3" />
                          <EditableField value={card.contact_email} onSave={(value) => updateCardField('contact_email', value)} type="email" label="E-mail" icon={<Mail className="h-4 w-4 text-orange-600" />} placeholder="email@empresa.com.br" />
                          <Separator className="my-3" />
                          <EditableField value={card.contact_phone} onSave={(value) => updateCardField('contact_phone', value)} type="tel" label="Telefone" icon={<Phone className="h-4 w-4 text-green-600" />} placeholder="(11) 99999-9999" />
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Briefing Operacional */}
                    {(moduleType === 'csm' || briefingQuestions.length > 0 || Object.keys(briefingAnswers).length > 0) && (
                      <Collapsible open={sectionStates.briefing} onOpenChange={() => toggleSection('briefing')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                                Briefing Operacional
                                {sectionStates.briefing ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3">
                            {briefingQuestions.length === 0 && Object.keys(briefingAnswers).length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhuma pergunta configurada.</p>
                            ) : briefingQuestions.map((q, index) => {
                              const rawAnswer = briefingAnswers[q.id] || "";
                              const formattedAnswer = rawAnswer && /^\d{4}-\d{2}-\d{2}T/.test(rawAnswer) 
                                ? (() => { try { return new Date(rawAnswer).toLocaleDateString('pt-BR'); } catch { return rawAnswer; } })()
                                : rawAnswer;
                              return (
                                <div key={q.id} className="space-y-1.5">
                                  <Label className="text-sm font-medium">{index + 1}. {q.question}</Label>
                                  <div className="px-3 py-2 bg-muted/30 border border-border rounded-md">
                                    <p className="text-sm text-foreground whitespace-pre-wrap">
                                      {formattedAnswer || <span className="text-muted-foreground italic">Sem resposta</span>}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Informações de Perda */}
                    {(card.data_perda || card.motivo_perda) && (
                      <Collapsible open={sectionStates.perda} onOpenChange={() => toggleSection('perda')}>
                        <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                Informações de Perda
                                {sectionStates.perda ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </h4>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2">
                            {card.data_perda && (
                              <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">{formatDate(card.data_perda)}</p>
                              </div>
                            )}
                            {card.motivo_perda && (
                              <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">{card.motivo_perda}</p>
                                {card.comentarios_perda && <p className="text-xs text-red-600 dark:text-red-500 mt-2 pt-2 border-t border-red-200 dark:border-red-900/50">{card.comentarios_perda}</p>}
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Atividades Tab */}
              <TabsContent value="atividades" className="flex-1 overflow-y-auto m-0 p-0">
                <CardHistoryAndActivities cardId={card.id} stageId={card.stage_id} stages={stages} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
        /* ======================= DESKTOP LAYOUT (unchanged) ======================= */
        <>
        {/* Header com botão de fechar */}
        <DialogHeader className="p-3 md:p-4 pb-2 md:pb-3 border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
            <div className="flex-1 md:mr-4">
              <h2 className="text-base md:text-lg font-semibold text-foreground line-clamp-2 md:line-clamp-1">{card.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Proprietário */}
              <Select
                value={card.assigned_to || 'none'}
                onValueChange={(value) => updateCardField('assigned_to', value === 'none' ? null : value)}
              >
                <SelectTrigger className="w-[140px] md:w-[180px] h-9 md:h-8 text-xs">
                  <SelectValue placeholder="Proprietário" />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-[50vh]">
                  <SelectItem value="none">Sem proprietário</SelectItem>
                  {moduleType === 'csm' ? (
                    <>
                      {/* Exibir grupos para CSM */}
                      {users.filter(u => u.effectiveRole === 'admin').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Administradores</div>
                          {users.filter(u => u.effectiveRole === 'admin').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'cs').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">CS</div>
                          {users.filter(u => u.customRoleName === 'cs').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'head_de_projetos').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Head de Projetos</div>
                          {users.filter(u => u.customRoleName === 'head_de_projetos').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.customRoleName === 'project_owner').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">PO</div>
                          {users.filter(u => u.customRoleName === 'project_owner').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Exibir grupos para CSM */}
                      {users.filter(u => u.effectiveRole === 'admin').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Administradores</div>
                          {users.filter(u => u.effectiveRole === 'admin').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {users.filter(u => u.effectiveRole !== 'admin').length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Equipe</div>
                          {users.filter(u => u.effectiveRole !== 'admin').map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Botão Ganho - ocultar em "Clientes ativos" e "Clientes Perdidos" */}
              {!pipelineName?.toLowerCase().includes('ativos') && 
               !pipelineName?.toLowerCase().includes('perdidos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkWinRequirements()}
                  className="bg-green-600 text-white hover:bg-green-700 border-green-600 h-8"
                  disabled={loading}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  Ganho
                </Button>
              )}
              {/* Botão Reabrir - mostrar apenas em "Clientes Perdidos" */}
              {pipelineName?.toLowerCase().includes('perdidos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopenCard}
                  className="bg-muted border-border text-foreground hover:bg-muted/80 h-8"
                  disabled={loading}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Reabrir
                </Button>
              )}
              {/* Botão Perdido/Churn - ocultar apenas em "Clientes Perdidos" */}
              {!pipelineName?.toLowerCase().includes('perdidos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLostClick}
                  className="bg-red-600 text-white hover:bg-red-700 border-red-600 h-8"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {isCSMPipeline ? 'Churn' : 'Perdido'}
                </Button>
              )}

              {/* Menu de opções com 3 pontos */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={loading}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                  <DropdownMenuItem onClick={handleDuplicateCard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchAvailableCards}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Mesclar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleConvertToLead}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Converter para lead
                  </DropdownMenuItem>
                  {(profile?.is_global_admin || profile?.role === 'admin') && (
                    <DropdownMenuItem 
                      onClick={handleDeleteCard}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Separador visual */}
              <div className="w-px h-6 bg-border mx-2" />
              
              {/* Botão Fechar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Barra de progresso dos estágios */}
          <div className="mt-3 space-y-2">
            {/* Timeline estilo Pipedrive com setas conectadas */}
            <div className="flex items-stretch w-full overflow-x-auto">
              {isLoadingHistory ? (
                <div className="text-sm text-muted-foreground">Carregando histórico...</div>
              ) : (
                stages.map((stage, index) => {
                  const isCurrentStage = index === currentStageIndex;
                  const isPastStage = index < currentStageIndex;
                  const isFutureStage = index > currentStageIndex;
                  const daysInStage = stageHistory[stage.id] || 0;
                  const isLast = index === stages.length - 1;
                  
                  return (
                    <div 
                      key={stage.id}
                      className="relative flex-1 min-w-[80px] cursor-pointer group"
                      onClick={() => changeStage(stage.id)}
                      title={`Clique para mover para: ${stage.name}`}
                      style={{
                        clipPath: isLast 
                          ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)' 
                          : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)'
                      }}
                    >
                      <div 
                        className={`
                          h-12 flex items-center justify-center px-2 text-center transition-all text-white text-xs
                          ${isPastStage ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                          ${isCurrentStage ? 'bg-red-500 shadow-lg ring-2 ring-red-400/50 ring-offset-1' : ''}
                          ${isFutureStage ? 'bg-muted hover:bg-muted/80 text-muted-foreground' : ''}
                        `}
                      >
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <span className="text-xs font-bold leading-tight">
                            {daysInStage > 0 ? `${daysInStage} dias` : '0 dias'}
                          </span>
                          <span className="text-[10px] leading-tight opacity-90 truncate max-w-full px-1">
                            {stage.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Estágio atual:</span>
                <Select value={card.stage_id} onValueChange={changeStage} disabled={loading}>
                  <SelectTrigger className="w-40 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Seletor de Funil - para funis Closer e SDR */}
              {(currentPipelineInfo?.name?.toLowerCase().includes('closer') || currentPipelineInfo?.name?.toLowerCase().includes('sdr')) && availablePipelines.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Funil:</span>
                  <Select value="" onValueChange={moveToPipeline} disabled={loading}>
                    <SelectTrigger className="w-40 h-7 text-xs">
                      <SelectValue placeholder="Mover para..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Seletor de Funil e Etapa - para funil Clientes ativos (CSM) */}
              {currentPipelineInfo?.name?.toLowerCase() === 'clientes ativos' && csmPipelines.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Mover para funil:</span>
                    <Select value={selectedCsmPipeline} onValueChange={setSelectedCsmPipeline} disabled={loading}>
                      <SelectTrigger className="w-44 h-7 text-xs">
                        <SelectValue placeholder="Selecionar funil..." />
                      </SelectTrigger>
                      <SelectContent>
                        {csmPipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedCsmPipeline && csmPipelineStages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Etapa:</span>
                      <Select value="" onValueChange={moveToCSMPipelineStage} disabled={loading}>
                        <SelectTrigger className="w-40 h-7 text-xs">
                          <SelectValue placeholder="Selecionar etapa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {csmPipelineStages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {/* Layout principal - responsivo */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-muted/10 overflow-hidden">
          {/* Coluna esquerda - Informações do lead */}
          <div className="w-full md:w-80 lg:w-[340px] md:shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto bg-background">
            <div className="p-2 md:p-1.5 pb-24">
              <div className="space-y-1 text-[0.75rem]">
              
              {/* Seção 0: Resumo - Colapsável */}
              <Collapsible open={sectionStates.resumo} onOpenChange={() => toggleSection('resumo')}>
                <div className="space-y-1 p-1.5 bg-primary/5 rounded-md border border-primary/20">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-0">
                      <h4 className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                        Resumo
                        {sectionStates.resumo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-1">
                    {/* Nome da empresa */}
                    <EditableField
                      value={card.company_name}
                      onSave={(value) => updateCardField('company_name', value)}
                      label="Nome da empresa"
                      icon={<Building2 className="h-3 w-3 text-primary" />}
                      placeholder="Nome da empresa"
                      compact
                    />

                    {moduleType !== 'csm' && (
                      <>
                        <Separator className="my-1" />

                        {/* Faturamento */}
                        <EditableField
                          value={(card as any).faturamento_display}
                          onSave={(value) => updateCardField('faturamento_display', value)}
                          label="Faturamento"
                          icon={<DollarSign className="h-3 w-3 text-green-600" />}
                          placeholder="Ex: R$ 5.000,00 ou texto livre"
                          compact
                        />

                        <Separator className="my-1" />
                      </>
                    )}

                    {/* MRR (Receita Mensal) */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span>MRR</span>
                      </div>
                      <MRRInput
                        value={card.monthly_revenue}
                        onChange={(value) => updateCardField('monthly_revenue', value)}
                        placeholder="Ex: R$ 5.000,00"
                        compact
                      />
                    </div>

                    {/* UPSELL/CROSSELL e Variável - apenas para CSM */}
                    {moduleType === 'csm' && (() => {
                      const currentMonth = new Date().getMonth() + 1;
                      const currentYear = new Date().getFullYear();

                      // Calculate active upsell/crossell value
                      const calculateActiveUpsellValue = () => {
                        if (!upsellHistory || upsellHistory.length === 0) return 0;
                        
                        return upsellHistory.reduce((total, upsell: any) => {
                          if (upsell.payment_type === 'recorrente') {
                            const startDate = new Date(upsell.start_year || 0, (upsell.start_month || 1) - 1);
                            const currentDate = new Date(currentYear, currentMonth - 1);
                            if (currentDate > startDate) {
                              return total + (upsell.upsell_value || 0);
                            }
                          } else if (upsell.payment_type === 'parcelado' && upsell.installments) {
                            const startDate = new Date(upsell.start_year || 0, (upsell.start_month || 1) - 1);
                            const endDate = new Date(upsell.start_year || 0, (upsell.start_month || 1) - 1 + upsell.installments);
                            const currentDate = new Date(currentYear, currentMonth - 1);
                            if (currentDate >= startDate && currentDate < endDate) {
                              return total + (upsell.upsell_value || 0) / upsell.installments;
                            }
                          }
                          return total;
                        }, 0);
                      };

                      // Calculate total variable value
                      const calculateTotalVariableValue = () => {
                        if (!variableHistory || variableHistory.length === 0) return 0;
                        return variableHistory.reduce((total: number, variable: any) => total + (variable.variable_value || 0), 0);
                      };

                      const activeUpsellValue = calculateActiveUpsellValue();
                      const totalVariableValue = calculateTotalVariableValue();

                      return (
                        <>
                          {activeUpsellValue > 0 && (
                            <>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <TrendingUp className="h-3 w-3 text-blue-600" />
                                  <span>UPSELL/CROSSELL</span>
                                </div>
                                <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-background border border-border">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] font-medium">
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL'
                                    }).format(activeUpsellValue)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}

                          {totalVariableValue > 0 && (
                            <>
                              <Separator className="my-1" />
                              <div className="space-y-0">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <BarChart3 className="h-3 w-3 text-purple-600" />
                                  <span>Variável Inv./Vendas</span>
                                </div>
                                <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-background border border-border">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] font-medium">
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL'
                                    }).format(totalVariableValue)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}

                    {moduleType !== 'csm' && (
                      <>
                        <Separator className="my-1" />

                        {/* Implementação */}
                        <div className="space-y-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            <span>Implementação</span>
                          </div>
                          <MRRInput
                            value={card.implementation_value}
                            onChange={(value) => updateCardField('implementation_value', value)}
                            placeholder="Ex: R$ 3.000,00"
                            compact
                          />
                        </div>

                        <Separator className="my-1" />
                      </>
                    )}

                    {/* Categoria de MRR */}
                    <div className="space-y-0">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Tag className="h-3 w-3 text-blue-600" />
                        <span>Categoria de MRR</span>
                      </div>
                      <Select 
                        value={card.categoria || 'none'} 
                        onValueChange={(value) => updateCardField('categoria', value === 'none' ? null : value)}
                      >
                        <SelectTrigger className={`w-full h-6 text-[10px] ${
                          card.categoria === 'MRR Vendido' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' :
                          card.categoria === 'MRR Recorrente' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                          ''
                        }`}>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="MRR Vendido" className="text-green-600">MRR Vendido</SelectItem>
                          <SelectItem value="MRR Recorrente" className="text-blue-600">MRR Recorrente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {moduleType === 'csm' && (
                      <>
                        <Separator className="my-1" />
                        
                        {/* Squad */}
                        <div className="space-y-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3 text-cyan-600" />
                            <span>Squad</span>
                          </div>
                          <Select 
                            value={card.squad || 'none'} 
                            onValueChange={(value) => updateCardField('squad', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-full h-6 text-[10px]">
                              <SelectValue placeholder="Selecione o squad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              <SelectItem value="Apollo">Apollo</SelectItem>
                              <SelectItem value="Ares">Ares</SelectItem>
                              <SelectItem value="Artemis">Artemis</SelectItem>
                              <SelectItem value="Athena">Athena</SelectItem>
                              <SelectItem value="Atlas">Atlas</SelectItem>
                              <SelectItem value="Aurora">Aurora</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Separator className="my-1" />
                        
                        {/* Plano */}
                        <div className="space-y-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Target className="h-3 w-3 text-orange-600" />
                            <span>Plano</span>
                          </div>
                          <Select 
                            value={card.plano || 'none'} 
                            onValueChange={(value) => updateCardField('plano', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-full h-6 text-[10px]">
                              <SelectValue placeholder="Selecione o plano" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              <SelectItem value="Starter">Starter</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Pro">Pro</SelectItem>
                              <SelectItem value="Social">Social</SelectItem>
                              <SelectItem value="Conceito">Conceito</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {moduleType === 'csm' && (
                      <>
                        <Separator className="my-1" />
                        
                        {/* Flag */}
                        <div className="space-y-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Flag className="h-3 w-3" />
                            <span>Flag</span>
                          </div>
                          <Select 
                            value={(card as any).flag || 'none'} 
                            onValueChange={(value) => updateCardField('flag', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className={`w-full h-6 text-[10px] ${
                              (card as any).flag === 'verde' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' :
                              (card as any).flag === 'amarela' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' :
                              (card as any).flag === 'vermelha' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' :
                              ''
                            }`}>
                              <SelectValue placeholder="Selecione a flag" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              <SelectItem value="verde" className="text-green-600">
                                <div className="flex items-center gap-1">
                                  <Flag className="h-2.5 w-2.5" />
                                  <span>Verde</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="amarela" className="text-yellow-600">
                                <div className="flex items-center gap-1">
                                  <Flag className="h-2.5 w-2.5" />
                                  <span>Amarela</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="vermelha" className="text-red-600">
                                <div className="flex items-center gap-1">
                                  <Flag className="h-2.5 w-2.5" />
                                  <span>Vermelha</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Separator className="my-1" />
                        
                        {/* Fase do projeto */}
                        <div className="space-y-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <GitMerge className="h-3 w-3 text-indigo-600" />
                            <span>Fase do projeto</span>
                          </div>
                          <Select 
                            value={(card as any).fase_projeto || 'none'} 
                            onValueChange={(value) => updateCardField('fase_projeto', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-full h-6 text-[10px]">
                              <SelectValue placeholder="Selecione a fase" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              <SelectItem value="Onboarding">Onboarding</SelectItem>
                              <SelectItem value="Implementação">Implementação</SelectItem>
                              <SelectItem value="Refinamento">Refinamento</SelectItem>
                              <SelectItem value="Escala">Escala</SelectItem>
                              <SelectItem value="Expansão">Expansão</SelectItem>
                              <SelectItem value="Renovação">Renovação</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <Separator className="my-1" />
                    
                    {/* Etiquetas */}
                    <div className="space-y-0.5">
                      <Popover open={openEtiquetaPopoverResumo} onOpenChange={setOpenEtiquetaPopoverResumo}>
                        <PopoverTrigger asChild>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            <Tag className="h-3 w-3 text-amber-600" />
                            <span>Etiquetas</span>
                            <ChevronDown className="h-2.5 w-2.5 text-amber-600" />
                          </div>
                        </PopoverTrigger>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {cardTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-[9px] cursor-pointer hover:opacity-80 px-1 py-0"
                            style={{
                              backgroundColor: `${tag.color}15`,
                              borderColor: `${tag.color}40`,
                              color: tag.color,
                            }}
                            onClick={() => toggleCardTag(tag.id)}
                          >
                            {tag.name}
                            <X className="ml-0.5 h-2.5 w-2.5" />
                          </Badge>
                        ))}
                        {cardTags.length === 0 && (
                          <p className="text-[9px] text-muted-foreground">Nenhuma etiqueta</p>
                        )}
                      </div>
                      
                      <PopoverContent 
                        className="w-96 max-h-[60vh] overflow-hidden p-0 bg-background border shadow-lg z-[100]" 
                        align="start"
                        sideOffset={5}
                      >
                          {/* Campo de busca */}
                          <div className="p-3 border-b bg-background sticky top-0 z-10">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar etiquetas"
                                value={searchEtiqueta}
                                onChange={(e) => setSearchEtiqueta(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                          </div>
                          
                          {/* Lista de etiquetas */}
                          <div
                            className="max-h-[50vh] overflow-y-scroll p-2 bg-background"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-0.5">
                              {availableTags
                                .filter(tag => 
                                  searchEtiqueta === '' || 
                                  tag.name.toLowerCase().includes(searchEtiqueta.toLowerCase())
                                )
                                .map((tag) => {
                                  const isSelected = cardTags.some(ct => ct.id === tag.id);
                                  return (
                                    <Button
                                      key={tag.id}
                                      variant="ghost"
                                      className="w-full justify-start h-8 px-2 hover:bg-muted/50"
                                      onClick={() => toggleCardTag(tag.id)}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <Checkbox checked={isSelected} className="pointer-events-none h-3 w-3" />
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 h-5"
                                          style={{
                                            backgroundColor: `${tag.color}15`,
                                            borderColor: `${tag.color}40`,
                                            color: tag.color,
                                          }}
                                        >
                                          {tag.name}
                                        </Badge>
                                      </div>
                                    </Button>
                                  );
                                })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Seção: Informações Contratuais - Colapsável - Apenas CSM */}
              {moduleType === 'csm' && (
              <Collapsible open={sectionStates.contratuais} onOpenChange={() => toggleSection('contratuais')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        Informações Contratuais
                        {sectionStates.contratuais ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2">
                    {/* Plano */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span>Plano</span>
                      </div>
                      <Select 
                        value={card.plano || 'none'} 
                        onValueChange={(value) => updateCardField('plano', value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Social">Social</SelectItem>
                          <SelectItem value="Conceito">Conceito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Serviço Contratado */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Settings className="h-4 w-4 text-blue-600" />
                        <span>Serviço contratado</span>
                      </div>
                      <Select 
                        value={(card as any).servico_contratado || 'none'} 
                        onValueChange={(value) => updateCardField('servico_contratado', value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="perfomance">Perfomance</SelectItem>
                          <SelectItem value="social & perfomance">Social & Perfomance</SelectItem>
                          <SelectItem value="ID Visual">ID Visual</SelectItem>
                          <SelectItem value="Site">Site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tempo de Contrato */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span>Tempo de contrato</span>
                      </div>
                      <Select 
                        value={(card as any).tempo_contrato || 'none'} 
                        onValueChange={(value) => updateCardField('tempo_contrato', value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o tempo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="1 mês">1 mês</SelectItem>
                          <SelectItem value="3 meses">3 meses</SelectItem>
                          <SelectItem value="6 meses">6 meses</SelectItem>
                          <SelectItem value="12 meses">12 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Frequência de Reunião */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span>Frequência de reunião</span>
                      </div>
                      <Select 
                        value={(card as any).frequencia_reuniao || 'none'} 
                        onValueChange={(value) => updateCardField('frequencia_reuniao', value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Criativos Estáticos */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Target className="h-4 w-4 text-pink-600" />
                        <span>Criativos Estáticos</span>
                      </div>
                      <Select 
                        value={((card as any).criativos_estaticos || 'none').toString()} 
                        onValueChange={(value) => updateCardField('criativos_estaticos', value === 'none' ? null : parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Criativos em Vídeo */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Target className="h-4 w-4 text-red-600" />
                        <span>Criativos em vídeo</span>
                      </div>
                      <Select 
                        value={((card as any).criativos_video || 'none').toString()} 
                        onValueChange={(value) => updateCardField('criativos_video', value === 'none' ? null : parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* LPs */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Globe className="h-4 w-4 text-teal-600" />
                        <span>LPs</span>
                      </div>
                      <Select 
                        value={((card as any).lps || 'none').toString()} 
                        onValueChange={(value) => updateCardField('lps', value === 'none' ? null : parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Limite de Investimento */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                        <span>Limite de investimento</span>
                      </div>
                      <MRRInput
                        value={(card as any).limite_investimento}
                        onChange={(value) => updateCardField('limite_investimento', value)}
                        placeholder="Ex: R$ 10.000,00"
                      />
                    </div>

                    {/* Existe Comissão */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span>Existe alguma comissão?</span>
                      </div>
                      <Select 
                        value={((card as any).existe_comissao ? 'sim' : 'nao')} 
                        onValueChange={(value) => updateCardField('existe_comissao', value === 'sim')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">Não</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
              )}

              {/* Seção: UPSELL/CROSSELL - Colapsável - Apenas CSM */}
              {moduleType === 'csm' && (
              <Collapsible open={sectionStates.upsells} onOpenChange={() => toggleSection('upsells')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        UPSELL/CROSSELL
                        {sectionStates.upsells ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <UpsellManager cardId={card.id} upsellHistory={upsellHistory} />
                  </CollapsibleContent>
                </div>
              </Collapsible>
              )}

              {/* Seção: Variável sobre investimento - Colapsável - Apenas CSM */}
              {moduleType === 'csm' && (
              <Collapsible open={sectionStates.variables} onOpenChange={() => toggleSection('variables')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 truncate">
                        Variável sobre investimento
                        {sectionStates.variables ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <VariableManager cardId={card.id} variableHistory={variableHistory} filterType="investimento" />
                  </CollapsibleContent>
                </div>
              </Collapsible>
              )}

              {/* Seção: Variável sobre Vendas - Colapsável - Apenas CSM */}
              {moduleType === 'csm' && (
              <Collapsible open={sectionStates.variablesSales} onOpenChange={() => toggleSection('variablesSales')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 truncate">
                        Variável sobre Vendas
                        {sectionStates.variablesSales ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <VariableManager cardId={card.id} variableHistory={variableHistory} filterType="venda" />
                  </CollapsibleContent>
                </div>
              </Collapsible>
              )}

              {/* Seção: Performance - Colapsável - Apenas no CSM */}
              {moduleType === 'csm' && (
                <Collapsible open={sectionStates.performance} onOpenChange={() => toggleSection('performance')}>
                  <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          Performance
                          {sectionStates.performance ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </h4>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3 pt-2">
                      <PerformanceManager 
                        cardId={card.id} 
                        performanceHistory={performanceHistory}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Seção 3: Informações base - Colapsável */}
              <Collapsible open={sectionStates.contato} onOpenChange={() => toggleSection('contato')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        Informações base
                        {sectionStates.contato ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2">
                
                {/* Nome do Cliente */}
                <EditableField
                  value={card.contact_name}
                  onSave={(value) => updateCardField('contact_name', value)}
                  label="Nome do Cliente"
                  icon={<User className="h-4 w-4 text-purple-600" />}
                  placeholder="Nome do cliente"
                />

                <Separator className="my-3" />

                {/* Nome da Empresa */}
                <EditableField
                  value={card.company_name}
                  onSave={(value) => updateCardField('company_name', value)}
                  label="Nome da Empresa"
                  icon={<Building2 className="h-4 w-4 text-primary" />}
                  placeholder="Nome da empresa"
                />

                <Separator className="my-3" />

                {/* Instagram */}
                <EditableField
                  value={(card as any).instagram}
                  onSave={(value) => updateCardField('instagram', value)}
                  label="Instagram"
                  icon={<Globe className="h-4 w-4 text-pink-600" />}
                  placeholder="@usuario ou https://instagram.com/..."
                />

                <Separator className="my-3" />

                {/* Email */}
                <EditableField
                  value={card.contact_email}
                  onSave={(value) => updateCardField('contact_email', value)}
                  type="email"
                  label="E-mail"
                  icon={<Mail className="h-4 w-4 text-orange-600" />}
                  placeholder="email@empresa.com.br"
                />

                <Separator className="my-3" />

                {/* Telefone */}
                <EditableField
                  value={card.contact_phone}
                  onSave={(value) => updateCardField('contact_phone', value)}
                  type="tel"
                  label="Telefone"
                  icon={<Phone className="h-4 w-4 text-green-600" />}
                  placeholder="(11) 99999-9999"
                />
                </CollapsibleContent>
              </div>
              </Collapsible>

              {/* Seção: Nota Qualificatória - Colapsável - Oculto no CSM */}
              {moduleType !== 'csm' && (() => {
                const qualificationScore = [
                  card.qual_nicho_certo,
                  card.qual_porte_empresa,
                  card.qual_tomador_decisao,
                  card.qual_investe_marketing,
                  card.qual_urgencia_real,
                  card.qual_clareza_objetivos
                ].reduce((sum, val) => sum + (val || 0), 0);
                
                const getScoreColor = (score: number) => {
                  if (score >= 0 && score <= 5) return 'text-red-600';
                  if (score >= 6 && score <= 7) return 'text-blue-600';
                  if (score >= 8 && score <= 10) return 'text-green-600';
                  if (score >= 11 && score <= 12) return 'text-green-600 animate-pulse';
                  return 'text-foreground';
                };

                return (
                  <Collapsible open={sectionStates.qualificacao} onOpenChange={() => toggleSection('qualificacao')}>
                    <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <ClipboardCheck className="h-3 w-3" />
                            Nota Qualificatória
                            <span className={`text-sm font-bold ${getScoreColor(qualificationScore)}`}>
                              {qualificationScore}/12
                            </span>
                            {sectionStates.qualificacao ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </h4>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-3 pt-2">
                        <QualificationScoreSection 
                          card={card}
                          onUpdate={updateCardField}
                        />
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })()}


              {/* Seção 6: Rastreamento (UTM) - Colapsável - Oculto no CSM */}
              {moduleType !== 'csm' && (
              <Collapsible open={sectionStates.utm} onOpenChange={() => toggleSection('utm')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        Rastreamento (UTM)
                        {sectionStates.utm ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2">

                {/* Seção UTM */}
                <UTMSection
                  card={card}
                  onUpdate={updateCardField}
                  loading={loading}
                />

                <Separator className="my-3" />

                {/* Data de Criação */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Criação</p>
                    <p className="font-semibold text-foreground">{formatDate(card.created_at)}</p>
                  </div>
                </div>
                </CollapsibleContent>
              </div>
              </Collapsible>
              )}

              {/* Seção: Briefing Operacional - Colapsável - Visível em CRM e sempre no CSM */}
              {(moduleType === 'csm' || briefingQuestions.length > 0 || Object.keys(briefingAnswers).length > 0) && (
              <Collapsible open={sectionStates.briefing} onOpenChange={() => toggleSection('briefing')}>
                <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                        Briefing Operacional
                        {sectionStates.briefing ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </h4>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-3">
                    {briefingQuestions.length === 0 && Object.keys(briefingAnswers).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma pergunta configurada para este funil.
                      </p>
                    ) : briefingQuestions.length > 0 ? (
                      briefingQuestions.map((q, index) => {
                        const rawAnswer = briefingAnswers[q.id] || "";
                        // Formatar datas ISO para formato brasileiro
                        const formattedAnswer = rawAnswer && /^\d{4}-\d{2}-\d{2}T/.test(rawAnswer) 
                          ? (() => {
                              try {
                                const date = new Date(rawAnswer);
                                return date.toLocaleDateString('pt-BR');
                              } catch {
                                return rawAnswer;
                              }
                            })()
                          : rawAnswer;
                        
                        return (
                          <div key={q.id} className="space-y-1.5">
                            <Label className="text-sm font-medium">
                              {index + 1}. {q.question}
                            </Label>
                            {moduleType === 'csm' ? (
                              <div className="px-3 py-2 bg-muted/30 border border-border rounded-md">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {formattedAnswer || <span className="text-muted-foreground italic">Sem resposta</span>}
                                </p>
                              </div>
                            ) : (
                              <textarea
                                value={briefingAnswers[q.id] || ""}
                                onChange={(e) => updateBriefingAnswer(q.id, e.target.value)}
                                placeholder="Digite sua resposta..."
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      // Mostrar respostas mesmo sem perguntas encontradas (fallback)
                      Object.entries(briefingAnswers).map(([questionId, answer], index) => {
                        // Formatar datas ISO para formato brasileiro
                        const formattedAnswer = answer && /^\d{4}-\d{2}-\d{2}T/.test(answer) 
                          ? (() => {
                              try {
                                const date = new Date(answer);
                                return date.toLocaleDateString('pt-BR');
                              } catch {
                                return answer;
                              }
                            })()
                          : answer;
                        
                        return (
                          <div key={questionId} className="space-y-1.5">
                            <Label className="text-sm font-medium text-muted-foreground">
                              Pergunta {index + 1}
                            </Label>
                            <div className="px-3 py-2 bg-muted/30 border border-border rounded-md">
                              <p className="text-sm text-foreground whitespace-pre-wrap">
                                {formattedAnswer || <span className="text-muted-foreground italic">Sem resposta</span>}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
              )}



              {/* Seção de Etiquetas removida - agora disponível apenas na seção Resumo */}

              {/* Data de Perda e Motivo - Colapsável */}
              {(card.data_perda || card.motivo_perda) && (
                <Collapsible open={sectionStates.perda} onOpenChange={() => toggleSection('perda')}>
                  <div className="space-y-2 p-3 bg-muted/10 rounded-md border border-border/40">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Informações de Perda
                          {sectionStates.perda ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </h4>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2">

                  {card.data_perda && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span>Data de Perda</span>
                      </div>
                      {canEditDataPerda ? (
                        <Popover open={dataPerdaPopoverOpen} onOpenChange={setDataPerdaPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start text-left font-normal bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/30"
                            >
                              <Calendar className="mr-2 h-4 w-4 text-red-600" />
                              <span className="text-red-700 dark:text-red-400 font-medium">
                                {formatDate(card.data_perda)}
                              </span>
                              <Pencil className="ml-auto h-3 w-3 text-red-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={card.data_perda ? new Date(card.data_perda) : undefined}
                              onSelect={async (date) => {
                                if (date && card) {
                                  const oldDate = card.data_perda ? formatDate(card.data_perda) : 'N/A';
                                  const newDate = formatDate(date.toISOString());
                                  await updateCardField('data_perda', date.toISOString());
                                  
                                  // Registrar alteração no histórico
                                  const { data: userData } = await supabase.auth.getUser();
                                  await supabase
                                    .from('csm_card_stage_history')
                                    .insert({
                                      card_id: card.id,
                                      stage_id: card.stage_id,
                                      entered_at: new Date().toISOString(),
                                      moved_by: userData.user?.id,
                                      notes: `Data de perda alterada de ${oldDate} para ${newDate}`,
                                      event_type: 'field_update'
                                    });
                                  
                                  toast.success('Data de perda atualizada!');
                                  setDataPerdaPopoverOpen(false);
                                }
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            {formatDate(card.data_perda)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {card.motivo_perda && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Motivo da Perda</span>
                        </div>
                        <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            {card.motivo_perda}
                          </p>
                          {card.comentarios_perda && (
                            <p className="text-xs text-red-600 dark:text-red-500 mt-2 pt-2 border-t border-red-200 dark:border-red-900/50">
                              {card.comentarios_perda}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  </CollapsibleContent>
                </div>
                </Collapsible>
              )}

            </div>
            </div>
          </div>

          {/* Coluna do meio - Timeline de atividades e histórico */}
          <div className="flex-1 min-w-0 border-r border-border flex flex-col bg-background">
            <ScrollArea className="h-full">
              <CardHistoryAndActivities cardId={card.id} stageId={card.stage_id} stages={stages} />
            </ScrollArea>
          </div>


        </div>
        </>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog de campos obrigatórios */}
    <RequiredFieldsDialog
        open={showRequiredFields}
        onClose={() => setShowRequiredFields(false)}
        onSave={handleSaveRequiredFields}
        missingFields={missingFields}
        currentData={{
          receita_gerada_cliente: card?.receita_gerada_cliente,
          investimento_midia: card?.investimento_midia,
          teve_vendas: card?.teve_vendas,
          teve_roas_maior_1: card?.teve_roas_maior_1,
          teve_roi_maior_1: card?.teve_roi_maior_1,
          nota_nps: card?.nota_nps,
        }}
      />

      {/* Dialog de motivo de perda/churn */}
      <LostReasonDialog
        open={showLostReasonDialog}
        onClose={() => setShowLostReasonDialog(false)}
        onConfirm={handleConfirmLost}
        isCSMPipeline={isCSMPipeline}
      />


      {/* Dialog de mesclar cards */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Mesclar Cards</h3>
            <p className="text-sm text-muted-foreground">
              Selecione o card de destino. As informações serão combinadas e o card atual será excluído.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Card de destino
              </label>
              <Select value={selectedMergeCard} onValueChange={setSelectedMergeCard}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um card" />
                </SelectTrigger>
                <SelectContent>
                  {availableCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} {c.company_name && `(${c.company_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMergeDialog(false);
                  setSelectedMergeCard('');
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleMergeCards}
                disabled={loading || !selectedMergeCard}
              >
                Mesclar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Reabertura */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <h3 className="text-lg font-semibold">Reabrir Card</h3>
            <p className="text-sm text-muted-foreground">
              Selecione o funil e a etapa para onde deseja mover o card
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Funil</label>
              <Select value={selectedReopenPipeline} onValueChange={handleReopenPipelineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {reopenPipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select 
                value={selectedReopenStage} 
                onValueChange={setSelectedReopenStage}
                disabled={!selectedReopenPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedReopenPipeline ? "Selecione uma etapa" : "Selecione um funil primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {reopenStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReopenDialog(false);
                  setSelectedReopenPipeline('');
                  setSelectedReopenStage('');
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={executeReopenCard}
                disabled={loading || !selectedReopenPipeline || !selectedReopenStage}
              >
                Reabrir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};