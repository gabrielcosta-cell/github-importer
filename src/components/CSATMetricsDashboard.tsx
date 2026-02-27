import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/external-client";
import { CSATGaugeChart } from "@/components/charts/CSATGaugeChart";
import { CSATDonutChart } from "@/components/charts/CSATDonutChart";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { BarChart3, Trophy } from "lucide-react";

interface Squad {
  id: string;
  name: string;
  color: string;
}

interface CSATResponse {
  id: string;
  nota_atendimento: number;
  nota_conteudo: number;
  nota_performance: number;
  recomendacao: number;
  tipo_reuniao: string | null;
  squad: string | null;
  created_at: string;
  card_id: string | null;
}

interface CSATData {
  satisfeitos: number;
  neutros: number;
  insatisfeitos: number;
  satisfeitosCount: number;
  neutrosCount: number;
  insatisfeitosCount: number;
  total: number;
  averageScore: number;
}

export const CSATMetricsDashboard = () => {
  const [selectedSquad, setSelectedSquad] = useState<string>("geral");
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>("todos");
  const [squads, setSquads] = useState<Squad[]>([]);
  const [allResponses, setAllResponses] = useState<CSATResponse[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"metricas" | "ranking">("metricas");
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);

  // Fetch squads and CSAT data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch squads
        const { data: squadsData, error: squadsError } = await supabase
          .from('squads')
          .select('id, name, color')
          .eq('is_active', true)
          .order('position');

        if (squadsError) throw squadsError;
        // Filter out Atlas and Aurora squads
        const filteredSquads = (squadsData || []).filter(
          squad => !['Atlas', 'Aurora'].includes(squad.name)
        );
        setSquads(filteredSquads);

        // Fetch CSAT responses
        const { data: csatResponses, error: csatError } = await supabase
          .from('csat_responses')
          .select('id, nota_atendimento, nota_conteudo, nota_performance, recomendacao, tipo_reuniao, squad, created_at, card_id');

        if (csatError) throw csatError;
        
        setAllResponses(csatResponses || []);
        
        // Extract unique meeting types
        const types = [...new Set((csatResponses || []).map(r => r.tipo_reuniao).filter(Boolean))] as string[];
        setMeetingTypes(types);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real-time subscription for CSAT responses
  useEffect(() => {
    const channel = supabase
      .channel('csat-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'csat_responses'
        },
        async () => {
          // Refresh data on any change
          const { data } = await supabase
            .from('csat_responses')
            .select('id, nota_atendimento, nota_conteudo, nota_performance, recomendacao, tipo_reuniao, squad, created_at, card_id');
          if (data) {
            setAllResponses(data);
            const types = [...new Set(data.map(r => r.tipo_reuniao).filter(Boolean))] as string[];
            setMeetingTypes(types);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter responses by period and meeting type
  const filteredResponses = useMemo(() => {
    let filtered = allResponses;
    
    // Filter by period
    if (selectedPeriod.length > 0) {
      filtered = filtered.filter(response => {
        const date = new Date(response.created_at);
        const resMonth = date.getMonth();
        const resYear = date.getFullYear();
        return selectedPeriod.some(p => p.month === resMonth && p.year === resYear);
      });
    }
    
    // Filter by meeting type
    if (selectedMeetingType !== "todos") {
      filtered = filtered.filter(r => r.tipo_reuniao === selectedMeetingType);
    }
    
    return filtered;
  }, [allResponses, selectedPeriod, selectedMeetingType]);

  // Calculate score for a response based on meeting type
  const calculateScore = (response: CSATResponse): number => {
    if (response.tipo_reuniao === "Check-in") {
      // Average of 3 scores
      return (response.nota_atendimento + response.nota_conteudo + response.nota_performance) / 3;
    } else {
      // Use recomendacao for other meeting types
      return response.recomendacao || 3; // Default to neutral if no score
    }
  };

  // Get category based on score (1-5 scale)
  // Satisfeito: 4-5, Neutro: 3, Insatisfeito: 1-2
  const getCategory = (score: number): 'satisfeito' | 'neutro' | 'insatisfeito' => {
    if (score <= 2) return 'insatisfeito';
    if (score <= 3) return 'neutro';
    return 'satisfeito'; // 4-5
  };

  const calculateCSATData = (responses: CSATResponse[]): CSATData => {
    if (responses.length === 0) {
      return { 
        satisfeitos: 0, neutros: 0, insatisfeitos: 0, 
        satisfeitosCount: 0, neutrosCount: 0, insatisfeitosCount: 0,
        total: 0, averageScore: 0 
      };
    }

    const scores = responses.map(r => calculateScore(r));
    // Satisfeitos: notas >= 4 (4 e 5)
    const satisfeitosCount = scores.filter(s => s >= 4).length;
    // Neutros: nota 3 (entre 2.5 e 3.5 para considerar arredondamento)
    const neutrosCount = scores.filter(s => s >= 2.5 && s < 4).length;
    // Insatisfeitos: notas 1-2 (menor que 2.5)
    const insatisfeitosCount = scores.filter(s => s < 2.5).length;
    const total = responses.length;

    const satisfeitos = Math.round((satisfeitosCount / total) * 100);
    const neutros = Math.round((neutrosCount / total) * 100);
    const insatisfeitos = Math.round((insatisfeitosCount / total) * 100);
    
    // CSAT Score = % de clientes satisfeitos (notas 4-5) / total de respondentes
    const csatScore = (satisfeitosCount / total) * 100;

    return {
      satisfeitos,
      neutros,
      insatisfeitos,
      satisfeitosCount,
      neutrosCount,
      insatisfeitosCount,
      total,
      averageScore: csatScore // Agora é a porcentagem de satisfeitos (0-100)
    };
  };

  // Calculate CSAT data based on selected squad
  const csatData = useMemo(() => {
    if (selectedSquad === "geral") {
      return calculateCSATData(filteredResponses);
    }
    const squadResponses = filteredResponses.filter(r => 
      r.squad?.toLowerCase() === selectedSquad.toLowerCase()
    );
    return calculateCSATData(squadResponses);
  }, [filteredResponses, selectedSquad]);

  // Calculate CSAT for all squads (for comparison)
  const squadsCSATData = useMemo(() => {
    const data: Record<string, CSATData> = {};
    data['geral'] = calculateCSATData(filteredResponses);
    
    squads.forEach(squad => {
      const squadResponses = filteredResponses.filter(r => 
        r.squad?.toLowerCase() === squad.name.toLowerCase()
      );
      data[squad.name.toLowerCase()] = calculateCSATData(squadResponses);
    });
    
    return data;
  }, [filteredResponses, squads]);

  const getSquadDisplayName = (squadKey: string) => {
    if (squadKey === 'geral') return 'Geral';
    const squad = squads.find(s => s.name.toLowerCase() === squadKey.toLowerCase());
    return squad ? squad.name : squadKey.charAt(0).toUpperCase() + squadKey.slice(1);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard CSAT</h2>
          <p className="text-muted-foreground mt-1">
            Customer Satisfaction Score - Análise de satisfação dos clientes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMeetingType} onValueChange={setSelectedMeetingType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de reunião" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {meetingTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MonthYearPicker
            selectedPeriods={selectedPeriod}
            onPeriodsChange={setSelectedPeriod}
            singleSelect
          />
        </div>
      </div>

      {/* View Toggle and Squad Filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={activeView === "metricas" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("metricas")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Métricas
            </Button>
            <Button
              variant={activeView === "ranking" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("ranking")}
              className="gap-2"
            >
              <Trophy className="h-4 w-4" />
              Ranking
            </Button>
          </div>

          {/* Squad Filter - Only in Métricas view */}
          {activeView === "metricas" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filtrar por Squad:</span>
              <ToggleGroup 
                type="single" 
                value={selectedSquad} 
                onValueChange={(value) => value && setSelectedSquad(value)}
                className="flex-wrap justify-start"
              >
                <ToggleGroupItem value="geral" className="text-xs">
                  Geral
                </ToggleGroupItem>
                {squads.map(squad => (
                  <ToggleGroupItem 
                    key={squad.id} 
                    value={squad.name.toLowerCase()} 
                    className="text-xs"
                  >
                    {squad.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        </div>
      </Card>

      {/* Métricas View */}
      {activeView === "metricas" && (
        <>
          {/* Main Dashboard Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Column - Percentages */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* % Satisfeitos */}
              <Card className="bg-[#10b981] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Satisfeitos</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${csatData.satisfeitos}%`}</p>
                </CardContent>
              </Card>
              
              {/* % Neutros */}
              <Card className="bg-[#f59e0b] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Neutros</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${csatData.neutros}%`}</p>
                </CardContent>
              </Card>
              
              {/* % Insatisfeitos */}
              <Card className="bg-[#ef4444] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Insatisfeitos</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${csatData.insatisfeitos}%`}</p>
                </CardContent>
              </Card>
            </div>

            {/* Second Column - Quantities */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Qtd Satisfeitos */}
              <Card className="bg-[#10b981] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Satisfeitos</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : csatData.satisfeitosCount}</p>
                </CardContent>
              </Card>
              
              {/* Qtd Neutros */}
              <Card className="bg-[#f59e0b] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Neutros</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : csatData.neutrosCount}</p>
                </CardContent>
              </Card>
              
              {/* Qtd Insatisfeitos */}
              <Card className="bg-[#ef4444] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Insatisfeitos</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : csatData.insatisfeitosCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Third Column - CSAT Score & Gauge */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <p className="text-sm font-medium text-muted-foreground mb-2">CSAT Score</p>
                  <p className="text-lg text-muted-foreground mb-4">{getSquadDisplayName(selectedSquad)}</p>
                  {!loading && (
                    <CSATGaugeChart 
                      score={csatData.averageScore} 
                      size={260} 
                      tooltipContent={csatData.total === 0 ? (
                        <p className="text-xs">Nenhuma resposta neste período</p>
                      ) : undefined}
                    />
                  )}
                  {loading && (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-muted-foreground">Carregando...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fourth Column - Donut Chart */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Distribuição CSAT</p>
                  {!loading && (
                    <CSATDonutChart
                      satisfeitos={csatData.satisfeitos}
                      neutros={csatData.neutros}
                      insatisfeitos={csatData.insatisfeitos}
                      satisfeitosCount={csatData.satisfeitosCount}
                      neutrosCount={csatData.neutrosCount}
                      insatisfeitosCount={csatData.insatisfeitosCount}
                      size={220}
                    />
                  )}
                  {loading && (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-muted-foreground">Carregando...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Ranking View */}
      {activeView === "ranking" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ranking por Squad</h3>
            <div className="space-y-3">
              {[...squads]
                .map(squad => ({
                  squad,
                  data: squadsCSATData[squad.name.toLowerCase()] || { averageScore: 0, total: 0, satisfeitosCount: 0, neutrosCount: 0, insatisfeitosCount: 0 }
                }))
                .sort((a, b) => {
                  // Primary sort by average score (highest first)
                  if (b.data.averageScore !== a.data.averageScore) {
                    return b.data.averageScore - a.data.averageScore;
                  }
                  // Tiebreaker: more satisfeitos wins
                  if (b.data.satisfeitosCount !== a.data.satisfeitosCount) {
                    return b.data.satisfeitosCount - a.data.satisfeitosCount;
                  }
                  // If no satisfeitos difference: fewer insatisfeitos wins
                  return a.data.insatisfeitosCount - b.data.insatisfeitosCount;
                })
                .map(({ squad, data }, index) => (
                  <div 
                    key={squad.id} 
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    {/* Ranking Position */}
                    <div 
                      className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#cd7f32' : 'hsl(var(--muted))',
                        color: index < 3 ? '#000' : 'hsl(var(--muted-foreground))'
                      }}
                    >
                      {index + 1}º
                    </div>

                    {/* Squad Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: squad.color }}
                      />
                      <span className="font-medium truncate">{squad.name}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex gap-2">
                        <span className="text-[#10b981]">{data.satisfeitosCount}S</span>
                        <span className="text-[#f59e0b]">{data.neutrosCount}N</span>
                        <span className="text-[#ef4444]">{data.insatisfeitosCount}I</span>
                      </div>
                      <span className="text-muted-foreground">
                        {data.satisfeitosCount + data.neutrosCount + data.insatisfeitosCount} respostas
                      </span>
                    </div>

                    {/* CSAT Score */}
                    <span 
                      className="text-2xl font-bold min-w-[60px] text-right"
                      style={{ 
                        color: data.averageScore > 3 ? '#10b981' : 
                               data.averageScore > 2 ? '#f59e0b' : '#ef4444' 
                      }}
                    >
                      {data.averageScore.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Responses Card - Only in Métricas view */}
      {activeView === "metricas" && (
        <div className="flex justify-end">
          <Card className="w-auto">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Total de respostas:</span>
              <span className="text-2xl font-bold">{csatData.total}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
