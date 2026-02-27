import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NPSGaugeChart } from "@/components/charts/NPSGaugeChart";
import { NPSDonutChart } from "@/components/charts/NPSDonutChart";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { BarChart3, Trophy } from "lucide-react";

interface Squad {
  id: string;
  name: string;
  color: string;
}

interface NPSResponseRaw {
  id: string;
  recomendacao: number;
  squad: string | null;
  created_at: string;
  card_id: string | null;
  csm_cards: { squad: string | null } | { squad: string | null }[] | null;
}

interface NPSResponse {
  id: string;
  recomendacao: number;
  squad: string | null;
  created_at: string;
}

interface NPSData {
  promotores: number;
  neutros: number;
  detratores: number;
  promotoresCount: number;
  neutrosCount: number;
  detratoresCount: number;
  total: number;
  score: number;
}

export const CustomerSuccessDashboard = () => {
  const [selectedSquad, setSelectedSquad] = useState<string>("geral");
  const [squads, setSquads] = useState<Squad[]>([]);
  const [allResponses, setAllResponses] = useState<NPSResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"metricas" | "ranking">("metricas");
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }[]>([
    { month: new Date().getMonth(), year: new Date().getFullYear() }
  ]);

  // Fetch squads and NPS data
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
          (squad: Squad) => !['Atlas', 'Aurora'].includes(squad.name)
        );
        setSquads(filteredSquads);

        // Fetch NPS responses with CSM card squad
        const { data: npsResponses, error: npsError } = await supabase
          .from('nps_responses')
          .select('id, recomendacao, squad, created_at, card_id, csm_cards(squad)');

        if (npsError) throw npsError;
        
        // Process responses to use CSM card squad when nps_responses.squad is null
        const processedResponses: NPSResponse[] = (npsResponses || []).map((r: NPSResponseRaw) => {
          // Handle csm_cards which could be an object, array, or null
          let csmCardSquad: string | null = null;
          if (r.csm_cards) {
            if (Array.isArray(r.csm_cards) && r.csm_cards.length > 0) {
              csmCardSquad = r.csm_cards[0].squad;
            } else if (!Array.isArray(r.csm_cards)) {
              csmCardSquad = r.csm_cards.squad;
            }
          }
          return {
            id: r.id,
            recomendacao: r.recomendacao,
            squad: r.squad || csmCardSquad,
            created_at: r.created_at
          };
        });
        
        setAllResponses(processedResponses);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real-time subscription for NPS responses
  useEffect(() => {
    const fetchResponseWithSquad = async (id: string): Promise<NPSResponse | null> => {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('id, recomendacao, squad, created_at, card_id, csm_cards(squad)')
        .eq('id', id)
        .single();
      
      if (error || !data) return null;
      
      const r = data as NPSResponseRaw;
      let csmCardSquad: string | null = null;
      if (r.csm_cards) {
        if (Array.isArray(r.csm_cards) && r.csm_cards.length > 0) {
          csmCardSquad = r.csm_cards[0].squad;
        } else if (!Array.isArray(r.csm_cards)) {
          csmCardSquad = r.csm_cards.squad;
        }
      }
      return {
        id: r.id,
        recomendacao: r.recomendacao,
        squad: r.squad || csmCardSquad,
        created_at: r.created_at
      };
    };

    const channel = supabase
      .channel('nps-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nps_responses'
        },
        async (payload) => {
          const newId = (payload.new as { id: string }).id;
          const newResponse = await fetchResponseWithSquad(newId);
          if (newResponse) {
            setAllResponses(prev => [...prev, newResponse]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nps_responses'
        },
        async (payload) => {
          const updatedId = (payload.new as { id: string }).id;
          const updatedResponse = await fetchResponseWithSquad(updatedId);
          if (updatedResponse) {
            setAllResponses(prev => 
              prev.map(r => r.id === updatedResponse.id ? updatedResponse : r)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'nps_responses'
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setAllResponses(prev => prev.filter(r => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter responses by period
  const filteredResponses = useMemo(() => {
    if (selectedPeriod.length === 0) return allResponses;
    
    return allResponses.filter(response => {
      const date = new Date(response.created_at);
      const resMonth = date.getMonth();
      const resYear = date.getFullYear();
      return selectedPeriod.some(p => p.month === resMonth && p.year === resYear);
    });
  }, [allResponses, selectedPeriod]);

  const calculateNPSData = (responses: NPSResponse[]): NPSData => {
    if (responses.length === 0) {
      return { 
        promotores: 0, neutros: 0, detratores: 0, 
        promotoresCount: 0, neutrosCount: 0, detratoresCount: 0,
        total: 0, score: 0 
      };
    }

    const promotoresCount = responses.filter(r => r.recomendacao >= 9).length;
    const neutrosCount = responses.filter(r => r.recomendacao >= 7 && r.recomendacao <= 8).length;
    const detratoresCount = responses.filter(r => r.recomendacao <= 6).length;
    const total = responses.length;

    const promotores = Math.round((promotoresCount / total) * 100);
    const neutros = Math.round((neutrosCount / total) * 100);
    const detratores = Math.round((detratoresCount / total) * 100);
    const score = promotores - detratores;

    return {
      promotores,
      neutros,
      detratores,
      promotoresCount,
      neutrosCount,
      detratoresCount,
      total,
      score
    };
  };

  // Calculate NPS data based on selected squad
  const npsData = useMemo(() => {
    if (selectedSquad === "geral") {
      return calculateNPSData(filteredResponses);
    }
    const squadResponses = filteredResponses.filter(r => 
      r.squad?.toLowerCase() === selectedSquad.toLowerCase()
    );
    return calculateNPSData(squadResponses);
  }, [filteredResponses, selectedSquad]);

  // Calculate NPS for all squads (for comparison)
  const squadsNPSData = useMemo(() => {
    const data: Record<string, NPSData> = {};
    data['geral'] = calculateNPSData(filteredResponses);
    
    squads.forEach(squad => {
      const squadResponses = filteredResponses.filter(r => 
        r.squad?.toLowerCase() === squad.name.toLowerCase()
      );
      data[squad.name.toLowerCase()] = calculateNPSData(squadResponses);
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
          <h2 className="text-3xl font-bold tracking-tight">Dashboard NPS</h2>
          <p className="text-muted-foreground mt-1">
            Net Promoter Score - Análise de satisfação dos clientes
          </p>
        </div>
        <div className="flex items-center gap-4">
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
              {/* % Promotores */}
              <Card className="bg-[#10b981] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Promotores</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${npsData.promotores}%`}</p>
                </CardContent>
              </Card>
              
              {/* % Neutros */}
              <Card className="bg-[#f59e0b] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Neutros</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${npsData.neutros}%`}</p>
                </CardContent>
              </Card>
              
              {/* % Detratores */}
              <Card className="bg-[#ef4444] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">% Detratores</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : `${npsData.detratores}%`}</p>
                </CardContent>
              </Card>
            </div>

            {/* Second Column - Quantities */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Qtd Promotores */}
              <Card className="bg-[#10b981] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Promotores</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : npsData.promotoresCount}</p>
                </CardContent>
              </Card>
              
              {/* Qtd Neutros */}
              <Card className="bg-[#f59e0b] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Neutros</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : npsData.neutrosCount}</p>
                </CardContent>
              </Card>
              
              {/* Qtd Detratores */}
              <Card className="bg-[#ef4444] text-white flex-1">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium opacity-90">Qtd Detratores</p>
                  <p className="text-4xl font-bold mt-2">{loading ? "..." : npsData.detratoresCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Third Column - NPS Score & Gauge */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <p className="text-sm font-medium text-muted-foreground mb-2">NPS Score</p>
                  <p className="text-lg text-muted-foreground mb-4">{getSquadDisplayName(selectedSquad)}</p>
                  {!loading && (
                    <NPSGaugeChart 
                      score={npsData.score} 
                      size={260} 
                      tooltipContent={npsData.score === 0 && npsData.total > 0 ? (
                        <p className="text-xs">
                          <span className="font-medium">Equilíbrio:</span> promotores ({npsData.promotores}%) e detratores ({npsData.detratores}%) estão iguais
                        </p>
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
                  <p className="text-sm font-medium text-muted-foreground mb-4">Distribuição NPS</p>
                  {!loading && (
                    <NPSDonutChart
                      promotores={npsData.promotores}
                      neutros={npsData.neutros}
                      detratores={npsData.detratores}
                      promotoresCount={npsData.promotoresCount}
                      neutrosCount={npsData.neutrosCount}
                      detratoresCount={npsData.detratoresCount}
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
                  data: squadsNPSData[squad.name.toLowerCase()] || { score: 0, total: 0, promotoresCount: 0, neutrosCount: 0, detratoresCount: 0 }
                }))
                .sort((a, b) => {
                  // Primary sort by score (highest first)
                  if (b.data.score !== a.data.score) {
                    return b.data.score - a.data.score;
                  }
                  // Tiebreaker for score 0: more promoters wins
                  if (a.data.score === 0 && b.data.score === 0) {
                    if (b.data.promotoresCount !== a.data.promotoresCount) {
                      return b.data.promotoresCount - a.data.promotoresCount;
                    }
                    // If no promoters difference: fewer detractors wins
                    if (a.data.detratoresCount !== b.data.detratoresCount) {
                      return a.data.detratoresCount - b.data.detratoresCount;
                    }
                    // If no detractors difference: more neutral wins
                    return b.data.neutrosCount - a.data.neutrosCount;
                  }
                  return 0;
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
                        <span className="text-[#10b981]">{data.promotoresCount}P</span>
                        <span className="text-[#f59e0b]">{data.neutrosCount}N</span>
                        <span className="text-[#ef4444]">{data.detratoresCount}D</span>
                      </div>
                      <span className="text-muted-foreground">
                        {data.promotoresCount + data.neutrosCount + data.detratoresCount} respostas
                      </span>
                    </div>

                    {/* NPS Score */}
                    <span 
                      className="text-2xl font-bold min-w-[60px] text-right"
                      style={{ 
                        color: data.score >= 50 ? '#10b981' : 
                               data.score >= 0 ? '#f59e0b' : '#ef4444' 
                      }}
                    >
                      {data.score}
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
              <span className="text-2xl font-bold">{npsData.total}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
