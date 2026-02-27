import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Search, Filter, Download, Plus, Edit, Trash2, Upload, ChevronDown, Eye, Maximize2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EditableCell } from "@/components/EditableCell";

interface Contract {
  id: string;
  name: string;
  squad: string;
  acompanhamento: string;
  plano: string;
  etapa: string;
  entrada: string;
  servico: string;
  assinatura: string;
  primeiro_pagamento: string;
  duracao: number;
  tempo_casa: number;
  renovacao: string;
  mensalidade: number;
  valor_contrato: number;
  anexo: string;
  documento?: string;
}

interface Filters {
  nome?: string;
  squad?: string;
  acompanhamento?: string;
  plano?: string;
  etapa?: string;
  entrada?: string;
  servico?: string;
  assinatura?: string;
  duracao?: string;
  tempo_casa?: string;
  renovacao?: string;
  mensalidade?: string;
  valor_contrato?: string;
}

export const GestaoContratos = () => {
  // Badge classes using design system colors
  const getSquadBadgeClass = (squad: string): string => {
    switch (squad) {
      case "Artemis": return "squad-artemis";
      case "Athena": return "squad-athena";
      case "Atlas": return "squad-atlas";
      case "Ares": return "squad-ares";
      default: return "squad-ares";
    }
  };

  const getPlanoBadgeClass = (plano: string): string => {
    switch (plano) {
      case "Pro": return "plano-pro";
      case "Business": return "plano-business";
      case "Starter": return "plano-pro";
      case "Conceito": return "plano-personalizado";
      default: return "plano-personalizado";
    }
  };

  const getEtapaBadgeClass = (etapa: string): string => {
    switch (etapa) {
      case "Onboarding": return "projeto-status-ativo";
      case "Mês Teste": return "projeto-status-possivel-churn";
      case "Refinamento": return "projeto-status-aviso-previo";
      case "Escala": return "projeto-status-ativo";
      case "Expansão": return "projeto-status-ativo";
      case "Renovação": return "projeto-status-aviso-previo";
      case "Retenção": return "projeto-status-churn";
      default: return "projeto-status-inativo";
    }
  };

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Fetch contracts from database
  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format dates for display
      const formattedContracts = (data || []).map(contract => ({
        ...contract,
        entrada: new Date(contract.entrada).toLocaleDateString('pt-BR'),
        assinatura: new Date(contract.assinatura).toLocaleDateString('pt-BR'),
        primeiro_pagamento: new Date(contract.primeiro_pagamento).toLocaleDateString('pt-BR'),
        renovacao: new Date(contract.renovacao).toLocaleDateString('pt-BR'),
      }));

      setContracts(formattedContracts);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const applyFilters = () => {
    let filtered = contracts.filter(contract => {
      const matchesNome = !filters.nome || contract.name.toLowerCase().includes(filters.nome.toLowerCase());
      const matchesSquad = !filters.squad || contract.squad === filters.squad;
      const matchesAcompanhamento = !filters.acompanhamento || contract.acompanhamento === filters.acompanhamento;
      const matchesPlano = !filters.plano || contract.plano === filters.plano;
      const matchesEtapa = !filters.etapa || contract.etapa === filters.etapa;
      const matchesEntrada = !filters.entrada || contract.entrada.toLowerCase().includes(filters.entrada.toLowerCase());
      const matchesServico = !filters.servico || contract.servico === filters.servico;
      const matchesAssinatura = !filters.assinatura || contract.assinatura.toLowerCase().includes(filters.assinatura.toLowerCase());
      const matchesDuracao = !filters.duracao || contract.duracao.toString().includes(filters.duracao);
      const matchesTempoCasa = !filters.tempo_casa || contract.tempo_casa.toString().includes(filters.tempo_casa);
      const matchesRenovacao = !filters.renovacao || contract.renovacao.toLowerCase().includes(filters.renovacao.toLowerCase());
      const matchesMensalidade = !filters.mensalidade || contract.mensalidade.toString().includes(filters.mensalidade);
      const matchesValorContrato = !filters.valor_contrato || contract.valor_contrato.toString().includes(filters.valor_contrato);

      return matchesNome && matchesSquad && matchesAcompanhamento && matchesPlano && matchesEtapa && 
             matchesEntrada && matchesServico && matchesAssinatura && matchesDuracao && 
             matchesTempoCasa && matchesRenovacao && matchesMensalidade && matchesValorContrato;
    });
    setFilteredContracts(filtered);
  };

  const handleFilterChange = (filterType: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value || undefined
    }));
  };

  // Apply filters whenever filters or contracts change
  useEffect(() => {
    applyFilters();
  }, [filters, contracts]);

  const handleFieldUpdate = (contractId: string, field: keyof Contract, value: any) => {
    setContracts(prev => prev.map(c => 
      c.id === contractId ? { ...c, [field]: value } : c
    ));
  };

  const handleFileUpload = async (contractId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractId}_${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Update contract with document path
      handleFieldUpdate(contractId, 'anexo', filePath);
      
      toast({
        title: "Anexo enviado",
        description: "O anexo foi enviado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (contractId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `document_${contractId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Update contract with document path
      handleFieldUpdate(contractId, 'documento', filePath);
      
      toast({
        title: "Documento enviado",
        description: "O documento foi enviado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar documento.",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (filePath: string, bucket: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o arquivo.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando contratos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestão de Contratos</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsTableDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Maximize2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Expandir</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Contrato</span>
          </Button>
        </div>
      </div>

      {/* Table Container with Fixed Height and Horizontal Scroll */}
      <div className="w-full h-[calc(100vh-200px)] border rounded-lg bg-card overflow-auto">
        <table className="w-max min-w-full text-xs">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b">
                {/* Nome */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[130px] max-w-[130px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Nome</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.nome || ""}
                      onChange={(e) => handleFilterChange('nome', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Squad */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[90px] max-w-[90px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Squad</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-6 w-full justify-between text-xs px-2">
                          {filters.squad || "Filtrar"}
                          <ChevronDown className="h-2 w-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-24 p-1">
                        <div className="space-y-1">
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('squad', '')}>
                            Todos
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('squad', 'Artemis')}>
                            Artemis
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('squad', 'Athena')}>
                            Athena
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('squad', 'Atlas')}>
                            Atlas
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('squad', 'Ares')}>
                            Ares
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>

                {/* Acompanhamento */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[95px] max-w-[95px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Acomp.</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-6 w-full justify-between text-xs px-2">
                          {filters.acompanhamento || "Filtrar"}
                          <ChevronDown className="h-2 w-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-24 p-1">
                        <div className="space-y-1">
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('acompanhamento', '')}>
                            Todos
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('acompanhamento', 'Semanal')}>
                            Semanal
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-6 text-xs" onClick={() => handleFilterChange('acompanhamento', 'Quinzenal')}>
                            Quinzenal
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>

                {/* Plano */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[90px] max-w-[90px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Plano</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-6 w-full justify-between text-xs px-2">
                          {filters.plano || "Filtrar"}
                          <ChevronDown className="h-2 w-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2">
                        <div className="space-y-1">
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('plano', '')}>
                            Todos
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('plano', 'Pro')}>
                            Pro
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('plano', 'Business')}>
                            Business
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('plano', 'Starter')}>
                            Starter
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('plano', 'Conceito')}>
                            Conceito
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>

                {/* Etapa */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[100px] max-w-[100px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Etapa</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-6 w-full justify-between text-xs px-2">
                          {filters.etapa || "Filtrar"}
                          <ChevronDown className="h-2 w-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-36 p-2">
                        <div className="space-y-1">
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', '')}>
                            Todas
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Onboarding')}>
                            Onboarding
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Mês Teste')}>
                            Mês Teste
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Refinamento')}>
                            Refinamento
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Escala')}>
                            Escala
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Expansão')}>
                            Expansão
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Renovação')}>
                            Renovação
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('etapa', 'Retenção')}>
                            Retenção
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>

                {/* Entrada */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Entrada</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.entrada || ""}
                      onChange={(e) => handleFilterChange('entrada', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Serviço */}
                <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[120px] max-w-[120px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Serviço</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-6 w-full justify-between text-xs px-2">
                          {filters.servico || "Filtrar"}
                          <ChevronDown className="h-2 w-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2">
                        <div className="space-y-1">
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('servico', '')}>
                            Todos
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('servico', 'Gestão de Tráfego')}>
                            Gestão de Tráfego
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('servico', 'Social Media')}>
                            Social Media
                          </Button>
                          <Button variant="ghost" className="w-full justify-start h-7" onClick={() => handleFilterChange('servico', 'Identidade Visual')}>
                            Identidade Visual
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>

                {/* Assinatura */}
                <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] max-w-[100px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Assinatura</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.assinatura || ""}
                      onChange={(e) => handleFilterChange('assinatura', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* 1º PGTO */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  1º PGTO
                </th>

                {/* Duração */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[65px] max-w-[65px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Duração</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.duracao || ""}
                      onChange={(e) => handleFilterChange('duracao', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Tempo de Casa */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>T. Casa</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.tempo_casa || ""}
                      onChange={(e) => handleFilterChange('tempo_casa', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Renovação */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Renovação</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.renovacao || ""}
                      onChange={(e) => handleFilterChange('renovacao', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Mensalidade */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Mensalidade</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.mensalidade || ""}
                      onChange={(e) => handleFilterChange('mensalidade', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Valor Contrato */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[95px] max-w-[95px] text-xs">
                  <div className="flex flex-col gap-1">
                    <span>Vlr. Contrato</span>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.valor_contrato || ""}
                      onChange={(e) => handleFilterChange('valor_contrato', e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </th>

                {/* Upload Documento */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[80px] max-w-[80px] text-xs">
                  Upload
                </th>

                {/* Visualizar Documento */}
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground min-w-[60px] max-w-[60px] text-xs">
                  <div className="flex items-center justify-center">
                    <Eye className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="border-b hover:bg-muted/50">
                  {/* Nome */}
                  <td className="p-2 align-middle font-medium min-w-[130px] max-w-[130px] text-xs">
                    <EditableCell
                      value={contract.name}
                      onSave={(value) => handleFieldUpdate(contract.id, 'name', value)}
                      type="text"
                    />
                  </td>

                  {/* Squad */}
                  <td className="p-2 align-middle min-w-[90px] max-w-[90px] text-xs">
                    <EditableCell
                      value={contract.squad}
                      onSave={(value) => handleFieldUpdate(contract.id, 'squad', value)}
                      type="select"
                      options={[
                        { value: 'Artemis', label: 'Artemis' },
                        { value: 'Athena', label: 'Athena' },
                        { value: 'Atlas', label: 'Atlas' },
                        { value: 'Ares', label: 'Ares' }
                      ]}
                      badgeClassName={contract.squad ? getSquadBadgeClass(contract.squad) : ''}
                      compact={true}
                    />
                  </td>

                  {/* Acompanhamento */}
                  <td className="p-2 align-middle min-w-[95px] max-w-[95px] text-xs">
                    <EditableCell
                      value={contract.acompanhamento}
                      onSave={(value) => handleFieldUpdate(contract.id, 'acompanhamento', value)}
                      type="select"
                      options={[
                        { value: 'Semanal', label: 'Semanal' },
                        { value: 'Quinzenal', label: 'Quinzenal' }
                      ]}
                      compact={true}
                    />
                  </td>

                  {/* Plano */}
                  <td className="p-2 align-middle min-w-[90px] max-w-[90px] text-xs">
                    <EditableCell
                      value={contract.plano}
                      onSave={(value) => handleFieldUpdate(contract.id, 'plano', value)}
                      type="select"
                      options={[
                        { value: 'Pro', label: 'Pro' },
                        { value: 'Business', label: 'Business' },
                        { value: 'Starter', label: 'Starter' },
                        { value: 'Conceito', label: 'Conceito' }
                      ]}
                      badgeClassName={contract.plano ? getPlanoBadgeClass(contract.plano) : ''}
                      compact={true}
                    />
                  </td>

                  {/* Etapa */}
                  <td className="p-2 align-middle min-w-[100px] max-w-[100px] text-xs">
                    <EditableCell
                      value={contract.etapa}
                      onSave={(value) => handleFieldUpdate(contract.id, 'etapa', value)}
                      type="select"
                      options={[
                        { value: 'Onboarding', label: 'Onboarding' },
                        { value: 'Mês Teste', label: 'Mês Teste' },
                        { value: 'Refinamento', label: 'Refinamento' },
                        { value: 'Escala', label: 'Escala' },
                        { value: 'Expansão', label: 'Expansão' },
                        { value: 'Renovação', label: 'Renovação' },
                        { value: 'Retenção', label: 'Retenção' }
                      ]}
                      badgeClassName={contract.etapa ? getEtapaBadgeClass(contract.etapa) : ''}
                      compact={true}
                    />
                  </td>

                  {/* Entrada */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <EditableCell
                      value={contract.entrada}
                      onSave={(value) => handleFieldUpdate(contract.id, 'entrada', value)}
                      type="text"
                    />
                  </td>

                  {/* Serviço */}
                  <td className="p-3 align-middle min-w-[120px] max-w-[120px] text-xs">
                    <EditableCell
                      value={contract.servico}
                      onSave={(value) => handleFieldUpdate(contract.id, 'servico', value)}
                      type="text"
                    />
                  </td>

                  {/* Assinatura */}
                  <td className="p-3 align-middle min-w-[100px] max-w-[100px] text-xs">
                    <EditableCell
                      value={contract.assinatura}
                      onSave={(value) => handleFieldUpdate(contract.id, 'assinatura', value)}
                      type="text"
                    />
                  </td>

                  {/* 1º PGTO */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <EditableCell
                      value={contract.primeiro_pagamento}
                      onSave={(value) => handleFieldUpdate(contract.id, 'primeiro_pagamento', value)}
                      type="text"
                    />
                  </td>

                  {/* Duração */}
                  <td className="p-2 align-middle min-w-[65px] max-w-[65px] text-xs">
                    <EditableCell
                      value={contract.duracao}
                      onSave={(value) => handleFieldUpdate(contract.id, 'duracao', Number(value))}
                      type="text"
                    /> 
                  </td>

                  {/* Tempo de Casa */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <EditableCell
                      value={contract.tempo_casa}
                      onSave={(value) => handleFieldUpdate(contract.id, 'tempo_casa', Number(value))}
                      type="text"
                    /> 
                  </td>

                  {/* Renovação */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <EditableCell
                      value={contract.renovacao}
                      onSave={(value) => handleFieldUpdate(contract.id, 'renovacao', value)}
                      type="text"
                    />
                  </td>

                  {/* Mensalidade */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <EditableCell
                      value={contract.mensalidade}
                      onSave={(value) => handleFieldUpdate(contract.id, 'mensalidade', Number(value))}
                      type="currency"
                    />
                  </td>

                  {/* Valor Contrato */}
                  <td className="p-2 align-middle min-w-[95px] max-w-[95px] text-xs">
                    <EditableCell
                      value={contract.valor_contrato}
                      onSave={(value) => handleFieldUpdate(contract.id, 'valor_contrato', Number(value))}
                      type="currency"
                    />
                  </td>

                  {/* Upload Documento */}
                  <td className="p-2 align-middle min-w-[80px] max-w-[80px] text-xs">
                    <input
                      type="file"
                      ref={documentInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentUpload(contract.id, file);
                        }
                      }}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => documentInputRef.current?.click()}
                      className="h-6 w-6 p-1 flex-shrink-0"
                      title="Upload documento"
                    >
                      <Upload className="h-2 w-2" />
                    </Button>
                  </td>

                  {/* Visualizar Documento */}
                  <td className="p-2 align-middle min-w-[60px] max-w-[60px] text-xs">
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => contract.documento && handleViewFile(contract.documento, 'contract-documents')}
                        className={`h-6 w-6 p-1 flex-shrink-0 ${!contract.documento ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={contract.documento ? "Visualizar documento" : "Nenhum documento disponível"}
                        disabled={!contract.documento}
                      >
                        <Eye className="h-2 w-2" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* No Results */}
      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Nenhum contrato encontrado com os filtros aplicados.
          </div>
        </div>
      )}

      {/* Expanded Table Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="max-w-screen-2xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Gestão de Contratos - Visualização Expandida
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="w-full border rounded-lg bg-card">
              <div className="overflow-auto">
                <table className="w-max text-xs">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[150px] text-xs">
                        <div className="flex flex-col gap-2">
                          <span>Nome</span>
                          <Input
                            placeholder="Filtrar..."
                            value={filters.nome || ""}
                            onChange={(e) => handleFilterChange('nome', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                      </th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[110px] text-xs">Squad</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[120px] text-xs">Acompanhamento</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[110px] text-xs">Plano</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[120px] text-xs">Etapa</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Entrada</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[120px] text-xs">Serviço</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Assinatura</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">1º PGTO</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[90px] text-xs">Duração</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Tempo Casa</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Renovação</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Mensalidade</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[120px] text-xs">Valor Contrato</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[80px] text-xs">Anexo</th>
                      <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground min-w-[100px] text-xs">Documentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 align-middle font-medium min-w-[150px] text-xs">
                          <EditableCell
                            value={contract.name}
                            onSave={(value) => handleFieldUpdate(contract.id, 'name', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[110px] text-xs">
                          <EditableCell
                            value={contract.squad}
                            onSave={(value) => handleFieldUpdate(contract.id, 'squad', value)}
                            type="select"
                            options={[
                              { value: 'Artemis', label: 'Artemis' },
                              { value: 'Athena', label: 'Athena' },
                              { value: 'Atlas', label: 'Atlas' },
                              { value: 'Ares', label: 'Ares' }
                            ]}
                            badgeClassName={contract.squad ? getSquadBadgeClass(contract.squad) : ''}
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[120px] text-xs">
                          <EditableCell
                            value={contract.acompanhamento}
                            onSave={(value) => handleFieldUpdate(contract.id, 'acompanhamento', value)}
                            type="select"
                            options={[
                              { value: 'Semanal', label: 'Semanal' },
                              { value: 'Quinzenal', label: 'Quinzenal' }
                            ]}
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[110px] text-xs">
                          <EditableCell
                            value={contract.plano}
                            onSave={(value) => handleFieldUpdate(contract.id, 'plano', value)}
                            type="select"
                            options={[
                              { value: 'Pro', label: 'Pro' },
                              { value: 'Business', label: 'Business' },
                              { value: 'Starter', label: 'Starter' },
                              { value: 'Conceito', label: 'Conceito' }
                            ]}
                            badgeClassName={contract.plano ? getPlanoBadgeClass(contract.plano) : ''}
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[120px] text-xs">
                          <EditableCell
                            value={contract.etapa}
                            onSave={(value) => handleFieldUpdate(contract.id, 'etapa', value)}
                            type="select"
                            options={[
                              { value: 'Onboarding', label: 'Onboarding' },
                              { value: 'Mês Teste', label: 'Mês Teste' },
                              { value: 'Refinamento', label: 'Refinamento' },
                              { value: 'Escala', label: 'Escala' },
                              { value: 'Expansão', label: 'Expansão' },
                              { value: 'Renovação', label: 'Renovação' },
                              { value: 'Retenção', label: 'Retenção' }
                            ]}
                            badgeClassName={contract.etapa ? getEtapaBadgeClass(contract.etapa) : ''}
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.entrada}
                            onSave={(value) => handleFieldUpdate(contract.id, 'entrada', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[120px] text-xs">
                          <EditableCell
                            value={contract.servico}
                            onSave={(value) => handleFieldUpdate(contract.id, 'servico', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.assinatura}
                            onSave={(value) => handleFieldUpdate(contract.id, 'assinatura', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.primeiro_pagamento}
                            onSave={(value) => handleFieldUpdate(contract.id, 'primeiro_pagamento', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[90px] text-xs">
                          <EditableCell
                            value={contract.duracao}
                            onSave={(value) => handleFieldUpdate(contract.id, 'duracao', Number(value))}
                            type="text"
                          /> 
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.tempo_casa}
                            onSave={(value) => handleFieldUpdate(contract.id, 'tempo_casa', Number(value))}
                            type="text"
                          /> 
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.renovacao}
                            onSave={(value) => handleFieldUpdate(contract.id, 'renovacao', value)}
                            type="text"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <EditableCell
                            value={contract.mensalidade}
                            onSave={(value) => handleFieldUpdate(contract.id, 'mensalidade', Number(value))}
                            type="currency"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[120px] text-xs">
                          <EditableCell
                            value={contract.valor_contrato}
                            onSave={(value) => handleFieldUpdate(contract.id, 'valor_contrato', Number(value))}
                            type="currency"
                          />
                        </td>
                        <td className="p-3 align-middle min-w-[80px] text-xs">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-7 w-7 p-1"
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                            {contract.anexo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(contract.anexo, 'contract-attachments')}
                                className="h-7 w-7 p-1"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-middle min-w-[100px] text-xs">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => documentInputRef.current?.click()}
                              className="h-7 w-7 p-1"
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                            {contract.documento && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(contract.documento, 'contract-documents')}
                                className="h-7 w-7 p-1"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
