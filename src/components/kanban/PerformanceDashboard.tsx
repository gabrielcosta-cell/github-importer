import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

interface PerformanceRecord {
  id: string;
  performance_type: string;
  performance_value: string;
  performance_month: number;
  performance_year: number;
  created_at: string;
}

interface PerformanceDashboardProps {
  performanceHistory: PerformanceRecord[];
}

const PERFORMANCE_TYPES = [
  { value: "receita_gerada", label: "Receita gerada ao cliente", color: "#10b981" },
  { value: "investimento_midia", label: "Total investido em mídia", color: "#f59e0b" },
  { value: "teve_vendas", label: "Já teve vendas", color: "#3b82f6" },
  { value: "quantidade_vendas", label: "Quantidade de vendas", color: "#8b5cf6" },
  { value: "teve_roas", label: "Já teve ROAS", color: "#ec4899" },
  { value: "teve_roi", label: "Já teve ROI", color: "#06b6d4" },
];

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export function PerformanceDashboard({ performanceHistory }: PerformanceDashboardProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set(performanceHistory.map(r => r.performance_year));
    return Array.from(years).sort((a, b) => b - a);
  }, [performanceHistory]);

  // Transform data for line chart (evolution over time)
  const lineChartData = useMemo(() => {
    const data: any[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthData: any = {
        month: MONTHS[month - 1],
        monthNum: month,
      };

      PERFORMANCE_TYPES.forEach(type => {
        const record = performanceHistory.find(
          r => r.performance_type === type.value && 
               r.performance_month === month && 
               r.performance_year === selectedYear
        );
        
        if (record) {
          // Try to parse as number, fallback to 0
          const value = parseFloat(record.performance_value.replace(/[^\d.-]/g, '')) || 0;
          monthData[type.value] = value;
        }
      });

      // Only add month if it has data
      if (Object.keys(monthData).length > 2) {
        data.push(monthData);
      }
    }

    return data;
  }, [performanceHistory, selectedYear]);

  // Transform data for bar chart (comparison between metrics)
  const barChartData = useMemo(() => {
    const data: any[] = [];

    PERFORMANCE_TYPES.forEach(type => {
      const records = performanceHistory.filter(
        r => r.performance_type === type.value && r.performance_year === selectedYear
      );

      if (records.length > 0) {
        // Calculate average or sum based on metric type
        const values = records.map(r => parseFloat(r.performance_value.replace(/[^\d.-]/g, '')) || 0);
        const total = values.reduce((sum, val) => sum + val, 0);
        const average = total / values.length;

        data.push({
          name: type.label,
          value: average,
          total: total,
          color: type.color,
        });
      }
    });

    return data;
  }, [performanceHistory, selectedYear]);

  // Filter line chart data based on selected metric
  const filteredLineChartData = useMemo(() => {
    if (selectedMetric === "all") return lineChartData;
    
    return lineChartData.map(monthData => {
      const filtered: any = {
        month: monthData.month,
        monthNum: monthData.monthNum,
      };
      
      if (monthData[selectedMetric] !== undefined) {
        filtered[selectedMetric] = monthData[selectedMetric];
      }
      
      return filtered;
    }).filter(d => Object.keys(d).length > 2);
  }, [lineChartData, selectedMetric]);

  const selectedMetricConfig = PERFORMANCE_TYPES.find(t => t.value === selectedMetric);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione uma métrica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as métricas</SelectItem>
            {PERFORMANCE_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <Tabs defaultValue="line" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="line" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="bar" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Comparação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="line" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedMetric === "all" 
                  ? `Evolução das Métricas - ${selectedYear}`
                  : `${selectedMetricConfig?.label} - ${selectedYear}`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredLineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                    
                    {selectedMetric === "all" ? (
                      PERFORMANCE_TYPES.map(type => (
                        <Line
                          key={type.value}
                          type="monotone"
                          dataKey={type.value}
                          name={type.label}
                          stroke={type.color}
                          strokeWidth={2}
                          dot={{ fill: type.color, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))
                    ) : (
                      <Line
                        type="monotone"
                        dataKey={selectedMetric}
                        name={selectedMetricConfig?.label}
                        stroke={selectedMetricConfig?.color}
                        strokeWidth={3}
                        dot={{ fill: selectedMetricConfig?.color, r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para o ano selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Comparação de Métricas - Média de {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [value.toFixed(2), "Média"]}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para comparação
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
