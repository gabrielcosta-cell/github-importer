import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Copy, Check, FileText, Users, PenLine, Globe, ExternalLink, Trash2, Eye, EyeOff, Upload, Image, Settings, ChevronDown, Sparkles, Plus, Save, Edit, X, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import dotLogoDark from '@/assets/dot-logo-dark.png';
import { PublishedCasesPreview } from '@/components/cases/PublishedCasesPreview';

interface CSMClient {
  id: string;
  company_name: string | null;
  title: string;
  squad: string | null;
  assigned_to: string | null;
}

interface SuccessCase {
  id: string;
  client_name: string;
  squad: string | null;
  owner: string | null;
  nichos: string[];
  titulo_destaque: string | null;
  descricao_curta: string | null;
  metricas_badges: string[];
  resumo_case: string | null;
  is_published: boolean;
  created_at: string;
  client_logo: string | null;
  cover_image: string | null;
  is_featured: boolean;
  display_order: number;
  dot_logo_variant: string | null;

  // Conteúdo do post (editável no "Gerenciar Blog")
  contexto_inicial?: string | null;
  como_chegou?: string | null;
  principais_dores?: string | null;
  tentativas_anteriores?: string | null;
  objetivos_alinhados?: string | null;
  metas_entrada?: string | null;
  prazo_analise?: string | null;
  estrategia_dot?: string | null;
  periodo_analisado?: string | null;
  resultados_atingidos?: string | null;
  aprendizados?: string | null;
  insights_replicaveis?: string | null;
}

interface CaseFormData {
  clientId: string;
  clientName: string;
  squad: string;
  owner: string;
  nichos: string[];
  contextoInicial: string;
  comoChegou: string;
  principaisDores: string;
  tentativasAnteriores: string;
  objetivosAlinhados: string;
  metasEntrada: string;
  prazoAnalise: string;
  estrategiaDot: string;
  periodoAnalisado: string;
  resultadosAtingidos: string;
  aprendizadosAplicaveis: string;
  insightsReplicaveis: string;
  resumoCase: string;
  tituloDestaque: string;
  descricaoCurta: string;
  metricasBadges: string;
  clientLogo: File | null;
  clientLogoPreview: string;
}

interface BlogConfig {
  hero_title: string;
  hero_subtitle: string;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_link: string;
  main_niches: string;
  other_niches: string;
  metrics_badges_options: string;
}

const nichoOptions = [
  'B2B (indústria, fábricas, distribuidoras e outros)',
  'Serviço',
  'Varejo',
  'Educação',
  'Imobiliária | Construção Civil',
  'SAAS',
  'Energia solar',
  'Franquia',
  'Telecom',
  'Investimentos / Finanças',
  'Contabilidade',
  'E-commerce',
  'Odontologia',
  'Advocacia',
  'Saúde',
  'Alimentício'
];

const defaultMetricsBadges = [
  'ROI', 'FATURAMENTO', 'VENDAS', 'ROAS', 'REDUÇÃO DE CUSTO', 
  'CPL', 'LEADS', 'TICKET MÉDIO', 'CONVERSÃO', 'CAC'
];

const initialFormData: CaseFormData = {
  clientId: '',
  clientName: '',
  squad: '',
  owner: '',
  nichos: [],
  contextoInicial: '',
  comoChegou: '',
  principaisDores: '',
  tentativasAnteriores: '',
  objetivosAlinhados: '',
  metasEntrada: '',
  prazoAnalise: '',
  estrategiaDot: '',
  periodoAnalisado: '',
  resultadosAtingidos: '',
  aprendizadosAplicaveis: '',
  insightsReplicaveis: '',
  resumoCase: '',
  tituloDestaque: '',
  descricaoCurta: '',
  metricasBadges: '',
  clientLogo: null,
  clientLogoPreview: '',
};

export default function CasesSuccesso() {
  const { user, profile } = useAuth();
  const isAdmin = (profile?.effectiveRole || profile?.role) === 'admin';
  const [activeTab, setActiveTab] = useState('gerar');
  const [formData, setFormData] = useState<CaseFormData>(initialFormData);
  const [csmClients, setCsmClients] = useState<CSMClient[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [savedCases, setSavedCases] = useState<SuccessCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Blog config state
  const [blogConfig, setBlogConfig] = useState<BlogConfig>({
    hero_title: 'Na DOT não temos clientes, temos cases de sucesso',
    hero_subtitle: 'Resultados reais, métricas claras e estratégias aplicáveis para sua empresa',
    cta_title: 'Quer ser o próximo case de sucesso?',
    cta_subtitle: 'Fale com nosso consultor e receba uma estratégia personalizada para sua empresa.',
    cta_button_text: 'Quero ser o próximo case de sucesso',
    cta_link: 'https://dotconceito.com.br/nova-lp-bio',
    main_niches: 'B2B,Franquia,Energia Solar,Academia,Educação',
    other_niches: 'Serviço,Varejo,Imobiliária | Construção Civil,SAAS,Telecom,Investimentos / Finanças,Contabilidade,E-commerce,Odontologia,Advocacia,Saúde,Alimentício',
    metrics_badges_options: 'ROI,FATURAMENTO,VENDAS,ROAS,REDUÇÃO DE CUSTO,CPL,LEADS,TICKET MÉDIO,CONVERSÃO,CAC'
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Prompt management state
  interface CasePrompt {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    position: number;
    prompt_type: 'post' | 'blog';
    created_at: string;
  }
  
  interface CaseCopy {
    id: string;
    client_name: string;
    input_context: string;
    ai_response: string | null;
    status: string;
    copy_type: 'post' | 'blog';
    created_by: string;
    created_at: string;
    profiles?: { name: string; email: string };
  }
  
  // Post prompts
  const [postPrompts, setPostPrompts] = useState<CasePrompt[]>([]);
  const [blogPrompts, setBlogPrompts] = useState<CasePrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CasePrompt | null>(null);
  const [promptSubTab, setPromptSubTab] = useState<'config-post' | 'result-post' | 'config-blog' | 'result-blog'>('config-post');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  
  // Copies separadas por tipo
  const [postCopies, setPostCopies] = useState<CaseCopy[]>([]);
  const [blogCopies, setBlogCopies] = useState<CaseCopy[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [viewingCopy, setViewingCopy] = useState<CaseCopy | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [updatingLogo, setUpdatingLogo] = useState(false);
  const [editingCase, setEditingCase] = useState<{ id: string; titulo_destaque: string } | null>(null);
  const [savingCaseEdit, setSavingCaseEdit] = useState(false);
  
  // New prompt form - com tipo
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '', prompt_type: 'post' as 'post' | 'blog' });

  useEffect(() => {
    const loadCSMClients = async () => {
      try {
        const { data: pipelines } = await supabase
          .from('csm_pipelines')
          .select('id')
          .or('name.ilike.Clientes ativos,name.ilike.Clientes antigos');

        if (!pipelines || pipelines.length === 0) {
          setLoadingClients(false);
          return;
        }

        const pipelineIds = pipelines.map(p => p.id);

        const { data: cards, error } = await supabase
          .from('csm_cards')
          .select('id, company_name, title, squad, assigned_to')
          .in('pipeline_id', pipelineIds)
          .eq('churn', false)
          .order('company_name', { ascending: true });

        if (error) throw error;
        setCsmClients(cards || []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar lista de clientes');
      } finally {
        setLoadingClients(false);
      }
    };

    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setUsers(data?.map(u => ({ id: u.user_id, name: u.name })) || []);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    };

    loadCSMClients();
    loadUsers();
    loadBlogConfig();
  }, []);

  // Carregar prompts assim que o componente montar (necessário para geração de case)
  useEffect(() => {
    loadCasePrompts();
  }, []);

  useEffect(() => {
    if (activeTab === 'blog' || activeTab === 'gerenciar') {
      loadSavedCases();
    }
    if (activeTab === 'prompts') {
      loadCaseCopies();
    }
  }, [activeTab]);

  const loadCasePrompts = async () => {
    setLoadingPrompts(true);
    try {
      const { data, error } = await supabase
        .from('success_case_prompts')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      
      const allPrompts = (data || []) as CasePrompt[];
      setPostPrompts(allPrompts.filter(p => p.prompt_type === 'post'));
      setBlogPrompts(allPrompts.filter(p => p.prompt_type === 'blog'));
    } catch (error) {
      console.error('Erro ao carregar prompts:', error);
      toast.error('Erro ao carregar prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  const saveNewPrompt = async (promptType: 'post' | 'blog') => {
    if (!newPrompt.title || !newPrompt.content) {
      toast.error('Preencha título e conteúdo do prompt');
      return;
    }

    setSavingPrompt(true);
    try {
      const currentPrompts = promptType === 'post' ? postPrompts : blogPrompts;
      const { error } = await supabase
        .from('success_case_prompts')
        .insert({
          title: newPrompt.title,
          content: newPrompt.content,
          prompt_type: promptType,
          position: currentPrompts.length,
          created_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Prompt salvo!');
      setNewPrompt({ title: '', content: '', prompt_type: promptType });
      loadCasePrompts();
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const updatePrompt = async () => {
    if (!editingPrompt) return;

    setSavingPrompt(true);
    try {
      const { error } = await supabase
        .from('success_case_prompts')
        .update({
          title: editingPrompt.title,
          content: editingPrompt.content,
          is_active: editingPrompt.is_active
        })
        .eq('id', editingPrompt.id);

      if (error) throw error;
      
      toast.success('Prompt atualizado!');
      setEditingPrompt(null);
      loadCasePrompts();
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      toast.error('Erro ao atualizar prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('success_case_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
      
      toast.success('Prompt excluído!');
      loadCasePrompts();
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir prompt');
    }
  };

  const togglePromptActive = async (promptId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('success_case_prompts')
        .update({ is_active: !currentState })
        .eq('id', promptId);

      if (error) throw error;
      loadCasePrompts();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const loadCaseCopies = async () => {
    setLoadingCopies(true);
    try {
      const { data, error } = await supabase
        .from('success_case_copies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados dos usuários separadamente
      const copiesWithProfiles = await Promise.all(
        (data || []).map(async (copy) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('user_id', copy.created_by)
            .maybeSingle();

          return {
            ...copy,
            profiles: profileData || { name: 'Usuário desconhecido', email: '' }
          };
        })
      );

      const allCopies = copiesWithProfiles as CaseCopy[];
      setPostCopies(allCopies.filter(c => c.copy_type === 'post'));
      setBlogCopies(allCopies.filter(c => c.copy_type === 'blog'));
    } catch (error) {
      console.error('Erro ao carregar copies:', error);
    } finally {
      setLoadingCopies(false);
    }
  };

  const deleteCaseCopy = async (copyId: string) => {
    try {
      const { error } = await supabase
        .from('success_case_copies')
        .delete()
        .eq('id', copyId);

      if (error) throw error;

      toast.success('Copy excluída!');
      setViewingCopy(null);
      loadCaseCopies();
    } catch (error) {
      console.error('Erro ao excluir copy:', error);
      toast.error('Erro ao excluir copy');
    }
  };

  const regenerateCopy = async (copy: CaseCopy, type: 'post' | 'blog') => {
    if (!user) {
      toast.error('Faça login para refazer a copy');
      return;
    }

    setGeneratingCopy(true);
    toast.info(`Refazendo copy de ${type === 'post' ? 'post' : 'blog'}...`);

    try {
      // Get only the prompts for the specified type
      const promptsToUse = type === 'post' ? postPrompts : blogPrompts;
      
      if (promptsToUse.filter(p => p.is_active).length === 0) {
        toast.error(`Nenhum prompt de ${type === 'post' ? 'post' : 'blog'} ativo. Ative um prompt primeiro.`);
        return;
      }

      // Call the edge function with only the prompts for the specified type
      const { data, error } = await supabase.functions.invoke('generate-case-copy', {
        body: {
          clientName: copy.client_name,
          caseContent: copy.input_context,
          prompts: promptsToUse,
          userId: user.id
        }
      });

      if (error) throw error;

      // Get the response based on type
      const newResponse = type === 'post' ? data?.data?.copy_instagram : data?.data?.blog_article;

      if (!newResponse) {
        toast.error('IA não retornou resposta');
        return;
      }

      // Create a NEW version instead of updating the existing one (doesn't affect blog)
      const { error: insertError } = await supabase
        .from('success_case_copies')
        .insert({
          client_name: copy.client_name,
          input_context: copy.input_context,
          ai_response: newResponse,
          copy_type: type,
          created_by: user.id,
          status: 'completed'
        });

      if (insertError) throw insertError;

      toast.success('Nova versão criada com sucesso!');
      loadCaseCopies();
      setViewingCopy(null);
    } catch (error) {
      console.error('Erro ao regenerar copy:', error);
      toast.error('Erro ao regenerar copy');
    } finally {
      setGeneratingCopy(false);
    }
  };

  // Group copies by client_name and type for versioning
  const getCopyVersions = (clientName: string, copyType: 'post' | 'blog') => {
    const copies = copyType === 'post' ? postCopies : blogCopies;
    return copies
      .filter(c => c.client_name === clientName)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const loadBlogConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_config')
        .select('config_key, config_value');
      
      if (error) throw error;
      
      if (data) {
        const config: Record<string, string> = {};
        data.forEach(item => {
          if (item.config_value) {
            config[item.config_key] = item.config_value;
          }
        });
        setBlogConfig(prev => ({ ...prev, ...config }));
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    }
  };

  const saveBlogConfig = async () => {
    setSavingConfig(true);
    try {
      const updates = Object.entries(blogConfig).map(([key, value]) => ({
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      }));

      for (const update of updates) {
        await supabase
          .from('blog_config')
          .upsert(update, { onConflict: 'config_key' });
      }

      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const loadSavedCases = async () => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('success_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedCases(data?.map(c => ({
        ...c,
        nichos: c.nichos || [],
        metricas_badges: c.metricas_badges || [],
        client_logo: c.client_logo || null,
        cover_image: c.cover_image || null,
        is_featured: c.is_featured || false,
        display_order: c.display_order || 0
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar cases:', error);
      toast.error('Erro ao carregar cases salvos');
    } finally {
      setLoadingCases(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = csmClients.find(c => c.id === clientId);
    if (client) {
      const ownerName = client.assigned_to 
        ? users.find(u => u.id === client.assigned_to)?.name || 'Sem proprietário'
        : 'Sem proprietário';
      
      setFormData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.company_name || client.title,
        squad: client.squad || 'Não definido',
        owner: ownerName,
      }));
    }
  };

  const handleInputChange = (field: keyof CaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNichoToggle = (nicho: string) => {
    setFormData(prev => ({
      ...prev,
      nichos: prev.nichos.includes(nicho)
        ? prev.nichos.filter(n => n !== nicho)
        : [...prev.nichos, nicho]
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('png')) {
        toast.error('Por favor, envie um arquivo PNG');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          clientLogo: file,
          clientLogoPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const fileExt = 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('client-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const updateCaseCover = async (caseId: string, file: File) => {
    setUpdatingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);
      if (logoUrl) {
        const { error } = await supabase
          .from('success_cases')
          .update({ cover_image: logoUrl })
          .eq('id', caseId);
        
        if (error) throw error;
        
        // Atualizar lista local
        setSavedCases(prev => prev.map(c => 
          c.id === caseId ? { ...c, cover_image: logoUrl } : c
        ));
        toast.success('Capa atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar capa:', error);
      const message = (error as any)?.message || 'Erro ao atualizar capa';
      toast.error(message);
    } finally {
      setUpdatingLogo(false);
    }
  };

  const updateCaseLogo = async (caseId: string, file: File) => {
    setUpdatingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);
      if (logoUrl) {
        const { error } = await supabase
          .from('success_cases')
          .update({ client_logo: logoUrl })
          .eq('id', caseId);
        
        if (error) throw error;
        
        // Atualizar lista local
        setSavedCases(prev => prev.map(c => 
          c.id === caseId ? { ...c, client_logo: logoUrl } : c
        ));
        toast.success('Logo atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      const message = (error as any)?.message || 'Erro ao atualizar logo';
      toast.error(message);
    } finally {
      setUpdatingLogo(false);
    }
  };

  const updateCaseTitle = async () => {
    if (!editingCase) return;
    
    setSavingCaseEdit(true);
    try {
      const { error } = await supabase
        .from('success_cases')
        .update({ titulo_destaque: editingCase.titulo_destaque })
        .eq('id', editingCase.id);
      
      if (error) throw error;
      
      // Atualizar lista local
      setSavedCases(prev => prev.map(c => 
        c.id === editingCase.id ? { ...c, titulo_destaque: editingCase.titulo_destaque } : c
      ));
      toast.success('Título atualizado com sucesso!');
      setEditingCase(null);
    } catch (error) {
      console.error('Erro ao atualizar título:', error);
      const message = (error as any)?.message || 'Erro ao atualizar título';
      toast.error(message);
    } finally {
      setSavingCaseEdit(false);
    }
  };

  const updateCaseFields = async (caseId: string, patch: Partial<SuccessCase>) => {
    try {
      const { error } = await supabase
        .from('success_cases')
        .update(patch)
        .eq('id', caseId);

      if (error) throw error;

      setSavedCases(prev =>
        prev.map(c => (c.id === caseId ? ({ ...c, ...patch } as SuccessCase) : c))
      );

      toast.success('Post atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      const message = (error as any)?.message || 'Erro ao atualizar post';
      toast.error(message);
      throw error;
    }
  };

  const generateCase = () => {
    if (!formData.clientName) {
      toast.error('Selecione um cliente antes de gerar o case');
      return;
    }

    const nichosText = formData.nichos.length > 0 
      ? formData.nichos.join(', ')
      : 'Não definido';

    const caseText = `# **CASE – ${formData.clientName} | DOT**

**Squad:** ${formData.squad}
**Responsável:** ${formData.owner}
**Nicho(s):** ${nichosText}

---

## **1. Introdução**

${formData.contextoInicial}

### Como o cliente chegou até nós?
${formData.comoChegou}

### Principais dores antes do nosso trabalho
${formData.principaisDores}

### O que já havia sido tentado antes
${formData.tentativasAnteriores}

---

## **2. Desafios do Projeto**

### Objetivos alinhados com o cliente
${formData.objetivosAlinhados}

### Metas na entrada
${formData.metasEntrada}

### Prazo / Janela de análise
${formData.prazoAnalise}

---

## **3. Estratégia DOT**

${formData.estrategiaDot}

---

## **4. Resultados Obtidos**

### Período analisado
${formData.periodoAnalisado}

### Resultados atingidos
${formData.resultadosAtingidos}

---

## **5. Aprendizados e Replicabilidade**

### Aprendizados aplicáveis a outros clientes
${formData.aprendizadosAplicaveis}

### Insights replicáveis
${formData.insightsReplicaveis}

---

## **Resumo do case em uma frase**

**"${formData.resumoCase}"**
`;

    setGeneratedCase(caseText);
    toast.success('Case gerado com sucesso!');
  };

  const validateRequiredFields = (data: CaseFormData): boolean => {
    const requiredFields = [
      { field: 'clientName', label: 'Cliente' },
      { field: 'nichos', label: 'Nicho(s)' },
      { field: 'contextoInicial', label: 'Contexto inicial' },
      { field: 'comoChegou', label: 'Como chegou' },
      { field: 'principaisDores', label: 'Principais dores' },
      { field: 'objetivosAlinhados', label: 'Objetivos alinhados' },
      { field: 'metasEntrada', label: 'Metas na entrada' },
      { field: 'prazoAnalise', label: 'Prazo de análise' },
      { field: 'estrategiaDot', label: 'Estratégia DOT' },
      { field: 'periodoAnalisado', label: 'Período analisado' },
      { field: 'resultadosAtingidos', label: 'Resultados atingidos' },
      { field: 'resumoCase', label: 'Resumo do case' },
      { field: 'metricasBadges', label: 'Métricas (badges)' },
    ];

    for (const { field, label } of requiredFields) {
      const value = data[field as keyof CaseFormData];
      if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`Campo obrigatório: ${label}`);
        return false;
      }
    }

    // Logo do cliente agora é opcional para permitir testes iniciais sem PNG
    return true;
  };

  const saveCase = async () => {
    if (!user) {
      toast.error('Faça login para salvar');
      return;
    }

    // Pré-preenchimento automático para o case inicial da Sul Solar
    let currentData: CaseFormData = { ...formData };

    if (currentData.clientName.toLowerCase().includes('sul solar')) {
      const nichosSulSolar = currentData.nichos.length > 0 ? currentData.nichos : ['Energia solar'];

      currentData = {
        ...currentData,
        nichos: nichosSulSolar,
        contextoInicial: currentData.contextoInicial || `A Sul Solar, empresa do segmento de sistemas de energia solar, chegou até nós após enfrentar um período prolongado de estagnação nos resultados digitais. Antes do início do trabalho, a operação vinha rodando campanhas no Meta Ads direcionando diretamente para o WhatsApp — porém, sem conseguir gerar volume, qualidade ou previsibilidade.`,
        comoChegou: currentData.comoChegou || `A Sul Solar buscou a DOT em busca de uma operação mais estratégica, previsível e com foco em crescimento estruturado.`,
        principaisDores: currentData.principaisDores || `- Volume baixo e irregular de leads\n- Falta de previsibilidade comercial\n- Dependência exclusiva de um único formato de campanha (envio direto para WhatsApp)\n- Baixa conversão em reuniões e vendas`,
        tentativasAnteriores: currentData.tentativasAnteriores || `Campanhas no Meta Ads levando diretamente para o WhatsApp, sem uma jornada estruturada, sem qualificação mínima e sem alinhamento com o fluxo comercial.`,
        objetivosAlinhados: currentData.objetivosAlinhados || `Reconstruir a geração de demanda digital e criar um fluxo comercial sólido, escalável e previsível para a Sul Solar.`,
        metasEntrada: currentData.metasEntrada || `Gerar 20 leads por dia dentro dos primeiros 90 dias de projeto, mantendo qualidade mínima de lead e capacidade de atendimento comercial.`,
        prazoAnalise: currentData.prazoAnalise || `Janela de análise inicial de 90 dias, com foco especial no desempenho do mês de outubro.`,
        estrategiaDot: currentData.estrategiaDot || `A DOT implementou uma reestruturação completa da estratégia digital da Sul Solar, com foco em previsibilidade e escala.\n\n✔ Campanhas\n- Criação de uma nova estrutura no Meta Ads com segmentações testadas, públicos amplos e testes A/B.\n- Mudança total da lógica de envio direto para WhatsApp para um modelo focado em captura de lead com qualificação mínima.\n\n✔ Criativos\n- Desenvolvimento de novos ângulos e peças com foco em dor, benefício e prova social.\n- Testes de formatos para aumentar CTR e reduzir CPL.\n\n✔ Landing Page\n- Construção/otimização da landing page para aumentar a taxa de conversão.\n- Alinhamento direto com o time comercial para garantir fluidez da jornada LP → atendimento.`,
        periodoAnalisado: currentData.periodoAnalisado || `Outubro (primeiro grande ciclo de análise dentro dos 90 dias iniciais).`,
        resultadosAtingidos: currentData.resultadosAtingidos || `Período analisado: Outubro.\n\n- Leads gerados: 218\n- Reuniões marcadas: 120\n- Conversões (vendas): 21\n- Faturamento atribuído: R$ 505.777,00\n- Investimento em mídia: R$ 11.873,49\n- CPL médio: R$ 54,45 (11.873,49 ÷ 218)\n- ROAS: 42,6x (505.777,00 ÷ 11.873,49)\n- ROI: 4.160%\n\nSaímos de uma operação estagnada para um cenário em que a Sul Solar gerou mais de meio milhão de reais em faturamento em um único mês.`,
        aprendizadosAplicaveis: currentData.aprendizadosAplicaveis || `- Clientes ansiosos exigem gestão ativa, alinhamento constante e narrativa de processo, não apenas entrega técnica.\n- No nicho de energia solar, a combinação LP + qualificação de lead + fluxo comercial bem estruturado converte muito melhor do que envio direto para WhatsApp.\n- Criativos com foco em dor financeira e economia geram forte tração de demanda.`,
        insightsReplicaveis: currentData.insightsReplicaveis || `A combinação entre:\n- Landing page otimizável,\n- Campanhas de conversão bem estruturadas e\n- Criativos focados em benefício financeiro e economia\n\nse mostrou um padrão altamente replicável para negócios de energia solar dentro da carteira da DOT.`,
        resumoCase: currentData.resumoCase || `Com o tempo necessário, o resultado acontece.`,
        metricasBadges: currentData.metricasBadges || `LEADS: 218, REUNIÕES: 120, VENDAS: 21, FATURAMENTO: R$ 505.777, ROAS: 42,6x, ROI: 4.160%`,
      };
    }

    if (!validateRequiredFields(currentData)) {
      return;
    }

    setSaving(true);
    setUploadingLogo(true);
    
    try {
      // Upload logo
      let logoUrl: string | null = null;
      if (currentData.clientLogo) {
        logoUrl = await uploadLogo(currentData.clientLogo);
      }

      const metricasArray = currentData.metricasBadges
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      // Preparar conteúdo para a IA
      const caseContent = `
Cliente: ${currentData.clientName}
Squad: ${currentData.squad}
Nicho(s): ${currentData.nichos.join(', ')}

Contexto inicial: ${currentData.contextoInicial}
Como chegou: ${currentData.comoChegou}
Principais dores: ${currentData.principaisDores}
Objetivos alinhados: ${currentData.objetivosAlinhados}
Metas na entrada: ${currentData.metasEntrada}
Estratégia DOT: ${currentData.estrategiaDot}
Resultados atingidos: ${currentData.resultadosAtingidos}
Aprendizados: ${currentData.aprendizadosAplicaveis}
Resumo: ${currentData.resumoCase}
Métricas: ${currentData.metricasBadges}
      `.trim();

      // Chamar IA para gerar copy do Instagram e artigo completo do blog
      toast.info('Gerando copy com IA...');
      const { data: copyData, error: copyError } = await supabase.functions.invoke('generate-case-copy', {
        body: {
          clientName: currentData.clientName,
          caseContent,
          prompts: [...postPrompts, ...blogPrompts],
          userId: user.id
        }
      });

      let tituloDestaque = currentData.tituloDestaque || `Case de Sucesso: ${currentData.clientName}`;
      let descricaoCurta = currentData.descricaoCurta || `Conheça o case de sucesso do cliente ${currentData.clientName} com a DOT.`;
      let copyInstagram = '';
      let blogArticle = '';

      if (copyError) {
        console.error('Erro ao gerar copy:', copyError);
        toast.warning('Erro ao gerar copy, usando valores padrão para o blog');
      } else if (copyData?.success && copyData?.data) {
        copyInstagram = copyData.data.copy_instagram || '';
        blogArticle = copyData.data.blog_article || '';
        
        // Extrair título H1 do artigo Markdown para usar como titulo_destaque
        if (blogArticle) {
          const h1Match = blogArticle.match(/^#\s+(.+)$/m);
          if (h1Match) {
            tituloDestaque = h1Match[1].trim();
          }
          
          // Extrair primeiro parágrafo (após o H1) como descrição curta
          const paragraphs = blogArticle.split('\n\n');
          for (const p of paragraphs) {
            const trimmed = p.trim();
            // Pular headers e linhas vazias
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('**') && trimmed.length > 50) {
              // Limitar a 160 caracteres
              descricaoCurta = trimmed.length > 160 ? trimmed.substring(0, 157) + '...' : trimmed;
              break;
            }
          }
        }
        
        toast.success('Copy gerada com sucesso!');
      }

      // Salvar case com dados gerados pela IA
      const { data: savedCase, error } = await supabase.from('success_cases').insert({
        client_id: currentData.clientId || null,
        client_name: currentData.clientName,
        squad: currentData.squad,
        owner: currentData.owner,
        nichos: currentData.nichos,
        contexto_inicial: currentData.contextoInicial,
        como_chegou: currentData.comoChegou,
        principais_dores: currentData.principaisDores,
        tentativas_anteriores: currentData.tentativasAnteriores,
        objetivos_alinhados: currentData.objetivosAlinhados,
        metas_entrada: currentData.metasEntrada,
        prazo_analise: currentData.prazoAnalise,
        estrategia_dot: currentData.estrategiaDot,
        periodo_analisado: currentData.periodoAnalisado,
        resultados_atingidos: currentData.resultadosAtingidos,
        aprendizados: currentData.aprendizadosAplicaveis,
        insights_replicaveis: currentData.insightsReplicaveis,
        resumo_case: currentData.resumoCase,
        titulo_destaque: tituloDestaque,
        descricao_curta: descricaoCurta,
        metricas_badges: metricasArray,
        client_logo: logoUrl,
        is_published: true,
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      // Salvar copies no histórico (post e blog separadamente) - SEMPRE criar entradas
      const copiesToInsert = [] as any[];
      
      // Copy do Instagram (post) - sempre salvar, mesmo que vazio
      copiesToInsert.push({
        client_name: currentData.clientName,
        input_context: caseContent,
        ai_response: copyInstagram || 'Prompt de post inativo no momento da geração. Reative o prompt e gere novamente.',
        ai_provider: copyData?.model || 'anthropic',
        status: copyInstagram ? 'completed' : 'pending',
        copy_type: 'post',
        created_by: user.id
      });
      
      // Copy do Blog (artigo completo em Markdown) - sempre salvar, mesmo que vazio
      copiesToInsert.push({
        client_name: currentData.clientName,
        input_context: caseContent,
        ai_response: blogArticle || 'Prompt de blog inativo no momento da geração. Reative o prompt e gere novamente.',
        ai_provider: copyData?.model || 'anthropic',
        status: blogArticle ? 'completed' : 'pending',
        copy_type: 'blog',
        created_by: user.id
      });
      
      await supabase.from('success_case_copies').insert(copiesToInsert);
      loadCaseCopies();
      
      toast.success('Case salvo com sucesso!');
      resetForm();
      setActiveTab('blog');
      loadSavedCases();
    } catch (error) {
      console.error('Erro ao salvar case:', error);
      toast.error('Erro ao salvar case');
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const togglePublish = async (caseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('success_cases')
        .update({ is_published: !currentStatus })
        .eq('id', caseId);

      if (error) throw error;
      
      toast.success(currentStatus ? 'Case despublicado' : 'Case publicado!');
      loadSavedCases();
    } catch (error) {
      console.error('Erro ao atualizar case:', error);
      toast.error('Erro ao atualizar case');
    }
  };

  const deleteCase = async (caseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este case?')) return;

    try {
      const { error } = await supabase
        .from('success_cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;
      
      toast.success('Case excluído');
      loadSavedCases();
    } catch (error) {
      console.error('Erro ao excluir case:', error);
      toast.error('Erro ao excluir case');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCase);
      setCopied(true);
      toast.success('Case copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setGeneratedCase('');
  };

  const blogUrl = `${window.location.origin}/cases`;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Cases de Sucesso
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documente e publique cases de sucesso dos clientes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full max-w-lg ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="gerar" className="gap-2">
            <PenLine className="h-4 w-4" />
            Gerar Case
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="prompts" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Prompt
              </TabsTrigger>
              <TabsTrigger value="gerenciar" className="gap-2">
                <Settings className="h-4 w-4" />
                Gerenciar Blog
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="gerar" className="space-y-6 mt-6">
          {!generatedCase ? (
            <div className="space-y-6">
              {/* Seleção do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Selecionar Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.clientId}
                        onValueChange={handleClientChange}
                        disabled={loadingClients}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione um cliente"} />
                        </SelectTrigger>
                        <SelectContent>
                          {csmClients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name || client.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Squad</Label>
                      <Input value={formData.squad} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Proprietário</Label>
                      <Input value={formData.owner} disabled className="bg-muted" />
                    </div>
                  </div>
                  
                  {/* Seleção de Nichos */}
                  <div className="space-y-2">
                    <Label>Nicho(s) de atuação <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground">Você pode selecionar mais de um nicho</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {nichoOptions.map(nicho => (
                        <button
                          key={nicho}
                          type="button"
                          onClick={() => handleNichoToggle(nicho)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            formData.nichos.includes(nicho)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          }`}
                        >
                          {nicho}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 1. Introdução */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Introdução <span className="text-destructive">*</span></CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Objetivo: Mostrar claramente "de onde saímos": produto excelente e demanda real, porém sem estratégia e sem previsibilidade.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contexto inicial (Ponto de partida) <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.contextoInicial}
                      onChange={e => handleInputChange('contextoInicial', e.target.value)}
                      placeholder="Descreva o contexto inicial do cliente..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Como o cliente chegou até nós? <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.comoChegou}
                      onChange={e => handleInputChange('comoChegou', e.target.value)}
                      placeholder="Descreva como o cliente conheceu a DOT..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Principais dores antes do nosso trabalho <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.principaisDores}
                      onChange={e => handleInputChange('principaisDores', e.target.value)}
                      placeholder="Liste as principais dores do cliente..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>O que já havia sido tentado antes</Label>
                    <Textarea
                      value={formData.tentativasAnteriores}
                      onChange={e => handleInputChange('tentativasAnteriores', e.target.value)}
                      placeholder="Descreva tentativas anteriores do cliente..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Desafios do Projeto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Desafios do Projeto <span className="text-destructive">*</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Objetivos alinhados com o cliente <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.objetivosAlinhados}
                      onChange={e => handleInputChange('objetivosAlinhados', e.target.value)}
                      placeholder="Descreva os objetivos definidos com o cliente..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Metas na entrada <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.metasEntrada}
                      onChange={e => handleInputChange('metasEntrada', e.target.value)}
                      placeholder="Ex: Gerar 20 leads por dia"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo / Janela de análise <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.prazoAnalise}
                      onChange={e => handleInputChange('prazoAnalise', e.target.value)}
                      placeholder="Ex: Primeiros 90 dias de projeto"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Estratégia DOT */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. Estratégia DOT <span className="text-destructive">*</span></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Descreva a estratégia implementada <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.estrategiaDot}
                      onChange={e => handleInputChange('estrategiaDot', e.target.value)}
                      placeholder="Descreva as ações de campanhas, criativos, landing pages, etc..."
                      rows={8}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 4. Resultados Obtidos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">4. Resultados Obtidos <span className="text-destructive">*</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Período analisado <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.periodoAnalisado}
                      onChange={e => handleInputChange('periodoAnalisado', e.target.value)}
                      placeholder="Ex: Outubro de 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resultados atingidos <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={formData.resultadosAtingidos}
                      onChange={e => handleInputChange('resultadosAtingidos', e.target.value)}
                      placeholder="Descreva os resultados (leads, reuniões, vendas, faturamento, CPL, ROAS, ROI, etc.)"
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Aprendizados e Replicabilidade */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">5. Aprendizados e Replicabilidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Aprendizados aplicáveis a outros clientes</Label>
                    <Textarea
                      value={formData.aprendizadosAplicaveis}
                      onChange={e => handleInputChange('aprendizadosAplicaveis', e.target.value)}
                      placeholder="O que aprendemos que pode ser aplicado em outros projetos..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Insights replicáveis</Label>
                    <Textarea
                      value={formData.insightsReplicaveis}
                      onChange={e => handleInputChange('insightsReplicaveis', e.target.value)}
                      placeholder="Insights que podem virar padrões internos..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do Case <span className="text-destructive">*</span></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Resumo do case em uma frase <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.resumoCase}
                      onChange={e => handleInputChange('resumoCase', e.target.value)}
                      placeholder='Ex: "Com o tempo necessário, o resultado acontece."'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Configurações para Blog */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configurações para Publicar <span className="text-destructive">*</span></CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Estas informações serão exibidas no card do blog público
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Logo do Cliente (PNG com fundo transparente) <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {formData.clientLogoPreview ? (
                              <img 
                                src={formData.clientLogoPreview} 
                                alt="Preview" 
                                className="h-20 object-contain"
                              />
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Clique para enviar PNG
                                </p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".png,image/png"
                            onChange={handleLogoChange}
                          />
                        </label>
                      </div>
                      
                      {/* Preview da capa */}
                      {formData.clientLogoPreview && (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-xs text-muted-foreground">Preview da capa:</p>
                          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border">
                            <img 
                              src={formData.clientLogoPreview} 
                              alt="Cliente" 
                              className="h-8 object-contain"
                            />
                            <span className="text-muted-foreground">+</span>
                            <img 
                              src={dotLogoDark} 
                              alt="DOT" 
                              className="h-8 object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Título de destaque <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">({formData.tituloDestaque.length}/100 caracteres)</span></Label>
                    <Input
                      value={formData.tituloDestaque}
                      onChange={e => handleInputChange('tituloDestaque', e.target.value.slice(0, 100))}
                      placeholder='Ex: "+312% em leads B2B"'
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição curta <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.descricaoCurta}
                      onChange={e => handleInputChange('descricaoCurta', e.target.value)}
                      placeholder='Ex: "Estratégia full-funnel com foco em previsibilidade de vendas."'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Métricas (badges) <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.metricasBadges}
                      onChange={e => handleInputChange('metricasBadges', e.target.value)}
                      placeholder='Ex: -47% CPL, 5.2x ROAS, 90 dias (separado por vírgula)'
                    />
                    <p className="text-xs text-muted-foreground">Separe cada métrica por vírgula</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {defaultMetricsBadges.map(badge => (
                        <button
                          key={badge}
                          type="button"
                          onClick={() => {
                            const current = formData.metricasBadges;
                            const newValue = current ? `${current}, ${badge}` : badge;
                            handleInputChange('metricasBadges', newValue);
                          }}
                          className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                        >
                          + {badge}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botões */}
              <div className="flex justify-end gap-3">
                <Button onClick={generateCase} variant="outline" size="lg" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Gerar Preview
                </Button>
                <Button onClick={saveCase} size="lg" className="gap-2" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploadingLogo ? 'Enviando logo...' : 'Salvar Case'}
                </Button>
              </div>
            </div>
          ) : (
            /* Preview do Case Gerado */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Gerado</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button onClick={resetForm} variant="outline">
                    Novo Case
                  </Button>
                  <Button onClick={saveCase} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-6 whitespace-pre-wrap font-mono text-sm max-h-[70vh] overflow-y-auto">
                  {generatedCase}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba blog removida - funcionalidade movida para Gerenciar Blog */}

        {/* Aba Prompt - Configuração de Prompts para IA */}
        {isAdmin && (
          <TabsContent value="prompts" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Prompts para Geração de Copy
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure prompts separados para Post de Instagram e para o Blog. Ambos usam as informações do case.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 4 Sub-abas */}
                <Tabs value={promptSubTab} onValueChange={(v) => setPromptSubTab(v as typeof promptSubTab)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="config-post" className="gap-1 text-xs">
                      <Settings className="h-3 w-3" />
                      Prompt Post
                    </TabsTrigger>
                    <TabsTrigger value="result-post" className="gap-1 text-xs">
                      <FileText className="h-3 w-3" />
                      Resultado Post
                    </TabsTrigger>
                    <TabsTrigger value="config-blog" className="gap-1 text-xs">
                      <Settings className="h-3 w-3" />
                      Prompt Blog
                    </TabsTrigger>
                    <TabsTrigger value="result-blog" className="gap-1 text-xs">
                      <Globe className="h-3 w-3" />
                      Resultado Blog
                    </TabsTrigger>
                  </TabsList>

                  {/* Configurar Prompt Post */}
                  <TabsContent value="config-post" className="space-y-6 mt-6">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Prompt para Post
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label>Título do Prompt</Label>
                          <Input
                            value={newPrompt.title}
                            onChange={e => setNewPrompt(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: Prompt base para Instagram"
                          />
                        </div>
                        <div>
                          <Label>Conteúdo do Prompt</Label>
                          <Textarea
                            value={newPrompt.content}
                            onChange={e => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Digite as instruções para a IA..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                        <Button onClick={() => saveNewPrompt('post')} disabled={savingPrompt} className="gap-2">
                          {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar Prompt
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Prompts de Post Salvos</h3>
                      {loadingPrompts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : postPrompts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum prompt de post cadastrado
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {postPrompts.map(prompt => (
                            <div 
                              key={prompt.id} 
                              className={`p-4 border rounded-lg ${prompt.is_active ? 'bg-green-500/5 border-green-500/30' : 'bg-muted/30 border-muted'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{prompt.title}</h4>
                                    <Badge variant={prompt.is_active ? 'default' : 'secondary'} className="text-xs">
                                      {prompt.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-3 font-mono">
                                    {prompt.content}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => togglePromptActive(prompt.id, prompt.is_active)}>
                                    {prompt.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(prompt)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deletePrompt(prompt.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Resultado Post */}
                  <TabsContent value="result-post" className="space-y-6 mt-6">
                    <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Copies de Post (Instagram)
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        As copies de post são geradas automaticamente ao criar um case. Resultado vai para a lista abaixo.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Histórico de Copies de Post</h3>
                      {loadingCopies ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : postCopies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                          Nenhuma copy de post gerada ainda
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-3 font-medium text-sm">Cliente</th>
                                <th className="text-left p-3 font-medium text-sm">Criado por</th>
                                <th className="text-left p-3 font-medium text-sm">Data</th>
                                <th className="text-right p-3 font-medium text-sm">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {postCopies.map(copy => (
                                <tr key={copy.id} className="hover:bg-muted/30">
                                  <td className="p-3 font-medium">{copy.client_name}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{copy.profiles?.name || 'Desconhecido'}</td>
                                  <td className="p-3 text-sm text-muted-foreground">
                                    {new Date(copy.created_at).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => setViewingCopy(copy)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => regenerateCopy(copy, 'post')} className="gap-1">
                                        <Send className="h-3 w-3" />
                                        Refazer Copy
                                      </Button>
                                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCaseCopy(copy.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Configurar Prompt Blog */}
                  <TabsContent value="config-blog" className="space-y-6 mt-6">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Prompt para Blog
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label>Título do Prompt</Label>
                          <Input
                            value={newPrompt.title}
                            onChange={e => setNewPrompt(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: Prompt para título do blog"
                          />
                        </div>
                        <div>
                          <Label>Conteúdo do Prompt</Label>
                          <Textarea
                            value={newPrompt.content}
                            onChange={e => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Digite as instruções para gerar título e descrição do blog..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                        <Button onClick={() => saveNewPrompt('blog')} disabled={savingPrompt} className="gap-2">
                          {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar Prompt
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Prompts de Blog Salvos</h3>
                      {loadingPrompts ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : blogPrompts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum prompt de blog cadastrado
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {blogPrompts.map(prompt => (
                            <div 
                              key={prompt.id} 
                              className={`p-4 border rounded-lg ${prompt.is_active ? 'bg-green-500/5 border-green-500/30' : 'bg-muted/30 border-muted'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{prompt.title}</h4>
                                    <Badge variant={prompt.is_active ? 'default' : 'secondary'} className={`text-xs ${prompt.is_active ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                                      {prompt.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-3 font-mono">
                                    {prompt.content}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => togglePromptActive(prompt.id, prompt.is_active)}>
                                    {prompt.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(prompt)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deletePrompt(prompt.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </TabsContent>

                  {/* Resultado Blog */}
                  <TabsContent value="result-blog" className="space-y-6 mt-6">
                    <div className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        Conteúdo para o Blog
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        O resultado da IA para blog é usado diretamente para publicar o case. O título e descrição gerados vão para o case no blog.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Histórico de Copies de Blog</h3>
                      {loadingCopies ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : blogCopies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                          Nenhuma copy de blog gerada ainda
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-3 font-medium text-sm">Cliente</th>
                                <th className="text-left p-3 font-medium text-sm">Criado por</th>
                                <th className="text-left p-3 font-medium text-sm">Data</th>
                                <th className="text-right p-3 font-medium text-sm">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {blogCopies.map(copy => (
                                <tr key={copy.id} className="hover:bg-muted/30">
                                  <td className="p-3 font-medium">{copy.client_name}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{copy.profiles?.name || 'Desconhecido'}</td>
                                  <td className="p-3 text-sm text-muted-foreground">
                                    {new Date(copy.created_at).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => setViewingCopy(copy)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => regenerateCopy(copy, 'blog')} className="gap-1">
                                        <Send className="h-3 w-3" />
                                        Refazer Copy
                                      </Button>
                                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCaseCopy(copy.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Dialog para edição de prompt */}
            <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Editar Prompt
                  </DialogTitle>
                </DialogHeader>
                {editingPrompt && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={editingPrompt.title}
                        onChange={e => setEditingPrompt(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Conteúdo do Prompt</Label>
                      <Textarea
                        value={editingPrompt.content}
                        onChange={e => setEditingPrompt(prev => prev ? { ...prev, content: e.target.value } : null)}
                        rows={20}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="prompt-active"
                          checked={editingPrompt.is_active}
                          onChange={e => setEditingPrompt(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                          className="rounded"
                        />
                        <Label htmlFor="prompt-active" className="cursor-pointer">Prompt ativo</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={updatePrompt} disabled={savingPrompt} className="gap-2">
                          {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Dialog para visualizar copy com versões */}
            <Dialog open={!!viewingCopy} onOpenChange={(open) => !open && setViewingCopy(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Copy - {viewingCopy?.client_name}
                  </DialogTitle>
                </DialogHeader>
                {viewingCopy && (() => {
                  const versions = getCopyVersions(viewingCopy.client_name, viewingCopy.copy_type);
                  const currentVersionIndex = versions.findIndex(v => v.id === viewingCopy.id);
                  const versionNumber = currentVersionIndex + 1;
                  
                  return (
                    <div className="space-y-6 mt-4">
                      {/* Version selector */}
                      {versions.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Versões:</span>
                          {versions.map((v, idx) => (
                            <Button
                              key={v.id}
                              variant={v.id === viewingCopy.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setViewingCopy(v)}
                              className="gap-1"
                            >
                              Versão {idx + 1}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="secondary">Versão {versionNumber}</Badge>
                        <span>Criado por: {viewingCopy.profiles?.name || 'Desconhecido'}</span>
                        <span>•</span>
                        <span>
                          {new Date(viewingCopy.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {viewingCopy.ai_response || 'Sem resposta'}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(viewingCopy.ai_response || '');
                            toast.success('Copy copiada!');
                          }}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copiar Copy
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteCaseCopy(viewingCopy.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Aba Gerenciar Blog - CMS Visual */}
        {isAdmin && (
          <TabsContent value="gerenciar" className="space-y-6 mt-6">
            {/* Link do Blog Público */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Link do Blog Público
                    </p>
                    <p className="text-sm text-muted-foreground">Compartilhe este link com seus clientes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-1.5 rounded text-sm">{blogUrl}</code>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/cases" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview do Blog com edição inline */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Gerenciar Blog - Edição Visual
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Edite o conteúdo diretamente na visualização do blog
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {/* Preview Header */}
                <div className="border-b bg-white py-4">
                  <div className="container mx-auto px-4 flex items-center justify-center">
                    <img src={dotLogoDark} alt="DOT" className="h-10" />
                  </div>
                </div>
                
                {/* Editable Hero Section */}
                <div className="py-12 text-center bg-gradient-to-b from-white to-muted/20">
                  <div className="container mx-auto px-4 space-y-4">
                    <Label className="text-xs text-primary font-medium">Título Principal (use "cases de sucesso" para destacar em vermelho)</Label>
                    <Input
                      value={blogConfig.hero_title}
                      onChange={e => setBlogConfig(prev => ({ ...prev, hero_title: e.target.value }))}
                      className="text-center text-xl md:text-2xl font-bold border-dashed border-2 border-primary/30 focus:border-primary bg-transparent"
                    />
                    
                    <Label className="text-xs text-primary font-medium mt-4">Subtítulo</Label>
                    <Input
                      value={blogConfig.hero_subtitle}
                      onChange={e => setBlogConfig(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                      className="text-center text-muted-foreground border-dashed border-2 border-primary/30 focus:border-primary bg-transparent max-w-2xl mx-auto"
                    />

                    {/* Editable Filter Tags Preview */}
                    <div className="mt-8 space-y-4">
                      <Label className="text-xs text-primary font-medium">Nichos Principais (separados por vírgula)</Label>
                      <div className="flex flex-wrap justify-center gap-2 mb-2">
                        {blogConfig.main_niches.split(',').map((n, i) => (
                          <span key={i} className="px-4 py-2 rounded-full border text-sm font-medium bg-white text-secondary border-border">
                            {n.trim()}
                          </span>
                        ))}
                        <span className="px-4 py-2 rounded-full border text-sm font-medium bg-secondary text-white flex items-center gap-1">
                          Outros <ChevronDown className="h-4 w-4" />
                        </span>
                      </div>
                      <Input
                        value={blogConfig.main_niches}
                        onChange={e => setBlogConfig(prev => ({ ...prev, main_niches: e.target.value }))}
                        className="border-dashed border-2 border-primary/30 focus:border-primary max-w-xl mx-auto"
                        placeholder="B2B, Franquia, Energia Solar..."
                      />
                      
                      <Label className="text-xs text-primary font-medium mt-4">Nichos do submenu "Outros" (separados por vírgula)</Label>
                      <Textarea
                        value={blogConfig.other_niches}
                        onChange={e => setBlogConfig(prev => ({ ...prev, other_niches: e.target.value }))}
                        className="border-dashed border-2 border-primary/30 focus:border-primary max-w-xl mx-auto"
                        placeholder="Serviço, Varejo, SAAS..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview real dos posts publicados (editável) */}
                <div className="py-12 bg-background">
                  <div className="container mx-auto px-4">
                    <PublishedCasesPreview
                      cases={savedCases as any}
                      loading={loadingCases}
                      onUploadCover={(caseId, file) => updateCaseCover(caseId, file)}
                      onUploadLogo={(caseId, file) => updateCaseLogo(caseId, file)}
                      onSave={(caseId, patch) => updateCaseFields(caseId, patch as any)}
                      onDelete={isAdmin ? deleteCase : undefined}
                    />
                  </div>
                </div>

                {/* Editable CTA Section */}
                <div className="py-12 bg-secondary mx-4 md:mx-8 rounded-2xl mb-8">
                  <div className="container mx-auto px-4 text-center space-y-4">
                    <Label className="text-xs text-white/70 font-medium">Título do CTA</Label>
                    <Input
                      value={blogConfig.cta_title}
                      onChange={e => setBlogConfig(prev => ({ ...prev, cta_title: e.target.value }))}
                      className="text-center text-xl md:text-2xl font-bold text-white bg-white/10 border-dashed border-2 border-white/30 focus:border-white max-w-2xl mx-auto"
                    />
                    
                    <Label className="text-xs text-white/70 font-medium">Subtítulo do CTA</Label>
                    <Input
                      value={blogConfig.cta_subtitle}
                      onChange={e => setBlogConfig(prev => ({ ...prev, cta_subtitle: e.target.value }))}
                      className="text-center text-white/80 bg-white/10 border-dashed border-2 border-white/30 focus:border-white max-w-xl mx-auto"
                    />
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                      <div className="space-y-1">
                        <Label className="text-xs text-white/70 font-medium">Texto do Botão</Label>
                        <Input
                          value={blogConfig.cta_button_text}
                          onChange={e => setBlogConfig(prev => ({ ...prev, cta_button_text: e.target.value }))}
                          className="bg-destructive text-white border-dashed border-2 border-white/30 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-white/70 font-medium">Link do Botão</Label>
                        <Input
                          value={blogConfig.cta_link}
                          onChange={e => setBlogConfig(prev => ({ ...prev, cta_link: e.target.value }))}
                          className="bg-white/10 text-white border-dashed border-2 border-white/30"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métricas Options */}
                <div className="p-6 border-t bg-muted/20">
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Opções de Métricas (Badges)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Estas opções aparecem como sugestão ao criar um novo case
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {blogConfig.metrics_badges_options.split(',').map((m, i) => (
                          <Badge key={i} variant="outline" className="bg-muted/50">
                            {m.trim()}
                          </Badge>
                        ))}
                      </div>
                      <Textarea
                        value={blogConfig.metrics_badges_options}
                        onChange={e => setBlogConfig(prev => ({ ...prev, metrics_badges_options: e.target.value }))}
                        className="border-dashed border-2 border-primary/30 focus:border-primary"
                        placeholder="ROI, FATURAMENTO, VENDAS, ROAS..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="p-6 border-t bg-white sticky bottom-0">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Button variant="outline" asChild>
                      <a href="/cases" target="_blank" rel="noopener noreferrer" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Ver Blog Público
                      </a>
                    </Button>
                    <Button onClick={saveBlogConfig} disabled={savingConfig} className="gap-2">
                      {savingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog global para edição de título do case */}
      <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Título do Case
            </DialogTitle>
          </DialogHeader>
          {editingCase && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título de Destaque <span className="text-xs text-muted-foreground">({editingCase.titulo_destaque.length}/100 caracteres)</span></Label>
                <Input
                  value={editingCase.titulo_destaque}
                  onChange={e => setEditingCase(prev => prev ? { ...prev, titulo_destaque: e.target.value.slice(0, 100) } : null)}
                  className="mt-1"
                  placeholder="Digite o título do case..."
                  maxLength={100}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCase(null)}>
                  Cancelar
                </Button>
                <Button onClick={updateCaseTitle} disabled={savingCaseEdit} className="gap-2">
                  {savingCaseEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
