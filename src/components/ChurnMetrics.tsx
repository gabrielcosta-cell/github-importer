import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import { TrendingDown, Users, DollarSign, AlertTriangle, Activity, Target, TrendingUp, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MonthYearPicker } from "@/components/MonthYearPicker";

interface ChurnData {
  squad: string;
  revenueChurnBruto: number;
  revenueChurnLiquido: number;
  churnLiquidoUpsell: number;
  logoChurnTotal: number;
  nChurnTotal: number;
  nChurnComercial: number;
  nChurnOperacional: number;
  logoChurnFinal: number;
  upsellMRR: number;
  churnMRRComercial: number;
  mrrPerdidoOperacional: number;
  mrrPerdidoTotal: number;
  logoChurnComercial: number;
  mrrBaseTotal: number; // MRR de clientes ativos
  churnMRRBrutoPercentual: number; // % de churn MRR bruto
  churnMRRFinalPercentual: number; // % de churn MRR final (bruto - comercial)
  churnNRR: number; // % de churn NRR (MRR Perdido / (MRR Base + Upsell))
  totalUpsellValue: number; // Valor total de upsell
  logoChurnTotalCalc?: number; // % de logo churn bruto
  logoChurnOperacionalCalc?: number; // % de logo churn operacional
  logoChurnComercialCalc?: number; // % de logo churn comercial
}

// Pipeline IDs corretos
const PIPELINE_CLIENTES_ATIVOS = '749ccdc2-5127-41a1-997b-3dcb47979555';
const PIPELINE_CLIENTES_PERDIDOS = '38ce6be3-a9ee-450a-89be-2afe762bf50f';
const ALL_CSM_PIPELINES = [PIPELINE_CLIENTES_ATIVOS, PIPELINE_CLIENTES_PERDIDOS];

// Função para determinar cor e animação baseada no percentual
const getChurnColorClass = (value: number) => {
  if (value >= 0 && value <= 3) {
    return "text-green-400";
  } else if (value > 3 && value <= 5) {
    return "text-green-600";
  } else if (value > 5 && value <= 8) {
    return "text-orange-500";
  } else if (value > 8 && value <= 10) {
    return "text-red-400";
  } else {
    return "text-red-600 animate-pulse";
  }
};

export const ChurnMetrics = () => {
  const [selectedSquad, setSelectedSquad] = useState<string>("Todos");
  const [activeTab, setActiveTab] = useState<string>("metricas");
  const [churnDataFromDB, setChurnDataFromDB] = useState<ChurnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrrBaseTotal, setMrrBaseTotal] = useState<number>(0);
  const [totalActiveClients, setTotalActiveClients] = useState<number>(0);
  const [activeClientsBySquad, setActiveClientsBySquad] = useState<Record<string, number>>({});
  const [mrrBaseBySquad, setMrrBaseBySquad] = useState<Record<string, number>>({});
  
  const currentDate = new Date();
  
  // Filtro de período - padrão é o mês atual (ou nov/2025 se estamos antes disso)
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Se estamos antes de novembro/2025, usar nov/2025
    if (currentYear < 2025 || (currentYear === 2025 && currentMonth < 11)) {
      return { month: 11, year: 2025 };
    }
    
    return { month: currentMonth, year: currentYear };
  };
  
  const defaultPeriod = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultPeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(defaultPeriod.year);
  
  const [squads, setSquads] = useState<string[]>(["Todos"]);

  // Carregar squads do banco
  useEffect(() => {
    const loadSquads = async () => {
      try {
        const { data, error } = await supabase
          .from('squads')
          .select('name')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (error) throw error;
        setSquads(["Todos", ...(data?.map(s => s.name) || [])]);
      } catch (error) {
        console.error('Erro ao carregar squads:', error);
      }
    };
    loadSquads();
  }, []);

  // Buscar dados de churn do banco - histórico mensal
  useEffect(() => {
    const fetchChurnData = async () => {
      try {
        setLoading(true);
        
        // Buscar clientes ativos (não churn) para calcular total de clientes
        // Isso é necessário sempre, independente de termos histórico ou não
        // IMPORTANTE: Filtrar apenas pipeline CSM (Clientes ativos), não leads
        const { data: activeCards, error: activeError } = await supabase
          .from('csm_cards')
          .select('monthly_revenue, squad, categoria')
          .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS)
          .eq('churn', false);

        if (activeError) throw activeError;

        // Calcular próximo mês corretamente (lidando com virada de ano)
        const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
        const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;

        // Buscar churns do mês SELECIONADO EM DIANTE para incluir na base de clientes
        // (eles faziam parte da base no início do mês selecionado)
        const { data: baseChurns, error: baseChurnError } = await supabase
          .from('csm_cards')
          .select('squad, categoria')
          .in('pipeline_id', ALL_CSM_PIPELINES)
          .eq('churn', true)
          .gte('data_perda', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);

        if (baseChurnError) throw baseChurnError;

        // Contar total de clientes com categoria "MRR recorrente" apenas
        // Incluir clientes ativos + churns do mês em diante (pois faziam parte da base no início do mês)
        const activeCardsFiltered = activeCards?.filter(card => 
          card.categoria === 'MRR recorrente' || card.categoria === 'MRR Recorrente'
        ) || [];
        const baseChurnCardsFiltered = baseChurns?.filter(card => 
          card.categoria === 'MRR recorrente' || card.categoria === 'MRR Recorrente'
        ) || [];
        const totalClients = activeCardsFiltered.length + baseChurnCardsFiltered.length;
        console.log('Logo Churn Debug - Total clientes MRR recorrente:', totalClients, 'Ativos:', activeCardsFiltered.length, 'Churns base:', baseChurnCardsFiltered.length);
        setTotalActiveClients(totalClients);

        // Buscar todos os squads ativos
        const { data: squadsList, error: squadsError } = await supabase
          .from('squads')
          .select('name')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (squadsError) throw squadsError;

        // Calcular primeiro dia do mês selecionado
        const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

        // Buscar TODOS os clientes que estavam ativos no INÍCIO do mês selecionado
        // Isso inclui: clientes ainda ativos + clientes que cancelaram a partir do mês selecionado
        // Exclui: clientes que já tinham cancelado ANTES do mês selecionado
        const { data: baseClientsData, error: baseError } = await supabase
          .from('csm_cards')
          .select('squad, monthly_revenue, categoria, churn, data_perda')
          .in('pipeline_id', ALL_CSM_PIPELINES)
          .or(`churn.eq.false,data_perda.gte.${startOfMonth}`);

        if (baseError) throw baseError;

        // Filtrar apenas MRR recorrente
        const baseClientsFiltered = baseClientsData?.filter(card => 
          card.categoria === 'MRR recorrente' || card.categoria === 'MRR Recorrente'
        ) || [];

        // Contar clientes por squad e calcular MRR base
        const clientsBySquad: Record<string, number> = {};
        const mrrBySquad: Record<string, number> = {};
        
        // Inicializar todos os squads
        squadsList?.forEach(s => {
          clientsBySquad[s.name] = 0;
          mrrBySquad[s.name] = 0;
        });
        
        // Contar todos os clientes que estavam ativos no início do mês e somar MRR
        baseClientsFiltered.forEach(card => {
          const squad = card.squad || 'Athena';
          if (clientsBySquad[squad] !== undefined) {
            clientsBySquad[squad]++;
            mrrBySquad[squad] += Number(card.monthly_revenue) || 0;
          } else {
            // Squad não existe na lista, inicializar
            clientsBySquad[squad] = 1;
            mrrBySquad[squad] = Number(card.monthly_revenue) || 0;
          }
        });
        
        setActiveClientsBySquad(clientsBySquad);
        setMrrBaseBySquad(mrrBySquad);
        
        // Buscar upsells do mês - agora do histórico
        const { data: upsellData, error: upsellError } = await supabase
          .from('csm_card_upsell_history')
          .select('upsell_value, card_id')
          .eq('upsell_month', selectedMonth)
          .eq('upsell_year', selectedYear);

        if (upsellError) throw upsellError;

        // Buscar variáveis (investimento/venda) do mês
        const { data: variableData, error: variableError } = await supabase
          .from('csm_card_variable_history')
          .select('variable_value, variable_type, card_id')
          .eq('variable_month', selectedMonth)
          .eq('variable_year', selectedYear);

        if (variableError) throw variableError;

        // Buscar squad dos cards que têm upsell ou variável (apenas pipeline CSM)
        const upsellCardIds = upsellData?.map(u => u.card_id) || [];
        const variableCardIds = variableData?.map(v => v.card_id) || [];
        const cardIds = [...new Set([...upsellCardIds, ...variableCardIds])];
        
        const { data: cardsWithUpsellOrVariable } = await supabase
          .from('csm_cards')
          .select('id, squad, title')
          .in('pipeline_id', ALL_CSM_PIPELINES)
          .in('id', cardIds);

        // Mapear squad por card_id
        const squadByCardId: Record<string, string> = {};
        cardsWithUpsellOrVariable?.forEach(card => {
          squadByCardId[card.id] = card.squad || 'Athena';
        });

        // Processar upsells com squad
        const monthlyUpsells = upsellData?.map(u => ({
          ...u,
          squad: squadByCardId[u.card_id] || 'Athena'
        })) || [];

        // Processar variáveis (investimento/venda) com squad
        const monthlyVariables = variableData?.map(v => ({
          ...v,
          squad: squadByCardId[v.card_id] || 'Athena'
        })) || [];

        // Calcular total de variáveis por squad
        const variableBySquad: Record<string, number> = {};
        monthlyVariables.forEach(v => {
          const squad = v.squad;
          const value = Number(v.variable_value) || 0;
          variableBySquad[squad] = (variableBySquad[squad] || 0) + value;
        });

        console.log('Churn NRR Debug - Upsells:', monthlyUpsells, 'Variáveis:', monthlyVariables, 'Variável por squad:', variableBySquad);

        // Buscar histórico mensal do banco
        const { data: monthlyHistory, error: historyError } = await supabase
          .from('churn_monthly_history')
          .select('*')
          .eq('month', selectedMonth)
          .eq('year', selectedYear);

        if (historyError) throw historyError;

        // Se não houver dados históricos, calcular em tempo real
        if (!monthlyHistory || monthlyHistory.length === 0) {
          // Buscar churns do mês específico
          // IMPORTANTE: Buscar churns em ambos pipelines (Clientes ativos + Clientes Perdidos)
          const { data: churnCards, error } = await supabase
            .from('csm_cards')
            .select('*')
            .in('pipeline_id', ALL_CSM_PIPELINES)
            .eq('churn', true)
            .gte('data_perda', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)
            .lt('data_perda', `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);

          if (error) throw error;

          // Buscar todos os squads ativos do banco
          const { data: squadsList, error: squadsError } = await supabase
            .from('squads')
            .select('name')
            .eq('is_active', true)
            .order('position', { ascending: true });

          if (squadsError) throw squadsError;

          // Processar dados por squad dinamicamente
          const squadData: { [key: string]: ChurnData } = {};
          
          // Inicializar todos os squads ativos com valores zerados
          squadsList?.forEach(s => {
            squadData[s.name] = {
              squad: s.name,
              revenueChurnBruto: 0,
              revenueChurnLiquido: 0,
              churnLiquidoUpsell: 0,
              logoChurnTotal: 0,
              nChurnTotal: 0,
              nChurnComercial: 0,
              nChurnOperacional: 0,
              logoChurnFinal: 0,
              upsellMRR: 0,
              churnMRRComercial: 0,
              mrrPerdidoOperacional: 0,
              mrrPerdidoTotal: 0,
              logoChurnComercial: 0,
              mrrBaseTotal: 0,
              churnMRRBrutoPercentual: 0,
              churnMRRFinalPercentual: 0,
              churnNRR: 0,
              totalUpsellValue: 0
            };
          });

          // Usar valores calculados do MRR base por squad (do banco de dados)
          Object.keys(squadData).forEach(squadName => {
            squadData[squadName].mrrBaseTotal = mrrBaseBySquad[squadName] || 0;
          });

          // Calcular upsells por squad
          monthlyUpsells.forEach(upsell => {
            const squad = upsell.squad || 'Athena';
            const upsellValue = Number(upsell.upsell_value) || 0;
            
            // Inicializar squad se não existir
            if (!squadData[squad]) {
              squadData[squad] = {
                squad: squad,
                revenueChurnBruto: 0,
                revenueChurnLiquido: 0,
                churnLiquidoUpsell: 0,
                logoChurnTotal: 0,
                nChurnTotal: 0,
                nChurnComercial: 0,
                nChurnOperacional: 0,
                logoChurnFinal: 0,
                upsellMRR: 0,
                churnMRRComercial: 0,
                mrrPerdidoOperacional: 0,
                mrrPerdidoTotal: 0,
                logoChurnComercial: 0,
                mrrBaseTotal: mrrBaseBySquad[squad] || 0,
                churnMRRBrutoPercentual: 0,
                churnMRRFinalPercentual: 0,
                churnNRR: 0,
                totalUpsellValue: 0
              };
            }
            
            squadData[squad].totalUpsellValue += upsellValue;
          });

          // Adicionar variáveis (investimento/venda) ao totalUpsellValue
          monthlyVariables.forEach(variable => {
            const squad = variable.squad || 'Athena';
            const variableValue = Number(variable.variable_value) || 0;
            
            if (squadData[squad]) {
              squadData[squad].totalUpsellValue += variableValue;
            }
          });
          
          console.log('Upsell+Variável Total por squad:', Object.entries(squadData).map(([k, v]) => `${k}: R$${v.totalUpsellValue}`).join(', '));

          // Processar cada card de churn
          churnCards?.forEach(card => {
            const squad = card.squad || 'Athena';
            const mrr = Number(card.monthly_revenue) || 0;
            
            // Inicializar squad se não existir
            if (!squadData[squad]) {
              squadData[squad] = {
                squad: squad,
                revenueChurnBruto: 0,
                revenueChurnLiquido: 0,
                churnLiquidoUpsell: 0,
                logoChurnTotal: 0,
                nChurnTotal: 0,
                nChurnComercial: 0,
                nChurnOperacional: 0,
                logoChurnFinal: 0,
                upsellMRR: 0,
                churnMRRComercial: 0,
                mrrPerdidoOperacional: 0,
                mrrPerdidoTotal: 0,
                logoChurnComercial: 0,
                mrrBaseTotal: mrrBaseBySquad[squad] || 0,
                churnMRRBrutoPercentual: 0,
                churnMRRFinalPercentual: 0,
                churnNRR: 0,
                totalUpsellValue: 0
              };
            }
            
            squadData[squad].nChurnTotal++;
            squadData[squad].mrrPerdidoTotal += mrr;
            
            const isChurnComercial = card.motivo_perda === 'Churn Comercial';
            
            if (isChurnComercial) {
              squadData[squad].nChurnComercial++;
              squadData[squad].churnMRRComercial += mrr;
            } else {
              squadData[squad].nChurnOperacional++;
              squadData[squad].mrrPerdidoOperacional += mrr;
            }
          });

          // Calcular percentuais de churn MRR bruto, final e NRR para cada squad
          Object.values(squadData).forEach(squad => {
            if (squad.mrrBaseTotal > 0) {
              squad.churnMRRBrutoPercentual = (squad.mrrPerdidoTotal / squad.mrrBaseTotal) * 100;
              squad.churnMRRFinalPercentual = ((squad.mrrPerdidoTotal - squad.churnMRRComercial) / squad.mrrBaseTotal) * 100;
              
              // Churn NRR = MRR Perdido / (MRR Base + Upsell + Variáveis)
              // totalUpsellValue já inclui upsells + variáveis
              const mrrBaseComUpsellEVariavel = squad.mrrBaseTotal + squad.totalUpsellValue;
              squad.churnNRR = mrrBaseComUpsellEVariavel > 0 ? (squad.mrrPerdidoTotal / mrrBaseComUpsellEVariavel) * 100 : 0;
              console.log(`Churn NRR Debug - Squad: ${squad.squad}, MRR Base: ${squad.mrrBaseTotal}, Upsell+Variável: ${squad.totalUpsellValue}, Total Base NRR: ${mrrBaseComUpsellEVariavel}, MRR Perdido: ${squad.mrrPerdidoTotal}, NRR: ${squad.churnNRR.toFixed(2)}%`);
            }
          });

           // Calcular MRR base total a partir dos dados reais
           const calculatedMrrBaseTotal = Object.values(mrrBySquad).reduce((sum, v) => sum + v, 0);
           setMrrBaseTotal(calculatedMrrBaseTotal);

          setChurnDataFromDB(Object.values(squadData));
        } else {
          // Usar dados do histórico
          // Buscar todos os squads ativos do banco
          const { data: squadsList, error: squadsError } = await supabase
            .from('squads')
            .select('name')
            .eq('is_active', true)
            .order('position', { ascending: true});

          if (squadsError) throw squadsError;

          const squadData: { [key: string]: ChurnData } = {};
          
          // Inicializar todos os squads ativos com valores zerados
          squadsList?.forEach(s => {
            squadData[s.name] = {
              squad: s.name,
              revenueChurnBruto: 0,
              revenueChurnLiquido: 0,
              churnLiquidoUpsell: 0,
              logoChurnTotal: 0,
              nChurnTotal: 0,
              nChurnComercial: 0,
              nChurnOperacional: 0,
              logoChurnFinal: 0,
              upsellMRR: 0,
              churnMRRComercial: 0,
              mrrPerdidoOperacional: 0,
              mrrPerdidoTotal: 0,
              logoChurnComercial: 0,
              mrrBaseTotal: 0,
              churnMRRBrutoPercentual: 0,
              churnMRRFinalPercentual: 0,
              churnNRR: 0,
              totalUpsellValue: 0
            };
          });

          // Usar valores calculados do MRR base por squad (do banco de dados)
          Object.keys(squadData).forEach(squadName => {
            squadData[squadName].mrrBaseTotal = mrrBaseBySquad[squadName] || 0;
          });

          // Calcular upsells por squad
          monthlyUpsells.forEach(upsell => {
            const squad = upsell.squad || 'Athena';
            const upsellValue = Number(upsell.upsell_value) || 0;
            
            if (squadData[squad]) {
              squadData[squad].totalUpsellValue += upsellValue;
            }
          });

          // Adicionar variáveis (investimento/venda) ao totalUpsellValue
          monthlyVariables.forEach(variable => {
            const squad = variable.squad || 'Athena';
            const variableValue = Number(variable.variable_value) || 0;
            
            if (squadData[squad]) {
              squadData[squad].totalUpsellValue += variableValue;
            }
          });

          // Adicionar dados do histórico
          monthlyHistory.forEach(record => {
            const squad = record.squad;
            // Inicializar squad se não existir (para squads novos que não estão na lista)
            if (!squadData[squad]) {
              squadData[squad] = {
                squad: squad,
                revenueChurnBruto: 0,
                revenueChurnLiquido: 0,
                churnLiquidoUpsell: 0,
                logoChurnTotal: 0,
                nChurnTotal: 0,
                nChurnComercial: 0,
                nChurnOperacional: 0,
                logoChurnFinal: 0,
                upsellMRR: 0,
                churnMRRComercial: 0,
                mrrPerdidoOperacional: 0,
                mrrPerdidoTotal: 0,
                logoChurnComercial: 0,
                mrrBaseTotal: mrrBaseBySquad[squad] || 0,
                churnMRRBrutoPercentual: 0,
                churnMRRFinalPercentual: 0,
                churnNRR: 0,
                totalUpsellValue: 0
              };
            }
            
            squadData[squad].nChurnTotal = record.n_churn_total;
            squadData[squad].nChurnComercial = record.n_churn_comercial;
            squadData[squad].nChurnOperacional = record.n_churn_operacional;
            squadData[squad].churnMRRComercial = Number(record.mrr_perdido_comercial) || 0;
            squadData[squad].mrrPerdidoOperacional = Number(record.mrr_perdido_operacional) || 0;
            squadData[squad].mrrPerdidoTotal = Number(record.mrr_perdido_total) || 0;
              
            // Calcular percentual de churn MRR bruto, final e NRR
            if (squadData[squad].mrrBaseTotal > 0) {
              squadData[squad].churnMRRBrutoPercentual = (squadData[squad].mrrPerdidoTotal / squadData[squad].mrrBaseTotal) * 100;
              squadData[squad].churnMRRFinalPercentual = ((squadData[squad].mrrPerdidoTotal - squadData[squad].churnMRRComercial) / squadData[squad].mrrBaseTotal) * 100;
              
              // Churn NRR = MRR Perdido / (MRR Base + Upsell + Variáveis)
              // totalUpsellValue já inclui upsells + variáveis
              const mrrBaseComUpsellEVariavel = squadData[squad].mrrBaseTotal + squadData[squad].totalUpsellValue;
              squadData[squad].churnNRR = mrrBaseComUpsellEVariavel > 0 ? (squadData[squad].mrrPerdidoTotal / mrrBaseComUpsellEVariavel) * 100 : 0;
              console.log(`Churn NRR Debug (histórico) - Squad: ${squad}, MRR Base: ${squadData[squad].mrrBaseTotal}, Upsell+Variável: ${squadData[squad].totalUpsellValue}, Total Base NRR: ${mrrBaseComUpsellEVariavel}, MRR Perdido: ${squadData[squad].mrrPerdidoTotal}, NRR: ${squadData[squad].churnNRR.toFixed(2)}%`);
            }
          });

           // Calcular MRR base total a partir dos dados reais
           const calculatedMrrBaseTotalHist = Object.values(mrrBySquad).reduce((sum, v) => sum + v, 0);
           setMrrBaseTotal(calculatedMrrBaseTotalHist);

          setChurnDataFromDB(Object.values(squadData));
        }
      } catch (error) {
        console.error('Erro ao buscar dados de churn:', error);
        toast.error('Erro ao carregar dados de churn');
        setChurnDataFromDB([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChurnData();
  }, [selectedMonth, selectedYear]);

   // Filter data by selected squad
   const dataToUse = churnDataFromDB;
  const filteredData = selectedSquad === "Todos" 
    ? dataToUse 
    : dataToUse.filter(d => d.squad === selectedSquad);

  // Calculate metrics based on filtered data
  const calculateMetrics = () => {
    if (filteredData.length === 0) {
      return {
        revenueChurnBruto: 0,
        revenueChurnLiquido: 0,
        churnLiquidoUpsell: 0,
        logoChurnTotal: 0,
        logoChurnFinal: 0,
        nChurnTotal: 0,
        nChurnComercial: 0,
        nChurnOperacional: 0,
        upsellMRR: 0,
        churnMRRComercial: 0,
        mrrPerdidoOperacional: 0,
        mrrPerdidoTotal: 0,
        logoChurnComercial: 0,
        churnMRRBrutoPercentual: 0,
        churnMRRFinalPercentual: 0,
        churnNRR: 0,
        totalUpsellValue: 0,
        logoChurnTotalCalc: 0,
        logoChurnOperacionalCalc: 0,
        logoChurnComercialCalc: 0,
      };
    }

    const totals = filteredData.reduce(
      (acc, row) => ({
        revenueChurnBruto: acc.revenueChurnBruto + row.revenueChurnBruto,
        revenueChurnLiquido: acc.revenueChurnLiquido + row.revenueChurnLiquido,
        churnLiquidoUpsell: acc.churnLiquidoUpsell + row.churnLiquidoUpsell,
        logoChurnTotal: acc.logoChurnTotal + row.logoChurnTotal,
        logoChurnFinal: acc.logoChurnFinal + row.logoChurnFinal,
        nChurnTotal: acc.nChurnTotal + row.nChurnTotal,
        nChurnComercial: acc.nChurnComercial + row.nChurnComercial,
        nChurnOperacional: acc.nChurnOperacional + row.nChurnOperacional,
        upsellMRR: acc.upsellMRR + row.upsellMRR,
        churnMRRComercial: acc.churnMRRComercial + row.churnMRRComercial,
        mrrPerdidoOperacional: acc.mrrPerdidoOperacional + row.mrrPerdidoOperacional,
        mrrPerdidoTotal: acc.mrrPerdidoTotal + row.mrrPerdidoTotal,
        logoChurnComercial: acc.logoChurnComercial + row.logoChurnComercial,
        churnMRRBrutoPercentual: acc.churnMRRBrutoPercentual + row.churnMRRBrutoPercentual,
        churnMRRFinalPercentual: acc.churnMRRFinalPercentual + row.churnMRRFinalPercentual,
        churnNRR: acc.churnNRR + row.churnNRR,
        totalUpsellValue: acc.totalUpsellValue + row.totalUpsellValue,
      }),
      {
        revenueChurnBruto: 0,
        revenueChurnLiquido: 0,
        churnLiquidoUpsell: 0,
        logoChurnTotal: 0,
        logoChurnFinal: 0,
        nChurnTotal: 0,
        nChurnComercial: 0,
        nChurnOperacional: 0,
        upsellMRR: 0,
        churnMRRComercial: 0,
        mrrPerdidoOperacional: 0,
        mrrPerdidoTotal: 0,
        logoChurnComercial: 0,
        churnMRRBrutoPercentual: 0,
        churnMRRFinalPercentual: 0,
        churnNRR: 0,
        totalUpsellValue: 0,
      }
    );

    // Calculate averages for percentages if "Todos" is selected
    if (selectedSquad === "Todos") {
      const churnMRRBrutoPercentualCalc = mrrBaseTotal > 0 ? (totals.mrrPerdidoTotal / mrrBaseTotal) * 100 : 0;
      // Churn MRR (Final) = (MRR Perdido Total - MRR Perdido Comercial) / MRR Base Total * 100
      const churnMRRFinalPercentualCalc = mrrBaseTotal > 0 ? ((totals.mrrPerdidoTotal - totals.churnMRRComercial) / mrrBaseTotal) * 100 : 0;
      // Churn NRR = MRR Perdido / (MRR Base + Upsell)
      const mrrBaseComUpsell = mrrBaseTotal + totals.totalUpsellValue;
      const churnNRRCalc = mrrBaseComUpsell > 0 ? (totals.mrrPerdidoTotal / mrrBaseComUpsell) * 100 : 0;
      
      // Calcular Logo Churn corretamente: número de churns / total de clientes ativos (excluindo MRR Vendido)
      const logoChurnTotalCalc = totalActiveClients > 0 ? (totals.nChurnTotal / totalActiveClients) * 100 : 0;
      const logoChurnOperacionalCalc = totalActiveClients > 0 ? (totals.nChurnOperacional / totalActiveClients) * 100 : 0;
      const logoChurnComercialCalc = totalActiveClients > 0 ? (totals.nChurnComercial / totalActiveClients) * 100 : 0;
      
      return {
        revenueChurnBruto: totals.revenueChurnBruto / filteredData.length,
        revenueChurnLiquido: totals.revenueChurnLiquido / filteredData.length,
        churnLiquidoUpsell: totals.churnLiquidoUpsell / filteredData.length,
        logoChurnTotal: logoChurnTotalCalc,
        logoChurnFinal: logoChurnOperacionalCalc,
        nChurnTotal: totals.nChurnTotal,
        nChurnComercial: totals.nChurnComercial,
        nChurnOperacional: totals.nChurnOperacional,
        upsellMRR: totals.upsellMRR / filteredData.length,
        churnMRRComercial: totals.churnMRRComercial,
        mrrPerdidoOperacional: totals.mrrPerdidoOperacional,
        mrrPerdidoTotal: totals.mrrPerdidoTotal,
        logoChurnComercial: logoChurnComercialCalc,
        churnMRRBrutoPercentual: churnMRRBrutoPercentualCalc,
        churnMRRFinalPercentual: churnMRRFinalPercentualCalc,
        churnNRR: churnNRRCalc,
        totalUpsellValue: totals.totalUpsellValue,
        logoChurnTotalCalc,
        logoChurnOperacionalCalc,
        logoChurnComercialCalc,
      };
    }

    // Return single squad data
    // Quando um squad específico é selecionado, calcular os percentuais baseados no MRR base do squad
    const squadMrrBase = filteredData.length > 0 ? filteredData[0].mrrBaseTotal : 1;
    const churnMRRBrutoPercentualSquad = squadMrrBase > 0 ? (totals.mrrPerdidoTotal / squadMrrBase) * 100 : totals.churnMRRBrutoPercentual;
    const churnMRRFinalPercentualSquad = squadMrrBase > 0 ? ((totals.mrrPerdidoTotal - totals.churnMRRComercial) / squadMrrBase) * 100 : totals.churnMRRFinalPercentual;
    // Churn NRR para squad específico
    const squadMrrBaseComUpsell = squadMrrBase + totals.totalUpsellValue;
    const churnNRRSquad = squadMrrBaseComUpsell > 0 ? (totals.mrrPerdidoTotal / squadMrrBaseComUpsell) * 100 : totals.churnNRR;
    
    // Calcular Logo Churn para squad específico
    const squadName = filteredData.length > 0 ? filteredData[0].squad : '';
    const squadActiveClients = activeClientsBySquad[squadName] || 1;
    const logoChurnTotalSquad = squadActiveClients > 0 ? (totals.nChurnTotal / squadActiveClients) * 100 : 0;
    const logoChurnOperacionalSquad = squadActiveClients > 0 ? (totals.nChurnOperacional / squadActiveClients) * 100 : 0;
    const logoChurnComercialSquad = squadActiveClients > 0 ? (totals.nChurnComercial / squadActiveClients) * 100 : 0;
    
    return {
      ...totals,
      churnMRRBrutoPercentual: churnMRRBrutoPercentualSquad,
      churnMRRFinalPercentual: churnMRRFinalPercentualSquad,
      churnNRR: churnNRRSquad,
      logoChurnTotal: logoChurnTotalSquad,
      logoChurnFinal: logoChurnOperacionalSquad,
      logoChurnComercial: logoChurnComercialSquad,
      logoChurnTotalCalc: logoChurnTotalSquad,
      logoChurnOperacionalCalc: logoChurnOperacionalSquad,
      logoChurnComercialCalc: logoChurnComercialSquad,
    };
  };

  const metrics = calculateMetrics();

   // Calcular melhor e pior squad
   const squadComparison = churnDataFromDB.map(squad => ({
     squad: squad.squad,
     churn: squad.revenueChurnLiquido
   })).sort((a, b) => a.churn - b.churn);

  const bestSquad = squadComparison.length > 0 ? squadComparison[0] : { squad: '-', churn: 0 };
  const worstSquad = squadComparison.length > 0 ? squadComparison[squadComparison.length - 1] : { squad: '-', churn: 0 };

  // Função para popular histórico de meses anteriores (admin)
  const handlePopulateHistory = async () => {
    const loadingToast = toast.loading('Populando histórico mensal...');
    
    try {
      // Popular últimos 12 meses
      const promises = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        promises.push(
          supabase.rpc('update_monthly_churn_history', {
            target_month: month,
            target_year: year
          })
        );
      }
      
      await Promise.all(promises);
      
      toast.success('Histórico mensal atualizado com sucesso!', { id: loadingToast });
      
      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao popular histórico:', error);
      toast.error('Erro ao popular histórico', { id: loadingToast });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filtro de Período */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <MonthYearPicker
            selectedPeriods={[{ month: selectedMonth - 1, year: selectedYear }]}
            onPeriodsChange={(periods) => {
              if (periods.length > 0) {
                setSelectedMonth(periods[0].month + 1);
                setSelectedYear(periods[0].year);
              }
            }}
            singleSelect={true}
            minYear={2025}
            minMonth={11}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Squad:</span>
          <Select value={selectedSquad} onValueChange={setSelectedSquad}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione um squad" />
            </SelectTrigger>
            <SelectContent>
              {squads.map(squad => (
                <SelectItem key={squad} value={squad}>
                  {squad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Botão admin para popular histórico */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePopulateHistory}
                className="text-white"
              >
                <Activity className="h-4 w-4 mr-2" />
                Atualizar Histórico
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Popular/atualizar dados históricos dos últimos 12 meses</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Meta de Churn */}
      <Alert className="border-primary/50 bg-primary/5">
        <Target className="h-4 w-4" />
        <AlertDescription>
          <span className="font-semibold">Meta de Churn: até 10%</span>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="analises">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-8 mt-6">

      {/* Seção 1: Churn MRR */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Churn MRR</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 2 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="Churn MRR (Bruto)"
            value={`${metrics.churnMRRBrutoPercentual.toFixed(2)}%`}
            subtitle={`MRR Base: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrBaseTotal)}`}
            icon={TrendingDown}
            variant="default"
            iconColor="text-red-500"
            valueClassName={getChurnColorClass(metrics.churnMRRBrutoPercentual)}
          />
          <KPICard
            title="Churn MRR (Final)"
            value={`${metrics.churnMRRFinalPercentual.toFixed(2)}%`}
            subtitle={`MRR Perdido - MRR Comercial / MRR Base`}
            icon={DollarSign}
            variant="default"
            iconColor="text-orange-500"
            valueClassName={getChurnColorClass(metrics.churnMRRFinalPercentual)}
          />
        </ResponsiveGrid>
      </div>

      {/* Seção 2: Upsell e NRR */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Crescimento e NRR</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 2 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="Upsell Total"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalUpsellValue)}
            subtitle={`Squad: ${selectedSquad}`}
            icon={TrendingUp}
            variant="default"
            iconColor="text-green-500"
          />
          <KPICard
            title="Churn NRR (Bruto)"
            value={`${metrics.churnNRR.toFixed(2)}%`}
            subtitle={`MRR Perdido / (MRR Base + Upsell): R$ ${(mrrBaseTotal + metrics.totalUpsellValue).toLocaleString('pt-BR')}`}
            icon={Activity}
            variant="default"
            iconColor="text-amber-500"
            valueClassName={getChurnColorClass(metrics.churnNRR)}
          />
        </ResponsiveGrid>
      </div>

      {/* Seção 3: Logo Churn */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Logo Churn</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 2 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="Logo Churn (Bruto)"
            value={`${metrics.logoChurnTotal.toFixed(2)}%`}
            subtitle={`Squad: ${selectedSquad}`}
            icon={AlertTriangle}
            variant="default"
            iconColor="text-red-600"
            valueClassName={getChurnColorClass(metrics.logoChurnTotal)}
          />
          <KPICard
            title="Logo Churn (Final)"
            value={`${metrics.logoChurnFinal.toFixed(2)}%`}
            subtitle={`Squad: ${selectedSquad}`}
            icon={TrendingDown}
            variant="default"
            iconColor="text-red-700"
            valueClassName={getChurnColorClass(metrics.logoChurnFinal)}
          />
        </ResponsiveGrid>
      </div>

      {/* Seção 4: Churn Comercial */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Churn Comercial</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 2 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="Churn MRR (Comercial)"
            value={`${metrics.churnMRRComercial.toFixed(2)}%`}
            subtitle={`Squad: ${selectedSquad}`}
            icon={DollarSign}
            variant="default"
            iconColor="text-blue-500"
            valueClassName={getChurnColorClass(metrics.churnMRRComercial)}
          />
          <KPICard
            title="Logo Churn (Comercial)"
            value={`${metrics.logoChurnComercial.toFixed(2)}%`}
            subtitle={`Squad: ${selectedSquad}`}
            icon={AlertTriangle}
            variant="default"
            iconColor="text-blue-600"
            valueClassName={getChurnColorClass(metrics.logoChurnComercial)}
          />
        </ResponsiveGrid>
      </div>

      {/* Seção 5: Número de Churns */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Quantidade de Churns</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 3 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="N de Churn Operacional"
            value={metrics.nChurnOperacional.toString()}
            subtitle={`Squad: ${selectedSquad}`}
            icon={Users}
            variant="default"
            iconColor="text-purple-500"
          />
          <KPICard
            title="N de Churn Comercial"
            value={metrics.nChurnComercial.toString()}
            subtitle={`Squad: ${selectedSquad}`}
            icon={Users}
            variant="default"
            iconColor="text-blue-500"
          />
          <KPICard
            title="N de Churn Total"
            value={metrics.nChurnTotal.toString()}
            subtitle={`Squad: ${selectedSquad}`}
            icon={Users}
            variant="default"
            iconColor="text-red-500"
          />
        </ResponsiveGrid>
      </div>

      {/* Seção 6: MRR Perdido */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">MRR Perdido</h3>
        <ResponsiveGrid 
          cols={{ default: 1, md: 3 }}
          gap={{ default: 6 }}
        >
          <KPICard
            title="MRR Perdido Operacional"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrrPerdidoOperacional)}
            subtitle={`Squad: ${selectedSquad}`}
            icon={DollarSign}
            variant="default"
            iconColor="text-purple-600"
          />
          <KPICard
            title="MRR Perdido Comercial"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.churnMRRComercial)}
            subtitle={`Squad: ${selectedSquad}`}
            icon={DollarSign}
            variant="default"
            iconColor="text-blue-600"
          />
          <KPICard
            title="MRR Perdido Total"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrrPerdidoTotal)}
            subtitle={`Squad: ${selectedSquad}`}
            icon={DollarSign}
            variant="default"
            iconColor="text-red-600"
          />
        </ResponsiveGrid>
      </div>
        </TabsContent>

        <TabsContent value="analises" className="space-y-8 mt-6">
          {/* Comparação entre Squads */}
          {selectedSquad === "Todos" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Comparação de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6 justify-around">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white px-3 py-1">
                      Melhor Squad
                    </Badge>
                    <div>
                      <p className="font-bold text-lg">{bestSquad.squad}</p>
                      <p className="text-sm text-muted-foreground">
                        {bestSquad.churn.toFixed(2)}% de churn
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="px-3 py-1">
                      Pior Squad
                    </Badge>
                    <div>
                      <p className="font-bold text-lg">{worstSquad.squad}</p>
                      <p className="text-sm text-muted-foreground">
                        {worstSquad.churn.toFixed(2)}% de churn
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráfico de Tendência Temporal - TODO: alimentar com dados reais da tabela churn_monthly_history */}

          {/* Gráficos de Churn por Mês - TODO: alimentar com dados reais da tabela churn_monthly_history */}
        </TabsContent>
      </Tabs>
    </div>
  );
};
