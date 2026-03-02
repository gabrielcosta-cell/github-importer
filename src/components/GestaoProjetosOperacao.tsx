import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EditableCell } from './EditableCell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Download, Copy, Trash2, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Projeto {
  id: string
  nome: string
  squad: string
  plano: string
  tipoProprietario: string
  status: 'Ativo' | 'churn' | 'aviso previo' | 'possivel churn' | 'inativo' | 'Pré churn'
  metaVendas: string
  budgetMensal: string
  budgetSemanal: string
  rotinasAcompanhamento: string
}


export const GestaoProjetosOperacao = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [squadFilter, setSquadFilter] = useState<string>('all')
  const [planoFilter, setPlanoFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProjetos, setSelectedProjetos] = useState<Set<string>>(new Set())
  const [undoStack, setUndoStack] = useState<{projetos: Projeto[], action: string}[]>([])
  const [squads, setSquads] = useState<Array<{ id: string; name: string; color: string }>>([])
  const { toast } = useToast()

  const [newProjeto, setNewProjeto] = useState<Omit<Projeto, 'id'>>({
    nome: '',
    squad: '',
    plano: '',
    tipoProprietario: '',
    status: 'Ativo',
    metaVendas: '',
    budgetMensal: '',
    budgetSemanal: '',
    rotinasAcompanhamento: ''
  })

  // Carregar squads do Supabase
  useEffect(() => {
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

  // Carregar projetos/clientes do Supabase (csm_cards)
  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('csm_cards')
          .select('id, title, company_name, squad, plano, categoria, churn, monthly_revenue')
          .eq('pipeline_id', '749ccdc2-5127-41a1-997b-3dcb47979555')
          .order('title', { ascending: true });

        if (error) throw error;

        const mapped: Projeto[] = (data || []).map(card => ({
          id: card.id,
          nome: card.company_name || card.title || '',
          squad: card.squad || '',
          plano: card.plano || '',
          tipoProprietario: '',
          status: card.churn ? 'churn' as const : 'Ativo' as const,
          metaVendas: '',
          budgetMensal: '',
          budgetSemanal: '',
          rotinasAcompanhamento: ''
        }));

        setProjetos(mapped);
      } catch (error) {
        console.error('Erro ao carregar projetos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjetos();
  }, []);

  const filteredProjetos = projetos.filter(projeto => {
    const matchesSearch = projeto.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSquad = !squadFilter || squadFilter === 'all' || projeto.squad === squadFilter
    const matchesPlano = !planoFilter || planoFilter === 'all' || projeto.plano === planoFilter
    const matchesStatus = !statusFilter || statusFilter === 'all' || projeto.status === statusFilter
    
    // Ocultar projetos com status "churn" da lista de clientes ativos
    const notChurn = projeto.status !== 'churn'
    
    return matchesSearch && matchesSquad && matchesPlano && matchesStatus && notChurn
  })

  const saveToUndoStack = (action: string) => {
    setUndoStack(prev => [...prev.slice(-9), { projetos: [...projetos], action }])
  }

  const updateProjeto = (id: string, field: keyof Projeto, value: string) => {
    saveToUndoStack("Atualização de projeto")
    
    setProjetos(prev => prev.map(projeto => 
      projeto.id === id ? { ...projeto, [field]: value } : projeto
    ))
    toast({
      title: "Projeto atualizado",
      description: "As alterações foram salvas com sucesso.",
    })
  }

  const removeProjeto = (id: string) => {
    saveToUndoStack("Exclusão de projeto")
    
    setProjetos(prev => prev.filter(projeto => projeto.id !== id))
    setSelectedProjetos(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    toast({
      title: "Projeto removido",
      description: "O projeto foi removido com sucesso. Pressione Ctrl+Z para desfazer.",
      variant: "destructive"
    })
  }

  const undo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1]
      setProjetos(lastState.projetos)
      setUndoStack(prev => prev.slice(0, -1))
      toast({
        title: "Ação desfeita",
        description: `${lastState.action} foi desfeita com sucesso.`,
      })
    }
  }

  // Handle Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault()
        undo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undoStack])

  // Helper function to display empty cells as "-"
  const displayValue = (value: string) => {
    return value && value.trim() !== '' && value !== '0' ? value : '-'
  }

  // Helper function to render text with clickable links
  const renderTextWithLinks = (text: string) => {
    if (!text || text === '-') return text
    
    const urlRegex = /(https?:\/\/[^\s,)]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  // Nova função simples para budget mensal - SEM COMPLICAÇÃO!
  const handleBudgetMensalSave = (id: string, value: string | number) => {
    saveToUndoStack("Atualização de budget mensal")
    
    let finalValue = '';
    const stringValue = String(value).trim();
    
    // Se está vazio ou é "-", salva como vazio
    if (!stringValue || stringValue === '-') {
      finalValue = '';
    } else {
      // Remove R$ se existir e pega só o número
      const cleanValue = stringValue.replace(/^R\$\s*/, '').replace(/[^0-9.,]/g, '');
      
      // Se é um número válido, formata com R$
      if (cleanValue && !isNaN(Number(cleanValue.replace(',', '.')))) {
        finalValue = `R$ ${cleanValue}`;
      } else {
        finalValue = '';
      }
    }
    
    setProjetos(prev => prev.map(projeto => 
      projeto.id === id ? { ...projeto, budgetMensal: finalValue } : projeto
    ))
    
    toast({
      title: "Budget mensal atualizado",
      description: "Valor salvo com sucesso.",
    })
  }

  // Função específica para budget semanal - MANTÉM PADRÃO R$
  const handleBudgetSemanalSave = (id: string, value: string | number) => {
    saveToUndoStack("Atualização de budget semanal")
    
    let finalValue = '';
    const stringValue = String(value).trim();
    
    // Se está vazio ou é "-", salva como vazio
    if (!stringValue || stringValue === '-') {
      finalValue = '';
    } else {
      // Remove R$ se existir e pega só o número
      const cleanValue = stringValue.replace(/^R\$\s*/, '').replace(/[^0-9.,]/g, '');
      
      // Se é um número válido, formata com R$
      if (cleanValue && !isNaN(Number(cleanValue.replace(',', '.')))) {
        finalValue = `R$ ${cleanValue}`;
      } else {
        finalValue = '';
      }
    }
    
    setProjetos(prev => prev.map(projeto => 
      projeto.id === id ? { ...projeto, budgetSemanal: finalValue } : projeto
    ))
    
    toast({
      title: "Budget semanal atualizado", 
      description: "Valor salvo com sucesso.",
    })
  }

  // Função para exibir budget mensal - SIMPLES!
  const displayBudgetMensal = (value: string | undefined) => {
    if (!value || value.trim() === '' || value === '0') {
      return '-';
    }
    return value;
  }

  // Função para exibir budget semanal - MANTÉM FORMATO R$
  const displayBudgetSemanal = (value: string | undefined) => {
    if (!value || value.trim() === '' || value === '0') {
      return '-';
    }
    
    // Se já tem R$, mantém como está
    if (value.startsWith('R$')) {
      return value;
    }
    
    // Se é só número, adiciona R$
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    if (cleanValue && !isNaN(Number(cleanValue.replace(',', '.')))) {
      return `R$ ${cleanValue}`;
    }
    
    return value;
  }

  const addProjeto = () => {
    if (!newProjeto.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do projeto é obrigatório.",
        variant: "destructive"
      })
      return
    }

    saveToUndoStack("Adição de projeto")
    
    const projeto: Projeto = {
      ...newProjeto,
      id: Date.now().toString()
    }

    setProjetos(prev => [...prev, projeto])
    setNewProjeto({
      nome: '',
      squad: '',
      plano: '',
      tipoProprietario: '',
      status: 'Ativo',
      metaVendas: '',
      budgetMensal: '',
      budgetSemanal: '',
      rotinasAcompanhamento: ''
    })
    setShowAddForm(false)
    toast({
      title: "Projeto adicionado",
      description: "O novo projeto foi criado com sucesso.",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'projeto-status-ativo'
      case 'churn':
        return 'projeto-status-churn'
      case 'aviso previo':
        return 'projeto-status-aviso-previo'
      case 'possivel churn':
        return 'projeto-status-possivel-churn'
      case 'inativo':
        return 'projeto-status-inativo'
      case 'Pré churn':
        return 'projeto-status-pre-churn'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanoBadge = (plano: string) => {
    switch (plano) {
      case 'Starter':
        return 'projeto-plano-starter'
      case 'Business':
        return 'projeto-plano-business'
      case 'Pro':
        return 'projeto-plano-pro'
      case 'Conceito':
        return 'projeto-plano-conceito'
      case 'Social':
        return 'projeto-plano-social'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSquadBadge = (squad: string) => {
    switch (squad) {
      case 'Atlas':
        return 'squad-atlas'
      case 'Athena':
        return 'squad-athena'
      case 'Ares':
        return 'squad-ares'
      case 'Artemis':
        return 'squad-artemis'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadCSV = () => {
    const headers = ['Nome', 'Squad', 'Plano', 'Tipo do Projeto', 'Status', 'Meta de Vendas', 'Budget Mensal', 'Budget Semanal', 'Rotinas de Acompanhamento']
    const csvContent = [
      headers.join(','),
      ...filteredProjetos.map(projeto => [
        projeto.nome,
        projeto.squad,
        projeto.plano,
        projeto.tipoProprietario,
        projeto.status,
        projeto.metaVendas,
        projeto.budgetMensal,
        projeto.budgetSemanal,
        projeto.rotinasAcompanhamento
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'gestao_projetos.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const planos = Array.from(new Set(projetos.map(p => p.plano).filter(Boolean)))

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de projetos</h1>
        <p className="text-lg text-muted-foreground">
          Quadro de clientes e alocação (Operação)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Projetos</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddForm(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Projeto
              </Button>
              <Button
                onClick={downloadCSV}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-64">
                <Input
                  placeholder="Buscar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setSquadFilter('all')
                    setPlanoFilter('all')
                    setStatusFilter('all')
                  }}
                >
                  Limpar
                </Button>
                {undoStack.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={undo}
                    size="sm"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Desfazer (Ctrl+Z)
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Squad</label>
                <Select value={squadFilter} onValueChange={setSquadFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {squads.map(squad => (
                      <SelectItem key={squad.id} value={squad.name}>{squad.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Plano</label>
                <Select value={planoFilter} onValueChange={setPlanoFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {planos.map(plano => (
                      <SelectItem key={plano} value={plano}>{plano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="churn">churn</SelectItem>
                    <SelectItem value="aviso previo">aviso previo</SelectItem>
                    <SelectItem value="possivel churn">possivel churn</SelectItem>
                    <SelectItem value="inativo">inativo</SelectItem>
                    <SelectItem value="Pré churn">Pré churn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Mostrando {filteredProjetos.length} de {projetos.length}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">NOME</TableHead>
                  <TableHead className="w-[80px]">SQUAD</TableHead>
                  <TableHead className="w-[100px]">PLANO</TableHead>
                  <TableHead className="w-[120px]">TIPO DO PROJETO</TableHead>
                  <TableHead className="w-[100px]">STATUS</TableHead>
                  <TableHead className="w-[150px]">META DE VENDAS</TableHead>
                  <TableHead className="w-[120px]">BUDGET MENSAL</TableHead>
                  <TableHead className="w-[120px]">BUDGET SEMANAL</TableHead>
                  <TableHead className="min-w-[200px]">ROTINAS DE ACOMPANHAMENTO</TableHead>
                  <TableHead className="w-[80px]">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAddForm && (
                  <TableRow className="bg-muted/50">
                    <TableCell>
                      <Input
                        value={newProjeto.nome}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do projeto"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={newProjeto.squad} onValueChange={(value) => setNewProjeto(prev => ({ ...prev, squad: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Squad" />
                        </SelectTrigger>
                        <SelectContent>
                          {squads.map((squad) => (
                            <SelectItem key={squad.id} value={squad.name}>
                              {squad.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={newProjeto.plano} onValueChange={(value) => setNewProjeto(prev => ({ ...prev, plano: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Conceito">Conceito</SelectItem>
                          <SelectItem value="Social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newProjeto.tipoProprietario}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, tipoProprietario: e.target.value }))}
                        placeholder="Tipo"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={newProjeto.status} onValueChange={(value: any) => setNewProjeto(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="churn">churn</SelectItem>
                          <SelectItem value="aviso previo">aviso previo</SelectItem>
                          <SelectItem value="possivel churn">possivel churn</SelectItem>
                          <SelectItem value="inativo">inativo</SelectItem>
                          <SelectItem value="Pré churn">Pré churn</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newProjeto.metaVendas}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, metaVendas: e.target.value }))}
                        placeholder="Meta de vendas"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newProjeto.budgetMensal}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, budgetMensal: e.target.value }))}
                        placeholder="Budget mensal"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newProjeto.budgetSemanal}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, budgetSemanal: e.target.value }))}
                        placeholder="Budget semanal"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newProjeto.rotinasAcompanhamento}
                        onChange={(e) => setNewProjeto(prev => ({ ...prev, rotinasAcompanhamento: e.target.value }))}
                        placeholder="Rotinas"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={addProjeto} className="h-8 px-2">
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="h-8 px-2">
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredProjetos.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell className="font-medium">
                      <EditableCell
                        value={projeto.nome}
                        onSave={(value) => updateProjeto(projeto.id, 'nome', String(value))}
                        type="text"
                      />
                    </TableCell>
                     <TableCell>
                       <EditableCell
                         value={displayValue(projeto.squad)}
                         onSave={(value) => updateProjeto(projeto.id, 'squad', String(value))}
                         type="select"
                         options={[
                           { value: 'Ares', label: 'Ares' },
                           { value: 'Atlas', label: 'Atlas' },
                           { value: 'Artemis', label: 'Artemis' },
                           { value: 'Athena', label: 'Athena' }
                         ]}
                         badgeClassName={getSquadBadge(projeto.squad)}
                       />
                     </TableCell>
                     <TableCell>
                       <EditableCell
                         value={displayValue(projeto.plano)}
                         onSave={(value) => updateProjeto(projeto.id, 'plano', String(value))}
                         type="select"
                         options={[
                           { value: 'Starter', label: 'Starter' },
                           { value: 'Business', label: 'Business' },
                           { value: 'Pro', label: 'Pro' },
                           { value: 'Conceito', label: 'Conceito' }
                         ]}
                         badgeClassName={getPlanoBadge(projeto.plano)}
                       />
                     </TableCell>
                    <TableCell>
                      <EditableCell
                        value={displayValue(projeto.tipoProprietario)}
                        onSave={(value) => updateProjeto(projeto.id, 'tipoProprietario', String(value))}
                        type="text"
                      />
                    </TableCell>
                     <TableCell>
                       <EditableCell
                         value={projeto.status}
                         onSave={(value) => updateProjeto(projeto.id, 'status', String(value))}
                         type="select"
                         options={[
                           { value: 'Ativo', label: 'Ativo' },
                           { value: 'churn', label: 'churn' },
                           { value: 'aviso previo', label: 'aviso previo' },
                           { value: 'possivel churn', label: 'possivel churn' },
                           { value: 'inativo', label: 'inativo' },
                           { value: 'Pré churn', label: 'Pré churn' }
                         ]}
                         badgeClassName={getStatusBadge(projeto.status)}
                         readonly={true}
                       />
                     </TableCell>
                    <TableCell>
                      <EditableCell
                        value={displayValue(projeto.metaVendas)}
                        onSave={(value) => updateProjeto(projeto.id, 'metaVendas', String(value))}
                        type="text"
                      />
                    </TableCell>
                     <TableCell>
                       <EditableCell
                         value={displayBudgetMensal(projeto.budgetMensal)}
                         onSave={(value) => handleBudgetMensalSave(projeto.id, value)}
                         type="text"
                       />
                     </TableCell>
                     <TableCell>
                       <EditableCell
                         value={displayBudgetSemanal(projeto.budgetSemanal)}
                         onSave={(value) => handleBudgetSemanalSave(projeto.id, value)}
                         type="text"
                       />
                     </TableCell>
                     <TableCell className="min-w-[200px] max-w-[250px] pr-2">
                       <div className="text-sm leading-relaxed break-words whitespace-pre-line overflow-hidden">
                         {displayValue(projeto.rotinasAcompanhamento) === '-' ? 
                           <EditableCell
                             value={displayValue(projeto.rotinasAcompanhamento)}
                             onSave={(value) => updateProjeto(projeto.id, 'rotinasAcompanhamento', String(value))}
                             type="text"
                           />
                           :
                           <div className="space-y-2">
                             <div className="text-xs leading-relaxed">
                               {renderTextWithLinks(projeto.rotinasAcompanhamento)}
                             </div>
                             <EditableCell
                               value="Editar rotinas"
                               onSave={(value) => updateProjeto(projeto.id, 'rotinasAcompanhamento', String(value))}
                               type="text"
                             />
                           </div>
                         }
                       </div>
                     </TableCell>
                     <TableCell className="w-[80px]">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => removeProjeto(projeto.id)}
                         className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         </CardContent>
       </Card>
     </div>
   )
 }