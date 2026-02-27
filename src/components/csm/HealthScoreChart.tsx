import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface HealthScoreChartProps {
  cardId: string;
}

export const HealthScoreChart = ({ cardId }: HealthScoreChartProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["health-score-history", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_health_score_history")
        .select("*")
        .eq("card_id", cardId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Health Score</CardTitle>
          <CardDescription>Evolução ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Health Score</CardTitle>
          <CardDescription>Evolução ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum histórico disponível. O histórico será criado automaticamente quando o health score for atualizado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = history.map((record) => ({
    date: format(new Date(record.recorded_at), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(record.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    score: record.health_score,
  }));

  const getTrend = () => {
    if (history.length < 2) return "neutral";
    const lastScore = history[history.length - 1].health_score;
    const previousScore = history[history.length - 2].health_score;
    if (lastScore > previousScore) return "up";
    if (lastScore < previousScore) return "down";
    return "neutral";
  };

  const trend = getTrend();
  const latestScore = history[history.length - 1]?.health_score;
  const oldestScore = history[0]?.health_score;
  const totalChange = latestScore - oldestScore;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Health Score</CardTitle>
            <CardDescription>Evolução ao longo do tempo</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend === "up" && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">+{totalChange}</span>
              </div>
            )}
            {trend === "down" && (
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">{totalChange}</span>
              </div>
            )}
            {trend === "neutral" && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="h-4 w-4" />
                <span className="text-sm font-medium">Estável</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {payload[0].payload.fullDate}
                          </span>
                          <span className="font-bold text-foreground">
                            Score: {payload[0].value}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{
                fill: "hsl(var(--primary))",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: "hsl(var(--primary))",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
