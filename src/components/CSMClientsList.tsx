import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DotLogo } from '@/components/DotLogo';

interface Cliente {
  id: string;
  empresa: string;
  plano: string | null;
  categoria: string;
  stage: string | null;
  mrr: number;
  squad: 'Apollo' | 'Artemis' | 'Athena' | 'Ares' | 'Aurora' | null;
  niche: string | null;
  flag: 'verde' | 'amarela' | 'vermelha' | null;
  inadimplente: boolean;
  possivel_churn: boolean;
  churn_comercial: boolean;
  pausa_contratual: boolean;
  aviso_previo: boolean;
  churn: boolean;
  data_perda?: string | null;
  motivo_perda?: string | null;
  comentarios_perda?: string | null;
}

interface CSMClientsListProps {
  pipelineName?: string;
  pipelineId?: string;
  selectedSquad?: string;
  selectedPlano?: string;
  selectedMotivo?: string;
  selectedNiche?: string;
  selectedFlag?: string;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export function CSMClientsList({ 
  pipelineName, 
  pipelineId, 
  selectedSquad = 'todos',
  selectedPlano = 'todos',
  selectedMotivo = 'todos',
  selectedNiche = 'todos',
  selectedFlag = 'todos',
  searchTerm: externalSearchTerm = '',
  onSearchChange
}: CSMClientsListProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState<Array<{ id: string; name: string; color: string }>>([]);
  
  const searchTerm = externalSearchTerm;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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

  const loadClientes = async () => {
    try {
      setLoading(true);
      
      if (!pipelineId) {
        setClientes([]);
        setLoading(false);
        return;
      }
      
      const { data: cardsData, error } = await supabase
        .from('csm_cards')
        .select(`
          id,
          title,
          company_name,
          plano,
          monthly_revenue,
          squad,
          niche,
          flag,
          inadimplente,
          possivel_churn,
          churn_comercial,
          pausa_contratual,
          aviso_previo,
          churn,
          stage_id,
          pipeline_id,
          categoria,
          data_perda,
          motivo_perda,
          comentarios_perda
        `)
        .eq('pipeline_id', pipelineId)
        .order('company_name');

      if (error) throw error;

      // Buscar informações das stages
      const stageIds = [...new Set(cardsData?.map(c => c.stage_id).filter(Boolean))];
      const { data: stagesData } = await supabase
        .from('csm_stages')
        .select('id, name')
        .in('id', stageIds);

      const stagesMap = new Map(stagesData?.map(s => [s.id, s.name]));

      const clientesFormatados: Cliente[] = (cardsData || []).map(card => ({
        id: card.id,
        empresa: card.company_name || card.title || 'Sem nome',
        plano: card.plano,
        categoria: card.categoria || 'MRR recorrente',
        stage: card.stage_id ? stagesMap.get(card.stage_id) || null : null,
        mrr: card.monthly_revenue || 0,
        squad: card.squad as any,
        niche: card.niche || null,
        flag: (card as any).flag || null,
        inadimplente: card.inadimplente || false,
        possivel_churn: card.possivel_churn || false,
        churn_comercial: card.churn_comercial || false,
        pausa_contratual: card.pausa_contratual || false,
        aviso_previo: card.aviso_previo || false,
        churn: card.churn || false,
        data_perda: card.data_perda,
        motivo_perda: card.motivo_perda,
        comentarios_perda: card.comentarios_perda,
      }));

      setClientes(clientesFormatados);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [pipelineId]);

  const updatePlano = async (clienteId: string, plano: string) => {
    try {
      const { error } = await supabase
        .from('csm_cards')
        .update({ plano })
        .eq('id', clienteId);

      if (error) throw error;
      
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, plano } : c
      ));
      
      toast.success('Plano atualizado');
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast.error('Erro ao atualizar plano');
    }
  };

  const updateCategoria = async (clienteId: string, categoria: string) => {
    try {
      const { error } = await supabase
        .from('csm_cards')
        .update({ categoria })
        .eq('id', clienteId);

      if (error) throw error;
      
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, categoria } : c
      ));
      
      toast.success('Categoria atualizada');
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const updateSquad = async (clienteId: string, squad: Cliente['squad']) => {
    try {
      const { error } = await supabase
        .from('csm_cards')
        .update({ squad })
        .eq('id', clienteId);

      if (error) throw error;
      
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, squad } : c
      ));
      
      toast.success('Squad atualizado');
    } catch (error) {
      console.error('Erro ao atualizar squad:', error);
      toast.error('Erro ao atualizar squad');
    }
  };

  const updateFlag = async (clienteId: string, flag: Cliente['flag']) => {
    try {
      const { error } = await supabase
        .from('csm_cards')
        .update({ flag })
        .eq('id', clienteId);

      if (error) throw error;
      
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, flag } : c
      ));
      
      toast.success('Flag atualizada');
    } catch (error) {
      console.error('Erro ao atualizar flag:', error);
      toast.error('Erro ao atualizar flag');
    }
  };

  const getPlanoColor = (plano: string | null) => {
    if (!plano || plano === '-') return '';
    switch (plano) {
      case 'Starter': return 'bg-green-500/10 border-green-500/30 text-green-600';
      case 'Business': return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'Pro': return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      case 'Conceito': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      case 'Social': return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      default: return '';
    }
  };

  const getSquadColor = (squad: string | null) => {
    if (!squad) return '';
    switch (squad) {
      case 'Apollo': return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'Artemis': return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      case 'Athena': return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      case 'Ares': return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'Aurora': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      default: return '';
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSquad = selectedSquad === 'todos' || cliente.squad === selectedSquad;
    const matchesPlano = selectedPlano === 'todos' || cliente.plano === selectedPlano;
    const matchesMotivo = selectedMotivo === 'todos' || cliente.motivo_perda === selectedMotivo;
    const matchesNiche = selectedNiche === 'todos' || cliente.niche === selectedNiche;
    const matchesFlag = selectedFlag === 'todos' 
      ? true 
      : selectedFlag === 'sem_flag' 
        ? !cliente.flag 
        : cliente.flag === selectedFlag;
    return matchesSearch && matchesSquad && matchesPlano && matchesMotivo && matchesNiche && matchesFlag;
  });

  const isPerdidos = pipelineName?.toLowerCase().includes('perdidos');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <DotLogo size={40} animate />
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Carregando clientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-bold text-muted-foreground min-w-[220px]">EMPRESA</th>
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">PLANO</th>
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">CATEGORIA</th>
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">ETAPA DO FUNIL</th>
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">MRR</th>
                {!isPerdidos && (
                  <th className="text-center p-4 text-sm font-bold text-muted-foreground min-w-[200px]">STATUS</th>
                )}
                {isPerdidos && (
                  <>
                    <th className="text-center p-4 text-sm font-bold text-muted-foreground">DATA PERDA</th>
                    <th className="text-center p-4 text-sm font-bold text-muted-foreground min-w-[200px]">MOTIVO</th>
                  </>
                )}
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">SQUAD</th>
                <th className="text-center p-4 text-sm font-bold text-muted-foreground">FLAG</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente, index) => (
                <tr 
                  key={cliente.id} 
                  className={`border-b transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-card' : 'bg-card/50'
                  }`}
                >
                  <td className="p-4">
                    <div className="font-medium">{cliente.empresa}</div>
                  </td>
                  <td className="p-4">
                    <Select
                      value={cliente.plano || 'none'}
                      onValueChange={(value) => updatePlano(cliente.id, value === 'none' ? '-' : value)}
                    >
                      <SelectTrigger className={`w-full border rounded-xl ${getPlanoColor(cliente.plano)}`}>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Plano</SelectItem>
                        <SelectItem value="Starter">Starter</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                        <SelectItem value="Conceito">Conceito</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Select
                      value={cliente.categoria}
                      onValueChange={(value) => updateCategoria(cliente.id, value)}
                    >
                       <SelectTrigger className={`w-full ${
                        cliente.categoria === 'MRR recorrente' ? 'bg-muted/50 border-border text-foreground' :
                        cliente.categoria === 'MRR Vendido' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                        cliente.categoria === 'MRR Operação' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' :
                        ''
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MRR recorrente">MRR recorrente</SelectItem>
                        <SelectItem value="MRR Vendido">MRR Vendido</SelectItem>
                        <SelectItem value="MRR Operação">MRR Operação</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {cliente.stage || 'Sem etapa'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <div className="font-medium">{formatCurrency(cliente.mrr)}</div>
                  </td>
                  
                  {!isPerdidos && (
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {cliente.inadimplente && (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30 font-medium">
                            Inadimplente
                          </Badge>
                        )}
                        {cliente.possivel_churn && (
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30 font-medium">
                            Possível Churn
                          </Badge>
                        )}
                        {cliente.churn_comercial && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30 font-medium">
                            Churn Comercial
                          </Badge>
                        )}
                        {cliente.pausa_contratual && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium">
                            Pausa Contratual
                          </Badge>
                        )}
                        {cliente.aviso_previo && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium">
                            Aviso Prévio
                          </Badge>
                        )}
                        {!cliente.inadimplente && !cliente.possivel_churn && !cliente.churn_comercial && !cliente.pausa_contratual && !cliente.aviso_previo && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 font-medium">
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </td>
                  )}
                  
                  {isPerdidos && (
                    <>
                      <td className="p-4 text-center">
                        {cliente.data_perda ? (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                            {new Date(cliente.data_perda).toLocaleDateString('pt-BR')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {cliente.motivo_perda && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                              {cliente.motivo_perda}
                            </Badge>
                          )}
                          {cliente.comentarios_perda && (
                            <p className="text-xs text-muted-foreground mt-1">{cliente.comentarios_perda}</p>
                          )}
                          {!cliente.motivo_perda && !cliente.comentarios_perda && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="p-4">
                    <Select
                      value={cliente.squad || 'none'}
                      onValueChange={(value) => updateSquad(cliente.id, value === 'none' ? null : value as Cliente['squad'])}
                    >
                      <SelectTrigger className={`w-full border rounded-xl ${getSquadColor(cliente.squad)}`}>
                        <SelectValue placeholder="Selecione o squad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Squad</SelectItem>
                        {squads.map((squad) => (
                          <SelectItem key={squad.id} value={squad.name}>
                            {squad.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Select
                      value={cliente.flag || 'none'}
                      onValueChange={(value) => updateFlag(cliente.id, value === 'none' ? null : value as Cliente['flag'])}
                    >
                      <SelectTrigger className={`w-full border rounded-xl ${
                        cliente.flag === 'verde' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                        cliente.flag === 'amarela' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
                        cliente.flag === 'vermelha' ? 'bg-red-500/10 border-red-500/30 text-red-600' :
                        ''
                      }`}>
                        <SelectValue placeholder="Selecione a flag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Flag</SelectItem>
                        <SelectItem value="verde">
                          <div className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-green-600" />
                            <span>Verde</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="amarela">
                          <div className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-yellow-600" />
                            <span>Amarela</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="vermelha">
                          <div className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-red-600" />
                            <span>Vermelha</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
