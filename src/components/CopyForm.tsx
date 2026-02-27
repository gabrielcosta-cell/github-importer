import React, { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Settings, FileText, Users, Mic, History, Loader2, ArrowLeft, Eye, Upload, RefreshCw, Send, X, Save, Copy, Trash2, Calendar, CalendarIcon, FileSpreadsheet, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useModulePermissions } from "@/hooks/useModulePermissions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { gerarCopyDOT, convertStoragePathsToFiles } from "@/utils/copyDOT"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as XLSX from 'xlsx'
import { DotLogo } from '@/components/DotLogo';

const copyFormSchema = z.object({
  // Transcrições das reuniões
  reuniao_boas_vindas: z.string().optional(),
  reuniao_kick_off: z.string().optional(),
  reuniao_brainstorm: z.string().optional(),
  
  // Estrutura da Landing Page
  tamanho_lp: z.string().optional(),
  
  // Empresa & Oferta
  nome_empresa: z.string().optional(),
  nicho_empresa: z.string().optional(),
  site: z.string().optional(),
  servicos_produtos: z.string().optional(),
  diferencial_competitivo: z.string().optional(),
  
  // Público, Jornada & Mídia
  publico_alvo: z.string().optional(),
  principal_inimigo: z.string().optional(),
  avatar_principal: z.string().optional(),
  momento_jornada: z.string().optional(),
  maior_objecao: z.string().optional(),
  cases_impressionantes: z.string().optional(),
  nomes_empresas: z.string().optional(),
  investimento_medio: z.string().optional(),
  pergunta_qualificatoria: z.string().optional(),
  informacao_extra: z.string().optional(),
  numeros_certificados: z.string().optional(),
})

type CopyFormData = z.infer<typeof copyFormSchema>

interface CopyFormRecord {
  id: string
  created_at: string  
  created_by: string
  status: string
  nome_empresa?: string
  document_files?: string[]
  ai_response?: string
  ai_provider?: string
  response_generated_at?: string
  profiles?: { name: string; email: string }
}

interface CopyFormProps {
  onBack?: () => void
}

export function CopyForm({ onBack }: CopyFormProps = {}) {
  const { profile } = useAuth()
  const { checkModulePermission } = useModulePermissions()
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<'form' | 'loading'>('form')
  const [briefingHistory, setBriefingHistory] = useState<CopyFormRecord[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([])
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [defaultDocuments, setDefaultDocuments] = useState<any[]>([])
  const [isLoadingDefaultDocs, setIsLoadingDefaultDocs] = useState(false)
  
  // Estados para gerenciar prompts padrão
  const [defaultPrompts, setDefaultPrompts] = useState<any[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  
  // Estados para labels customizáveis
  const [formLabels, setFormLabels] = useState<Record<string, any>>({})
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [viewingCopy, setViewingCopy] = useState<CopyFormRecord | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<any>(null)
  const [newPromptTitle, setNewPromptTitle] = useState('')
  const [newPromptContent, setNewPromptContent] = useState('')
  const [collapsedPrompts, setCollapsedPrompts] = useState<Set<string>>(new Set()) // State for collapsing prompts
  const [showCreatePrompt, setShowCreatePrompt] = useState(false) // State for showing create prompt form
  
  // Estados para filtros do histórico
  const [clientNameFilter, setClientNameFilter] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [creatorFilter, setCreatorFilter] = useState('all')
  
  // Estados para paginação do histórico
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Estados para gerar nova copy
  const [showNewCopyModal, setShowNewCopyModal] = useState(false)
  const [selectedBriefingForNewCopy, setSelectedBriefingForNewCopy] = useState<any>(null)
  const [newCopyContext, setNewCopyContext] = useState('')
  const [isGeneratingNewCopy, setIsGeneratingNewCopy] = useState(false)
  const [expandedCopies, setExpandedCopies] = useState<Set<number>>(new Set([0]))
  
  // Estado para rastrear campos modificados e visualizar briefing
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  const [viewingBriefing, setViewingBriefing] = useState<any>(null)
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set())
  
  // Estado para controlar aba principal (Onboarding/Ongoing)
  const [mainTab, setMainTab] = useState<'onboarding' | 'ongoing'>('onboarding')
  const [materialType, setMaterialType] = useState<'criativos' | 'roteiros' | 'landing'>('criativos')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [crmClients, setCrmClients] = useState<any[]>([])
  const fetchSeqRef = useRef(0) // evita condição de corrida entre abas

  // Verificações de permissão
  const canViewHistory = checkModulePermission('copy', 'view')
  const canCreateCopy = checkModulePermission('copy', 'create') 
  const canEditCopy = checkModulePermission('copy', 'edit')
  const canDeleteCopies = checkModulePermission('copy', 'delete')
  const isAdmin = profile?.effectiveRole === 'admin'
  
  // Regras de negócio das permissões:
  // - Acesso aos prompts: requer permissões de editar E excluir
  // - Excluir histórico: requer permissão de excluir
  const canAccessPrompts = (canEditCopy && canDeleteCopies) || isAdmin

  // Função para filtrar o histórico de briefings
  const filteredBriefingHistory = briefingHistory.filter((briefing) => {
    const matchesClientName = !clientNameFilter || 
      (briefing.nome_empresa || '').toLowerCase().includes(clientNameFilter.toLowerCase())
    
    const briefingDate = new Date(briefing.created_at)
    const matchesStartDate = !startDate || briefingDate >= startDate
    const matchesEndDate = !endDate || briefingDate <= endDate
    const matchesDate = matchesStartDate && matchesEndDate
    
    const matchesCreator = !creatorFilter || creatorFilter === 'all' || 
      (briefing.profiles?.name || '').toLowerCase().includes(creatorFilter.toLowerCase())
    
    return matchesClientName && matchesDate && matchesCreator
  })
  
  // Calcular paginação
  const totalPages = Math.ceil(filteredBriefingHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedHistory = filteredBriefingHistory.slice(startIndex, endIndex)
  
  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(1)
  }, [clientNameFilter, startDate, endDate, creatorFilter])

  // Obter lista de criadores únicos para o filtro
  const uniqueCreators = Array.from(
    new Set(briefingHistory.map(b => b.profiles?.name).filter(Boolean))
  ).sort()
  
  // Valores padrão vazios
  const defaultExamples: Record<string, string> = {}

  const form = useForm<CopyFormData>({
    resolver: zodResolver(copyFormSchema),
    defaultValues: defaultExamples,
  })
  
  // Verifica se um campo contém apenas o exemplo padrão
  const isDefaultValue = (fieldName: string, value: string) => {
    return false // Sem valores default, sempre retorna false
  }
  
  // Verifica se campo foi modificado
  const isFieldModified = (fieldName: string) => {
    return modifiedFields.has(fieldName)
  }

  const uploadDocuments = async () => {
    if (uploadedDocuments.length === 0) return []
    
    const uploadPromises = uploadedDocuments.map(async (file) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${profile?.user_id}/${fileName}`
      
      const { error } = await supabase.storage
        .from('briefing-documents')
        .upload(filePath, file)
      
      if (error) throw error
      return filePath
    })
    
    return await Promise.all(uploadPromises)
  }

  const onSubmit = async (data: CopyFormData) => {
    setIsLoading(true)
    setCurrentView('loading')
    
    try {
      // Upload documentos extras se houver
      let extraDocumentPaths: string[] = []
      if (uploadedDocuments.length > 0) {
        setUploadingDocs(true)
        extraDocumentPaths = await uploadDocuments()
        setUploadingDocs(false)
      }

      // Garantir created_by correto (RLS exige = auth.uid())
      const { data: authUser } = await supabase.auth.getUser()
      const createdBy = profile?.user_id ?? authUser?.user?.id
      if (!createdBy) throw new Error('Usuário não autenticado')

      // Filtrar apenas colunas existentes na tabela copy_forms (evita erro de coluna inexistente)
      const allowedFields = [
        'reuniao_boas_vindas','reuniao_kick_off','reuniao_brainstorm',
        'servicos_produtos','diferencial_competitivo','publico_alvo','principal_inimigo',
        'avatar_principal','momento_jornada','maior_objecao','cases_impressionantes',
        'nomes_empresas','investimento_medio','pergunta_qualificatoria','informacao_extra',
        'numeros_certificados','nome_empresa','nicho_empresa'
      ] as const
      const filtered: Record<string, any> = {}
      for (const key of allowedFields) {
        if (key in data) filtered[key] = (data as any)[key]
      }

      // Salvar dados do formulário no banco (somente colunas válidas)
      const { data: savedForm, error: saveError } = await supabase
        .from('copy_forms')
        .insert({
          ...filtered,
          created_by: createdBy,
          status: 'processing',
          copy_type: mainTab, // Adiciona o tipo de copy (onboarding ou ongoing)
          document_files: extraDocumentPaths.length > 0 ? extraDocumentPaths : null
        })
        .select()
        .single()

      if (saveError) throw saveError

      // Chamar a Edge Function para gerar a copy
      const { data: copyResponse, error: copyError } = await supabase
        .functions
        .invoke('generate-copy-ai', {
          body: { copyFormId: savedForm.id }
        })
      console.info('📨 generate-copy-ai response:', { copyResponse, copyError })

      if (copyError) {
        console.error('❌ Erro na edge function:', copyError)
        await supabase
          .from('copy_forms')
          .update({ status: 'failed' })
          .eq('id', savedForm.id)
        throw copyError
      }

      const totalDocs = extraDocumentPaths.length
      toast.success(`✅ Briefing salvo e copy gerada${totalDocs > 0 ? ` com ${totalDocs} documento(s)` : ''}!`)
      form.reset()
      setUploadedDocuments([])
      if (canViewHistory) fetchBriefingHistory()
      setCurrentView('form')
      setIsLoading(false)
    } catch (error: any) {
      console.error('Erro ao salvar briefing:', error)
      const serverMsg = error?.message || error?.hint || 'Erro ao salvar briefing'
      toast.error(`Erro ao salvar briefing: ${serverMsg}`)
      setCurrentView('form')
      setIsLoading(false)
    }
  }

  const handleDeleteCopy = async (copyId: string) => {
    try {
      const { error } = await supabase
        .from('copy_forms')
        .delete()
        .eq('id', copyId)

      if (error) throw error

      toast.success("Copy excluída com sucesso!")
      fetchBriefingHistory()
      setViewingCopy(null)
    } catch (error) {
      console.error('Erro ao excluir copy:', error)
      toast.error("Erro ao excluir copy")
    }
  }

  const fetchBriefingHistory = async () => {
    if (!canViewHistory) return

    // Controle de corrida: captura sequência e aba atual
    const seq = ++fetchSeqRef.current
    const tabAtRequest = mainTab

    try {
      const { data, error } = await supabase
        .from('copy_forms')
        .select(`
          id,
          created_at,
          created_by,
          status,
          nome_empresa,
          document_files,
          ai_response,
          ai_provider,
          response_generated_at,
          copy_type
        `)
        .eq('copy_type', tabAtRequest) // usa aba no momento da requisição
        .order('created_at', { ascending: false })

      if (error) throw error

      // Se durante a requisição a aba mudou, ignore este resultado
      if (seq !== fetchSeqRef.current || tabAtRequest !== mainTab) {
        return
      }

      // Buscar dados dos usuários separadamente
      const briefingsWithProfiles = await Promise.all(
        (data || []).map(async (briefing) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('user_id', briefing.created_by)
            .single()

          return {
            ...briefing,
            profiles: profileData || { name: 'Usuário desconhecido', email: '' }
          }
        })
      )

      // Verifica novamente antes de setar estado
      if (seq !== fetchSeqRef.current || tabAtRequest !== mainTab) {
        return
      }

      setBriefingHistory(briefingsWithProfiles)
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
    }
  }

  // Buscar clientes ativos do CRM
  const fetchCRMClients = async () => {
    try {
      const { data, error } = await supabase
        .from('csm_cards')
        .select('id, company_name, title')
        .order('company_name', { ascending: true })
      
      if (error) throw error
      
      // Filtrar apenas empresas com nome válido e remover duplicatas
      const uniqueCompanies = Array.from(
        new Map(
          (data || [])
            .filter(card => card.company_name && card.company_name.trim() !== '')
            .map(card => [card.company_name, card])
        ).values()
      )
      
      setCrmClients(uniqueCompanies)
    } catch (error) {
      console.error('Erro ao buscar clientes do CRM:', error)
    }
  }

  // Carregar histórico quando componente monta ou mainTab muda
  useEffect(() => {
    // Limpar estados ao trocar de aba para evitar mostrar dados da aba anterior
    setBriefingHistory([])
    setDefaultDocuments([])
    setDefaultPrompts([])
    setViewingCopy(null)
    
    if (canViewHistory) {
      fetchBriefingHistory()
    }
    if (canAccessPrompts) {
      fetchDefaultDocuments()
      fetchDefaultPrompts()
    }
    // Carregar labels customizados
    fetchFormLabels()
    // Carregar clientes do CRM
    fetchCRMClients()
  }, [canViewHistory, isAdmin, mainTab]) // Adiciona mainTab às dependências

  const fetchFormLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('briefing_form_labels')
        .select('*')
      
      if (error) throw error
      
      // Converter array em objeto para fácil acesso
      const labelsMap = (data || []).reduce((acc, label) => {
        acc[label.field_key] = label
        return acc
      }, {} as Record<string, any>)
      
      setFormLabels(labelsMap)
    } catch (error) {
      console.error('Erro ao carregar labels:', error)
    }
  }

  const handleSaveLabel = async (fieldKey: string, field: 'label_text' | 'description_text' | 'section_title' | 'section_description') => {
    try {
      const updateData: any = {
        [field]: editingValue,
        updated_by: profile?.user_id
      }

      const { error } = await supabase
        .from('briefing_form_labels')
        .upsert({
          field_key: fieldKey,
          ...updateData
        })

      if (error) throw error

      toast.success("Label atualizado com sucesso!")
      fetchFormLabels()
      setEditingLabel(null)
    } catch (error) {
      console.error('Erro ao salvar label:', error)
      toast.error("Erro ao salvar label")
    }
  }

  const getLabel = (fieldKey: string, defaultValue: string) => {
    return formLabels[fieldKey]?.label_text || defaultValue
  }

  const getDescription = (fieldKey: string, defaultValue: string) => {
    return formLabels[fieldKey]?.description_text || defaultValue
  }

  const getSectionTitle = (fieldKey: string, defaultValue: string) => {
    return formLabels[fieldKey]?.section_title || defaultValue
  }

  const getSectionDescription = (fieldKey: string, defaultValue: string) => {
    return formLabels[fieldKey]?.section_description || defaultValue
  }

  const EditableText = React.memo(({ 
    fieldKey, 
    field, 
    defaultValue, 
    className = "", 
    isTitle = false 
  }: { 
    fieldKey: string
    field: 'label_text' | 'description_text' | 'section_title' | 'section_description'
    defaultValue: string
    className?: string
    isTitle?: boolean
  }) => {
    const currentValue = field === 'label_text' ? getLabel(fieldKey, defaultValue) :
                        field === 'description_text' ? getDescription(fieldKey, defaultValue) :
                        field === 'section_title' ? getSectionTitle(fieldKey, defaultValue) :
                        getSectionDescription(fieldKey, defaultValue)
    
    const isEditing = editingLabel === `${fieldKey}-${field}`
    const editKey = `${fieldKey}-${field}`
    
    if (!isAdmin) {
      return isTitle ? <span className={className}>{currentValue}</span> : <p className={className}>{currentValue}</p>
    }

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 flex-1">
          {isTitle ? (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className={className}
              autoFocus
            />
          ) : (
            <Textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className={`${className} min-h-[60px]`}
              autoFocus
            />
          )}
          <Button
            size="sm"
            onClick={() => handleSaveLabel(fieldKey, field)}
            className="shrink-0"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingLabel(null)}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    }

    return (
      <div className="group flex items-start gap-2 flex-1 relative">
        <div className="flex-1">
          {isTitle ? (
            <span className={className}>{currentValue}</span>
          ) : (
            <p className={className}>{currentValue}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="absolute -right-8 top-0 h-6 w-6 p-0 invisible group-hover:visible transition-all"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setEditingLabel(editKey)
            setEditingValue(currentValue)
          }}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    )
  })

  const fetchDefaultDocuments = async () => {
    if (!canAccessPrompts) return
    
    setIsLoadingDefaultDocs(true)
    try {
      const { data, error } = await supabase
        .from('default_briefing_documents')
        .select('*')
        .eq('is_active', true)
        .eq('copy_type', mainTab) // Filtra documentos pelo tipo de copy
        .order('created_at', { ascending: false })

      if (error) throw error
      setDefaultDocuments(data || [])
    } catch (error) {
      console.error('Erro ao buscar documentos padrão:', error)
    } finally {
      setIsLoadingDefaultDocs(false)
    }
  }

  const handleSaveAsDefaultDocuments = async () => {
    if (!profile?.user_id || uploadedDocuments.length === 0) {
      toast.error("Selecione documentos para salvar como padrão")
      return
    }

    setIsLoadingDefaultDocs(true)
    try {
      // Upload dos documentos para o storage
      const uploadedPaths = await uploadDocuments()
      
      // Salvar referências na tabela de documentos padrão
      const documentsToSave = uploadedDocuments.map((file, index) => ({
        file_name: file.name,
        file_path: uploadedPaths[index],
        file_size: file.size,
        uploaded_by: profile.user_id,
        is_active: true
      }))

      const { error } = await supabase
        .from('default_briefing_documents')
        .insert(documentsToSave)

      if (error) throw error

      toast.success("Documentos salvos como padrão!")
      setUploadedDocuments([])
      fetchDefaultDocuments()
      
    } catch (error) {
      console.error('Erro ao salvar documentos padrão:', error)
      toast.error("Erro ao salvar documentos padrão")
    } finally {
      setIsLoadingDefaultDocs(false)
    }
  }

  const handleRemoveDefaultDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('default_briefing_documents')
        .update({ is_active: false })
        .eq('id', documentId)

      if (error) throw error

      toast.success("Documento removido dos padrões")
      fetchDefaultDocuments()
      
    } catch (error) {
      console.error('Erro ao remover documento padrão:', error)
      toast.error("Erro ao remover documento padrão")
    }
  }

  // Função para buscar documentos padrão para usar em briefings
  const getDefaultDocumentsForBriefing = async () => {
    try {
      const { data: defaultDocs, error } = await supabase
        .from('default_briefing_documents')
        .select('file_path')
        .eq('is_active', true)
        .eq('copy_type', mainTab) // Filtra documentos pelo tipo de copy
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const documentPaths: string[] = []
      if (defaultDocs && defaultDocs.length > 0) {
        for (const doc of defaultDocs) {
          documentPaths.push(doc.file_path)
        }
      }
      
      return documentPaths
    } catch (error) {
      console.error('Erro ao buscar documentos padrão:', error)
      return []
    }
  }

  // Funções para gerenciar prompts padrão
  const fetchDefaultPrompts = async () => {
    if (!canAccessPrompts) return
    
    setIsLoadingPrompts(true)
    try {
      const { data, error } = await supabase
        .from('default_prompts')
        .select('*')
        .eq('is_active', true)
        .eq('copy_type', mainTab) // Filtra prompts pelo tipo de copy
        .order('position', { ascending: true })

      if (error) throw error
      setDefaultPrompts(data || [])
    } catch (error) {
      console.error('Erro ao buscar prompts padrão:', error)
      toast.error('Erro ao carregar prompts')
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const handleCreatePrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) {
      toast.error("Título e conteúdo são obrigatórios")
      return
    }

    setIsLoadingPrompts(true)
    try {
      const { error } = await supabase
        .from('default_prompts')
        .insert({
          title: newPromptTitle,
          content: newPromptContent,
          created_by: profile?.user_id,
          position: defaultPrompts.length,
          copy_type: mainTab, // Define o tipo de copy para o prompt
          is_active: true
        })

      if (error) throw error

      toast.success("Prompt criado com sucesso!")
      setNewPromptTitle('')
      setNewPromptContent('')
      setShowCreatePrompt(false)
      fetchDefaultPrompts()
    } catch (error) {
      console.error('Erro ao criar prompt:', error)
      toast.error("Erro ao criar prompt")
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const handleUpdatePrompt = async (id: string, title: string, content: string) => {
    setIsLoadingPrompts(true)
    try {
      const { error } = await supabase
        .from('default_prompts')
        .update({ title, content })
        .eq('id', id)

      if (error) throw error

      toast.success("Prompt atualizado com sucesso!")
      setEditingPrompt(null)
      fetchDefaultPrompts()
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error)
      toast.error("Erro ao atualizar prompt")
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const handleDeletePrompt = async (id: string) => {
    setIsLoadingPrompts(true)
    try {
      const { error } = await supabase
        .from('default_prompts')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      toast.success("Prompt removido com sucesso!")
      fetchDefaultPrompts()
    } catch (error) {
      console.error('Erro ao remover prompt:', error)
      toast.error("Erro ao remover prompt")
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  // Função para gerar nova copy baseada em briefing existente
  // Função para exportar tabela markdown para Excel
  const exportMarkdownTableToExcel = (content: string, fileName: string) => {
    // Extrair tabelas markdown do conteúdo
    const tableRegex = /\|(.+)\|/g;
    const lines = content.split('\n');
    const tables: string[][][] = [];
    let currentTable: string[][] = [];
    let inTable = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^\|(.+)\|$/)) {
        // É uma linha de tabela
        if (trimmedLine.match(/^\|[\s\-:]+\|$/)) {
          // É uma linha separadora, ignora
          return;
        }
        
        const cells = trimmedLine
          .slice(1, -1) // Remove pipes das extremidades
          .split('|')
          .map(cell => cell.trim());
        
        currentTable.push(cells);
        inTable = true;
      } else if (inTable && currentTable.length > 0) {
        // Fim da tabela
        tables.push([...currentTable]);
        currentTable = [];
        inTable = false;
      }
    });

    // Adiciona a última tabela se existir
    if (currentTable.length > 0) {
      tables.push(currentTable);
    }

    if (tables.length === 0) {
      toast.error('Nenhuma tabela encontrada no conteúdo');
      return;
    }

    // Criar workbook
    const wb = XLSX.utils.book_new();

    tables.forEach((table, index) => {
      if (table.length === 0) return;
      
      // Criar worksheet
      const ws = XLSX.utils.aoa_to_sheet(table);
      
      // Aplicar formatação às células de cabeçalho (primeira linha)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        
        // Aplicar estilo de cabeçalho
        ws[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E2E8F0" } },
          border: {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
          }
        };
      }

      // Aplicar bordas a todas as células
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          if (!ws[cellAddress].s) ws[cellAddress].s = {};
          ws[cellAddress].s.border = {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
          };
        }
      }

      // Definir largura das colunas
      const colWidths = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10;
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress] && ws[cellAddress].v) {
            const cellLength = String(ws[cellAddress].v).length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
      }
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      const sheetName = tables.length > 1 ? `Tabela ${index + 1}` : 'Tabela';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Salvar arquivo
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success('Tabela exportada para Excel com sucesso!');
  };

  const handleGenerateNewCopy = async () => {
    if (!selectedBriefingForNewCopy || !newCopyContext.trim()) {
      toast.error("Contexto é obrigatório para gerar nova copy")
      return
    }

    setIsGeneratingNewCopy(true)
    try {
      // Buscar briefing completo do banco de dados
      const { data: fullBriefing, error: fetchError } = await supabase
        .from('copy_forms')
        .select('*')
        .eq('id', selectedBriefingForNewCopy.id)
        .single()

      if (fetchError) throw fetchError

      // Chamar a Edge Function para gerar a nova copy com o briefing ORIGINAL
      const { data: copyResponse, error: copyError } = await supabase
        .functions
        .invoke('generate-copy-ai', {
          body: { 
            copyFormId: selectedBriefingForNewCopy.id, // Usar ID do briefing original
            newCopyContext: newCopyContext, // Passar contexto para a edge function
            appendToExisting: true // Flag para indicar que deve concatenar
          }
        })

      if (copyError) {
        console.error('❌ Erro na edge function:', copyError)
        throw copyError
      }

      toast.success("Nova versão da copy criada com sucesso!")
      setShowNewCopyModal(false)
      setNewCopyContext('')
      setSelectedBriefingForNewCopy(null)
      fetchBriefingHistory()
    } catch (error) {
      console.error('Erro ao gerar nova copy:', error)
      toast.error("Erro ao gerar nova copy")
    } finally {
      setIsGeneratingNewCopy(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setUploadedDocuments(files)
      toast.success(`${files.length} documento(s) selecionado(s)`)
    }
  }

  if (currentView === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <DotLogo size={56} animate />
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg font-medium">Gerando copy com IA...</p>
        <p className="text-sm text-muted-foreground">Isso pode levar alguns minutos</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Gerador de Copy</h1>
            <p className="text-muted-foreground">
              Preencha as informações do briefing para gerar copies personalizadas
            </p>
          </div>
        </div>
        
        {/* Menu principal - Onboarding/Ongoing */}
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setMainTab('onboarding')}
            className={cn(
              mainTab === 'onboarding' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            Onboarding
          </Button>
          <Button 
            variant="outline"
            onClick={() => setMainTab('ongoing')}
            className={cn(
              mainTab === 'ongoing' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            Ongoing
          </Button>
        </div>
      </div>

      {/* Conteúdo - as mesmas tabs servem tanto para Onboarding quanto Ongoing */}
      {/* Os dados são filtrados automaticamente baseado no mainTab selecionado */}
      <Tabs defaultValue="form" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* Lado esquerdo - Tabs */}
          <TabsList>
            <TabsTrigger value="form" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Formulário
            </TabsTrigger>
            
            {canViewHistory && (
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Resultados
              </TabsTrigger>
            )}
            
            {canAccessPrompts && (
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Prompts
              </TabsTrigger>
            )}
          </TabsList>

          {/* Lado direito - Seletor de Cliente e Materiais */}
          <div className="flex items-center gap-6">
            {/* Seletor de Cliente - sempre visível */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Cliente:</span>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {crmClients.map((client) => (
                    <SelectItem key={client.id} value={client.company_name}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Container para Materiais - largura fixa para evitar movimento */}
            <div className="flex items-center gap-3" style={{ width: '500px' }}>
              {mainTab === 'ongoing' && (
                <>
                  <span className="text-sm font-medium whitespace-nowrap">Materiais:</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setMaterialType('criativos')}
                      className={cn(
                        'whitespace-nowrap',
                        materialType === 'criativos' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      )}
                    >
                      Criativos Estáticos
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setMaterialType('roteiros')}
                      className={cn(
                        'whitespace-nowrap',
                        materialType === 'roteiros' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      )}
                    >
                      Roteiros de Video
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setMaterialType('landing')}
                      className={cn(
                        'whitespace-nowrap',
                        materialType === 'landing' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      )}
                    >
                      Landing Page
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="form" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Seção 1: Reuniões */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Mic className="h-5 w-5" />
                        <EditableText 
                          fieldKey="section_meetings" 
                          field="section_title" 
                          defaultValue="Reuniões"
                          isTitle
                        />
                      </CardTitle>
                      <CardDescription className="text-muted-foreground/70 flex items-start gap-2">
                        <EditableText 
                          fieldKey="section_meetings" 
                          field="section_description" 
                          defaultValue="Transcrições das reuniões realizadas com o cliente. Copie e cole a transcrição da IA que grava as nossas calls."
                          className="text-muted-foreground/70"
                        />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    {mainTab === 'onboarding' ? (
                      <>
                        <FormField
                          control={form.control}
                          name="reuniao_boas_vindas"
                          render={({ field }) => {
                            const isDefault = isDefaultValue('reuniao_boas_vindas', field.value || '')
                            return (
                              <FormItem>
                                <FormLabel className="font-semibold flex items-center gap-2">
                                  <EditableText 
                                    fieldKey="reuniao_boas_vindas" 
                                    field="label_text" 
                                    defaultValue="Reunião de Boas-Vindas"
                                    isTitle
                                  />
                                </FormLabel>
                                <EditableText 
                                  fieldKey="reuniao_boas_vindas" 
                                  field="description_text" 
                                  defaultValue="Cole a transcrição ou link da gravação da primeira call."
                                  className="text-sm text-muted-foreground/70 mb-2"
                                />
                                <FormControl>
                                  <Textarea 
                                    className={cn(
                                      "min-h-[120px] resize-y",
                                      isDefault && "opacity-50",
                                      isDefault && !isFieldModified('reuniao_boas_vindas') && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setModifiedFields(prev => new Set(prev).add('reuniao_boas_vindas'))
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="reuniao_kick_off"
                          render={({ field }) => {
                            const isDefault = isDefaultValue('reuniao_kick_off', field.value || '')
                            return (
                              <FormItem>
                                <FormLabel className="font-semibold flex items-center gap-2">
                                  <EditableText 
                                    fieldKey="reuniao_kick_off" 
                                    field="label_text" 
                                    defaultValue="Reunião de Kick-Off"
                                    isTitle
                                  />
                                </FormLabel>
                                <EditableText 
                                  fieldKey="reuniao_kick_off" 
                                  field="description_text" 
                                  defaultValue="Cole a transcrição ou link da reunião de kickoff."
                                  className="text-sm text-muted-foreground/70 mb-2"
                                />
                                <FormControl>
                                  <Textarea 
                                    className={cn(
                                      "min-h-[120px] resize-y",
                                      isDefault && "opacity-50",
                                      isDefault && !isFieldModified('reuniao_kick_off') && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setModifiedFields(prev => new Set(prev).add('reuniao_kick_off'))
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="reuniao_brainstorm"
                          render={({ field }) => {
                            const isDefault = isDefaultValue('reuniao_brainstorm', field.value || '')
                            return (
                              <FormItem>
                                <FormLabel className="font-semibold flex items-center gap-2">
                                  <EditableText 
                                    fieldKey="reuniao_brainstorm" 
                                    field="label_text" 
                                    defaultValue="Reunião de Brainstorm"
                                    isTitle
                                  />
                                </FormLabel>
                                <EditableText 
                                  fieldKey="reuniao_brainstorm" 
                                  field="description_text" 
                                  defaultValue="Cole a transcrição ou link da call de Brainstorm."
                                  className="text-sm text-muted-foreground/70 mb-2"
                                />
                                <FormControl>
                                  <Textarea 
                                    className={cn(
                                      "min-h-[120px] resize-y",
                                      isDefault && "opacity-50",
                                      isDefault && !isFieldModified('reuniao_brainstorm') && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setModifiedFields(prev => new Set(prev).add('reuniao_brainstorm'))
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />
                        
                        {/* Estrutura da Landing Page dentro da primeira coluna */}
                        <div className="pt-6 mt-6 border-t">
                          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <EditableText 
                              fieldKey="section_structure" 
                              field="section_title" 
                              defaultValue="Estrutura da Landing Page"
                              isTitle
                            />
                          </h3>
                          <EditableText 
                            fieldKey="section_structure" 
                            field="section_description" 
                            defaultValue="Tamanho da LP"
                            className="text-sm text-muted-foreground/70 mb-4"
                          />
                        
                          <FormField
                            control={form.control}
                            name="tamanho_lp"
                            render={({ field }) => {
                              const isDefault = !field.value || field.value === ''
                              return (
                                <FormItem>
                                  <FormLabel className="font-semibold flex items-center gap-2">
                                    <EditableText 
                                      fieldKey="tamanho_lp" 
                                      field="label_text" 
                                      defaultValue="Defina o tamanho da página de vendas (seleção única)"
                                      isTitle
                                    />
                                  </FormLabel>
                                  <FormControl>
                                    <select 
                                      className={cn(
                                        "w-full border border-input rounded-md px-3 py-2 bg-background text-foreground",
                                        isDefault && "border-destructive focus-visible:ring-destructive"
                                      )}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e)
                                        setModifiedFields(prev => new Set(prev).add('tamanho_lp'))
                                      }}
                                      value={field.value || ''}
                                    >
                                      <option value="">Selecione o tamanho</option>
                                      <option value="Objetiva">Objetiva</option>
                                      <option value="Média">Média</option>
                                      <option value="Extensa">Extensa</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Campos para Ongoing */}
                        <FormField
                          control={form.control}
                          name="reuniao_boas_vindas"
                          render={({ field }) => {
                            const isDefault = isDefaultValue('reuniao_boas_vindas', field.value || '')
                            return (
                              <FormItem>
                                <FormLabel className="font-semibold flex items-center gap-2">
                                  Reunião de Check-in
                                </FormLabel>
                                <p className="text-sm text-muted-foreground/70 mb-2">
                                  Cole a transcrição ou link da gravação da call (caso seja pertinente)
                                </p>
                                <FormControl>
                                  <Textarea 
                                    className={cn(
                                      "min-h-[120px] resize-y",
                                      isDefault && "opacity-50",
                                      isDefault && !isFieldModified('reuniao_boas_vindas') && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setModifiedFields(prev => new Set(prev).add('reuniao_boas_vindas'))
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="informacao_extra"
                          render={({ field }) => {
                            const isDefault = isDefaultValue('informacao_extra', field.value || '')
                            return (
                              <FormItem>
                                <FormLabel className="font-semibold flex items-center gap-2">
                                  Informações adicionais
                                </FormLabel>
                                <p className="text-sm text-muted-foreground/70 mb-2">
                                  Descreva os motivos e orientações para as novas copies
                                </p>
                                <FormControl>
                                  <Textarea 
                                    className={cn(
                                      "min-h-[120px] resize-y",
                                      isDefault && "opacity-50",
                                      isDefault && !isFieldModified('informacao_extra') && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setModifiedFields(prev => new Set(prev).add('informacao_extra'))
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />

                        {/* Estrutura da Landing Page - apenas para materialType === 'landing' */}
                        {materialType === 'landing' && (
                          <div className="pt-6 mt-6 border-t">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                              Estrutura da Landing Page
                            </h3>
                            <p className="text-sm text-muted-foreground/70 mb-4">
                              Tamanho da LP
                            </p>
                          
                            <FormField
                              control={form.control}
                              name="tamanho_lp"
                              render={({ field }) => {
                                const isDefault = !field.value || field.value === ''
                                return (
                                  <FormItem>
                                    <FormLabel className="font-semibold flex items-center gap-2">
                                      Defina o tamanho da página de vendas (seleção única)
                                    </FormLabel>
                                    <FormControl>
                                      <select 
                                        className={cn(
                                          "w-full border border-input rounded-md px-3 py-2 bg-background text-foreground",
                                          isDefault && "border-destructive focus-visible:ring-destructive"
                                        )}
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e)
                                          setModifiedFields(prev => new Set(prev).add('tamanho_lp'))
                                        }}
                                        value={field.value || ''}
                                      >
                                        <option value="">Selecione o tamanho</option>
                                        <option value="Objetiva">Objetiva</option>
                                        <option value="Média">Média</option>
                                        <option value="Extensa">Extensa</option>
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                    </CardContent>
                  </Card>

                </div>

                {/* Seção 2: Empresa & Oferta */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <EditableText 
                        fieldKey="section_company" 
                        field="section_title" 
                        defaultValue="Empresa & Oferta"
                        isTitle
                      />
                    </CardTitle>
                    <CardDescription className="text-muted-foreground/70 flex items-start gap-2">
                      <EditableText 
                        fieldKey="section_company" 
                        field="section_description" 
                        defaultValue="Dados do negócio e do que é vendido (produto ou serviço)."
                        className="text-muted-foreground/70"
                      />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="nome_empresa"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('nome_empresa', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="nome_empresa" 
                                field="label_text" 
                                defaultValue="Nome da empresa"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="nome_empresa" 
                              field="description_text" 
                              defaultValue="Informe o nome da empresa."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Input 
                                className={cn(
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('nome_empresa') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('nome_empresa'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="nicho_empresa"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('nicho_empresa', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="nicho_empresa" 
                                field="label_text" 
                                defaultValue="Nicho da empresa"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="nicho_empresa" 
                              field="description_text" 
                              defaultValue="Informe o nicho da empresa."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Input 
                                className={cn(
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('nicho_empresa') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('nicho_empresa'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="site"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('site', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="site" 
                                field="label_text" 
                                defaultValue="Site"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="site" 
                              field="description_text" 
                              defaultValue="Insira a URL principal do site do cliente"
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Input 
                                className={cn(
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('site') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('site'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="servicos_produtos"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('servicos_produtos', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="servicos_produtos" 
                                field="label_text" 
                                defaultValue="Produtos/Serviços"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="servicos_produtos" 
                              field="description_text" 
                              defaultValue="Descreva os principais produtos/serviços."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('servicos_produtos') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('servicos_produtos'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="investimento_medio"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('investimento_medio', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="investimento_medio" 
                                field="label_text" 
                                defaultValue="Planos/Preços/Ticket"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="investimento_medio" 
                              field="description_text" 
                              defaultValue="Liste pacotes/planos com respectivos preços e periodicidade."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('investimento_medio') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('investimento_medio'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="informacao_extra"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('informacao_extra', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="informacao_extra" 
                                field="label_text" 
                                defaultValue="Garantias/Bônus"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="informacao_extra" 
                              field="description_text" 
                              defaultValue="Indique garantias, testes, brindes, contrato mínimo ou políticas especiais caso tenha."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('informacao_extra') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('informacao_extra'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="diferencial_competitivo"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('diferencial_competitivo', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="diferencial_competitivo" 
                                field="label_text" 
                                defaultValue="Diferenciais competitivos"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="diferencial_competitivo" 
                              field="description_text" 
                              defaultValue="Explique por que escolhem a empresa."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('diferencial_competitivo') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('diferencial_competitivo'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Seção 3: Público, Jornada & Mídia */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <EditableText 
                        fieldKey="section_audience" 
                        field="section_title" 
                        defaultValue="Público, Jornada & Mídia"
                        isTitle
                      />
                    </CardTitle>
                    <CardDescription className="text-muted-foreground/70 flex items-start gap-2">
                      <EditableText 
                        fieldKey="section_audience" 
                        field="section_description" 
                        defaultValue="Dados do público, jornada de compra e canais de mídia."
                        className="text-muted-foreground/70"
                      />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="publico_alvo"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('publico_alvo', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="publico_alvo" 
                                field="label_text" 
                                defaultValue="Público-alvo"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="publico_alvo" 
                              field="description_text" 
                              defaultValue="Descreva seu público-alvo. Lembre-se que isso ajuda a qualificar o lead e criar copys que qualifiquem mais seu público."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('publico_alvo') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('publico_alvo'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="avatar_principal"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('avatar_principal', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="avatar_principal" 
                                field="label_text" 
                                defaultValue="Persona"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="avatar_principal" 
                              field="description_text" 
                              defaultValue="Descreva 1 perfil típico, com nome fictício, papel, meta principal, maior medo e canal onde consome.

EX: Empresário que tem conta de luz de R$ 1.000 reais, fica na mão da empresa distribuidora de energia aumentar ou não os preços e ao invés de investir em algo que reduz custos, está gastando em conta de energia que nunca volta para o bolso dele."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[120px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('avatar_principal') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('avatar_principal'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="principal_inimigo"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('principal_inimigo', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="principal_inimigo" 
                                field="label_text" 
                                defaultValue="Dores/Problemas"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="principal_inimigo" 
                              field="description_text" 
                              defaultValue="Liste 3-5 principais dores atuais que a oferta resolve.

EX: Redução de custos, previsão de gasto mensal, trocar um custo por um investimento que retorna ao longo prazo."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('principal_inimigo') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('principal_inimigo'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="maior_objecao"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('maior_objecao', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="maior_objecao" 
                                field="label_text" 
                                defaultValue="Objeções"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="maior_objecao" 
                              field="description_text" 
                              defaultValue="Aponte 2-4 barreiras na hora de comprar."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('maior_objecao') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('maior_objecao'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="pergunta_qualificatoria"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('pergunta_qualificatoria', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="pergunta_qualificatoria" 
                                field="label_text" 
                                defaultValue="Gatilho de qualificação de público"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="pergunta_qualificatoria" 
                              field="description_text" 
                              defaultValue="Gatilho inicial para qualificar o lead, aqui você precisa de uma frase curta para colocar no início dos roteiros e criativos e qualificar o lead."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Input 
                                className={cn(
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('pergunta_qualificatoria') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('pergunta_qualificatoria'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Campo "Crenças/Mitos" foi removido pois duplicava informacao_extra */}

                    <FormField
                      control={form.control}
                      name="momento_jornada"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('momento_jornada', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="momento_jornada" 
                                field="label_text" 
                                defaultValue="Estágio da Jornada (seleção única)"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="momento_jornada" 
                              field="description_text" 
                              defaultValue="Qual o nível médio de consciência do público:"
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <select 
                                className={cn(
                                  "w-full border border-input rounded-md px-3 py-2 bg-background text-foreground",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('momento_jornada') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('momento_jornada'))
                                }}
                              >
                                <option value="Desconhece problema">Desconhece problema</option>
                                <option value="Conhece problema">Conhece problema</option>
                                <option value="Conhece solução">Conhece solução</option>
                                <option value="Conhece produto">Conhece produto</option>
                                <option value="Pronto para comprar">Pronto para comprar</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="cases_impressionantes"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('cases_impressionantes', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="cases_impressionantes" 
                                field="label_text" 
                                defaultValue="Cases de Sucesso"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="cases_impressionantes" 
                              field="description_text" 
                              defaultValue="Descreva resultados importantes que esse cliente já obteve com seus serviços ou produtos.

EX: Uma indústria que atendemos reduziu a conta de luz de R$2.500 para apenas R$750."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[100px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('cases_impressionantes') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('cases_impressionantes'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="numeros_certificados"
                      render={({ field }) => {
                        const isDefault = isDefaultValue('numeros_certificados', field.value || '')
                        return (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <EditableText 
                                fieldKey="numeros_certificados" 
                                field="label_text" 
                                defaultValue="Certificações/Números relevantes ou empresas que confiam na gente"
                                isTitle
                              />
                            </FormLabel>
                            <EditableText 
                              fieldKey="numeros_certificados" 
                              field="description_text" 
                              defaultValue="Registre certificações, selos, indicadores e reconhecimentos úteis.

EX: Mais de 1.000 projetos de placas solares instalados em todo o Rio Grande do Sul. Uma das maiores empresas do estado."
                              className="text-sm text-muted-foreground/70 mb-2"
                            />
                            <FormControl>
                              <Textarea 
                                className={cn(
                                  "min-h-[120px] resize-y",
                                  isDefault && "opacity-50",
                                  isDefault && !isFieldModified('numeros_certificados') && "border-destructive focus-visible:ring-destructive"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  setModifiedFields(prev => new Set(prev).add('numeros_certificados'))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Salvar Briefing
                </Button>
                {onBack && (
                  <Button type="button" variant="outline" onClick={onBack}>
                    Voltar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Aba de Histórico */}
        {canViewHistory && (
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Histórico de Briefings</CardTitle>
                    <CardDescription>
                      Visualize todos os briefings salvos e suas respectivas copies geradas
                    </CardDescription>
                  </div>
                  <Button onClick={fetchBriefingHistory} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filtrar por Cliente</label>
                    <Input
                      placeholder="Nome do cliente..."
                      value={clientNameFilter}
                      onChange={(e) => setClientNameFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium mb-2 block">Filtrar por Data</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filtrar por Criador</label>
                    <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar criador..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os criadores</SelectItem>
                        {uniqueCreators.map((creator) => (
                          <SelectItem key={creator} value={creator}>
                            {creator}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredBriefingHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{briefingHistory.length === 0 ? 'Nenhum briefing encontrado' : 'Nenhum resultado encontrado para os filtros aplicados'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criado por</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory.map((briefing) => (
                          <TableRow key={briefing.id}>
                            <TableCell className="font-medium">
                              {briefing.nome_empresa || 'Sem nome'}
                            </TableCell>
                            <TableCell>
                              {new Date(briefing.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                             <TableCell>
                                <Badge variant={
                                  briefing.status === 'completed' ? 'default' : 
                                  briefing.status === 'processing' ? 'secondary' : 'destructive'
                                } className={
                                  briefing.status === 'completed' ? 'bg-green-500 text-white border-green-500' : ''
                                }>
                                  {briefing.status === 'completed' ? 'Concluído' : 
                                   briefing.status === 'processing' ? 'Processando' : 'Erro'}
                                </Badge>
                             </TableCell>
                            <TableCell>
                              {briefing.profiles?.name || 'Usuário desconhecido'}
                            </TableCell>
                              <TableCell>
                               <div className="flex items-center gap-2">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => setViewingCopy(briefing)}
                                   title="Ver resultado da IA"
                                 >
                                   <Eye className="h-4 w-4" />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={async () => {
                                     // Buscar dados completos do briefing
                                     const { data, error } = await supabase
                                       .from('copy_forms')
                                       .select('*')
                                       .eq('id', briefing.id)
                                       .single()
                                     
                                     if (!error && data) {
                                       setViewingBriefing(data)
                                     } else {
                                       toast.error('Erro ao carregar briefing')
                                     }
                                   }}
                                   title="Ver respostas do briefing"
                                 >
                                   <FileText className="h-4 w-4" />
                                 </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBriefingForNewCopy(briefing)
                                      setShowNewCopyModal(true)
                                    }}
                                    disabled={briefing.status !== 'completed'}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Nova versão de copy
                                  </Button>
                                 {canDeleteCopies && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Copy</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta ação não pode ser desfeita. Isso excluirá permanentemente a copy.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteCopy(briefing.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNumber: number;
                              if (totalPages <= 5) {
                                pageNumber = i + 1;
                              } else if (currentPage <= 3) {
                                pageNumber = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNumber = totalPages - 4 + i;
                              } else {
                                pageNumber = currentPage - 2 + i;
                              }
                              
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(pageNumber)}
                                    isActive={currentPage === pageNumber}
                                    className="cursor-pointer"
                                  >
                                    {pageNumber}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Aba de Prompts Padrão */}
        {canAccessPrompts && (
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Prompts Padrão</CardTitle>
                    <CardDescription>
                      Gerencie os prompts padrão usados na geração de copies
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowCreatePrompt(!showCreatePrompt)} 
                      variant="default" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar novo prompt
                    </Button>
                    <Button onClick={fetchDefaultPrompts} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Criar novo prompt - conditional display */}
                {showCreatePrompt && (
                  <div className="p-4 border border-dashed rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Criar Novo Prompt</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreatePrompt(false)
                          setNewPromptTitle('')
                          setNewPromptContent('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      <Input
                        placeholder="Título do prompt"
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Conteúdo do prompt"
                        value={newPromptContent}
                        onChange={(e) => setNewPromptContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button 
                        onClick={handleCreatePrompt} 
                        disabled={isLoadingPrompts}
                        size="sm"
                      >
                        {isLoadingPrompts ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Prompt
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de prompts */}
                {isLoadingPrompts ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
                    <p className="text-muted-foreground">Carregando prompts...</p>
                  </div>
                ) : defaultPrompts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum prompt encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {defaultPrompts.map((prompt) => (
                      <Card key={prompt.id}>
                         <CardHeader className="pb-3">
                           <div className="flex items-center justify-between">
                             <button
                               type="button"
                               onClick={() => {
                                 const newCollapsed = new Set(collapsedPrompts)
                                 if (collapsedPrompts.has(prompt.id)) {
                                   newCollapsed.delete(prompt.id)
                                 } else {
                                   newCollapsed.add(prompt.id)
                                 }
                                 setCollapsedPrompts(newCollapsed)
                               }}
                               className="flex-1 text-left"
                             >
                               <CardTitle className="text-base hover:text-primary transition-colors">
                                 {prompt.title}
                               </CardTitle>
                             </button>
                             <div className="flex gap-2">
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => {
                                   const newCollapsed = new Set(collapsedPrompts)
                                   if (collapsedPrompts.has(prompt.id)) {
                                     newCollapsed.delete(prompt.id)
                                   } else {
                                     newCollapsed.add(prompt.id)
                                   }
                                   setCollapsedPrompts(newCollapsed)
                                 }}
                               >
                                 <Eye className="h-4 w-4" />
                               </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPrompt(prompt)
                                    setNewPromptTitle(prompt.title)
                                    setNewPromptContent(prompt.content)
                                  }}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button size="sm" variant="outline">
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Remover Prompt</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Esta ação não pode ser desfeita. O prompt será removido.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={() => handleDeletePrompt(prompt.id)}
                                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                     >
                                       Remover
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </div>
                         </CardHeader>
                          {!collapsedPrompts.has(prompt.id) && (
                            <CardContent>
                              <div className="text-sm text-muted-foreground prose prose-sm max-w-none prose-table:border prose-table:border-border prose-th:border prose-th:border-border prose-th:bg-muted prose-td:border prose-td:border-border">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {prompt.content}
                                </ReactMarkdown>
                              </div>
                            </CardContent>
                          )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog para visualizar copy */}
      <Dialog open={!!viewingCopy} onOpenChange={() => setViewingCopy(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Copy - {viewingCopy?.nome_empresa || 'Sem nome'}
            </DialogTitle>
          </DialogHeader>
          {viewingCopy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={`ml-2 ${
                    viewingCopy.status === 'completed' ? 'bg-green-500 text-white border-green-500' : ''
                  }`} variant={
                    viewingCopy.status === 'completed' ? 'default' : 
                    viewingCopy.status === 'processing' ? 'secondary' : 'destructive'
                  }>
                    {viewingCopy.status === 'completed' ? 'Concluído' : 
                     viewingCopy.status === 'processing' ? 'Processando' : 'Erro'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Criado em:</span>
                  <span className="ml-2">{new Date(viewingCopy.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>
              
              {viewingCopy.ai_response && (
                <div>
                  <div className="space-y-4">
                    {(() => {
                      const copies = viewingCopy.ai_response.split('\n\n=== NOVA COPY ===\n\n');
                      return copies.map((copyContent, index) => {
                        const isExpanded = expandedCopies.has(index);
                        const toggleExpanded = () => {
                          const newExpanded = new Set(expandedCopies);
                          if (isExpanded) {
                            newExpanded.delete(index);
                          } else {
                            newExpanded.add(index);
                          }
                          setExpandedCopies(newExpanded);
                        };
                        
                        // Extract date from the copy content or use the briefing creation date
                        const copyDate = index === 0 
                          ? new Date(viewingCopy.created_at) 
                          : new Date(viewingCopy.response_generated_at || viewingCopy.created_at);
                        
                        const formattedDate = copyDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric'
                        }) + ', ' + copyDate.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={index} className="border rounded-lg">
                            <button
                              onClick={toggleExpanded}
                              className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium text-sm">
                                Copy versão {index + 1} - Criado em {formattedDate}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(copyContent);
                                    toast.success(`Copy versão ${index + 1} copiada para a área de transferência!`);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportMarkdownTableToExcel(copyContent, `copy-${viewingCopy?.nome_empresa?.replace(/[^a-zA-Z0-9]/g, '-') || 'sem-nome'}-v${index + 1}`);
                                  }}
                                >
                                  <FileSpreadsheet className="h-3 w-3" />
                                </Button>
                                <Eye className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t bg-muted/20 p-4 text-sm prose prose-sm max-w-none prose-table:border prose-table:border-border prose-th:border prose-th:border-border prose-th:bg-muted prose-td:border prose-td:border-border">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {copyContent.trim()}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar prompt */}
      <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
        <DialogContent className="max-w-screen-2xl max-h-screen h-screen w-screen m-0 rounded-none overflow-hidden p-6">
          <div className="flex flex-col h-full space-y-3">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg">Editar Prompt</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Título do prompt"
              value={newPromptTitle}
              onChange={(e) => setNewPromptTitle(e.target.value)}
              className="shrink-0"
            />
            <Textarea
              placeholder="Conteúdo do prompt"
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              className="flex-1 min-h-0 resize-none"
            />
            <div className="flex gap-2 justify-end shrink-0 pt-2">
              <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleUpdatePrompt(editingPrompt.id, newPromptTitle, newPromptContent)}
                disabled={isLoadingPrompts}
              >
                {isLoadingPrompts ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para gerar nova copy */}
      <Dialog open={showNewCopyModal} onOpenChange={setShowNewCopyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova versão de copy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Contexto para nova copy (obrigatório)
              </label>
              <Textarea
                placeholder="Descreva o motivo pelo qual você está solicitando uma nova copy..."
                value={newCopyContext}
                onChange={(e) => setNewCopyContext(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewCopyModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateNewCopy}
                disabled={isGeneratingNewCopy || !newCopyContext.trim()}
              >
                {isGeneratingNewCopy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Nova versão de copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar respostas do briefing */}
      <Dialog open={!!viewingBriefing} onOpenChange={() => {
        setViewingBriefing(null)
        setExpandedMeetings(new Set())
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Respostas do Briefing - {viewingBriefing?.nome_empresa || 'Sem nome'}
            </DialogTitle>
          </DialogHeader>
          {viewingBriefing && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b">
                <div>
                  <span className="font-medium">Criado em:</span>
                  <span className="ml-2">{new Date(viewingBriefing.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className="ml-2" variant={
                    viewingBriefing.status === 'completed' ? 'default' : 
                    viewingBriefing.status === 'processing' ? 'secondary' : 'destructive'
                  }>
                    {viewingBriefing.status === 'completed' ? 'Concluído' : 
                     viewingBriefing.status === 'processing' ? 'Processando' : 'Erro'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Reunião de Boas-Vindas</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSet = new Set(expandedMeetings)
                        if (expandedMeetings.has('boas_vindas')) {
                          newSet.delete('boas_vindas')
                        } else {
                          newSet.add('boas_vindas')
                        }
                        setExpandedMeetings(newSet)
                      }}
                    >
                      {expandedMeetings.has('boas_vindas') ? 'Ocultar' : 'Ver resposta'}
                    </Button>
                  </div>
                  {expandedMeetings.has('boas_vindas') && (
                    <p className="text-sm whitespace-pre-wrap">{viewingBriefing.reuniao_boas_vindas || 'Não informado'}</p>
                  )}
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Reunião de Kick-Off</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSet = new Set(expandedMeetings)
                        if (expandedMeetings.has('kick_off')) {
                          newSet.delete('kick_off')
                        } else {
                          newSet.add('kick_off')
                        }
                        setExpandedMeetings(newSet)
                      }}
                    >
                      {expandedMeetings.has('kick_off') ? 'Ocultar' : 'Ver resposta'}
                    </Button>
                  </div>
                  {expandedMeetings.has('kick_off') && (
                    <p className="text-sm whitespace-pre-wrap">{viewingBriefing.reuniao_kick_off || 'Não informado'}</p>
                  )}
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Reunião de Brainstorm</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSet = new Set(expandedMeetings)
                        if (expandedMeetings.has('brainstorm')) {
                          newSet.delete('brainstorm')
                        } else {
                          newSet.add('brainstorm')
                        }
                        setExpandedMeetings(newSet)
                      }}
                    >
                      {expandedMeetings.has('brainstorm') ? 'Ocultar' : 'Ver resposta'}
                    </Button>
                  </div>
                  {expandedMeetings.has('brainstorm') && (
                    <p className="text-sm whitespace-pre-wrap">{viewingBriefing.reuniao_brainstorm || 'Não informado'}</p>
                  )}
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Nome da Empresa</h3>
                  <p className="text-sm">{viewingBriefing.nome_empresa || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Nicho da Empresa</h3>
                  <p className="text-sm">{viewingBriefing.nicho_empresa || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Produtos/Serviços</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.servicos_produtos || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Diferencial Competitivo</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.diferencial_competitivo || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Público Alvo</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.publico_alvo || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Dores/Problemas</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.principal_inimigo || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Avatar Principal</h3>
                  <p className="text-sm">{viewingBriefing.avatar_principal || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Estágio da Jornada</h3>
                  <p className="text-sm">{viewingBriefing.momento_jornada || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Maior Objeção</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.maior_objecao || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Pergunta Qualificatória</h3>
                  <p className="text-sm">{viewingBriefing.pergunta_qualificatoria || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Cases de Sucesso</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.cases_impressionantes || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Certificações/Números Relevantes</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.numeros_certificados || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Investimento Médio</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.investimento_medio || 'Não informado'}</p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-sm">Informações Extra</h3>
                  <p className="text-sm whitespace-pre-wrap">{viewingBriefing.informacao_extra || 'Não informado'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
