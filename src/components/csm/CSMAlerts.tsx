import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSMAlert {
  id: string;
  card_id: string;
  alert_type: "health_score_baixo" | "renovacao_proxima" | "health_score_critico";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export const CSMAlerts = () => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["csm-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_alerts")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CSMAlert[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("crm_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csm-alerts"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("crm_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csm-alerts"] });
      toast.success("Alerta resolvido com sucesso");
    },
  });

  const getPriorityIcon = (priority: CSMAlert["priority"]) => {
    switch (priority) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: CSMAlert["priority"]) => {
    const variants: Record<CSMAlert["priority"], string> = {
      critical: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };

    const labels: Record<CSMAlert["priority"], string> = {
      critical: "Crítico",
      high: "Alto",
      medium: "Médio",
      low: "Baixo",
    };

    return (
      <Badge variant={variants[priority] as any} className="text-xs">
        {labels[priority]}
      </Badge>
    );
  };

  const getAlertTypeLabel = (type: CSMAlert["alert_type"]) => {
    const labels: Record<CSMAlert["alert_type"], string> = {
      health_score_critico: "Health Score Crítico",
      health_score_baixo: "Health Score Baixo",
      renovacao_proxima: "Renovação Próxima",
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas CSM</CardTitle>
          <CardDescription>Acompanhe alertas críticos de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando alertas...</p>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = alerts?.filter((a) => !a.is_read).length || 0;
  const criticalCount = alerts?.filter((a) => a.priority === "critical").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alertas CSM</CardTitle>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} alertas não lidos` : "Nenhum alerta pendente"}
              {criticalCount > 0 && ` • ${criticalCount} críticos`}
            </CardDescription>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalCount} Críticos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhum alerta no momento. Todos os clientes estão em dia!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    alert.is_read ? "bg-background" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">{getPriorityIcon(alert.priority)}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold">{alert.title}</h4>
                          {getPriorityBadge(alert.priority)}
                          <Badge variant="outline" className="text-xs">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markAsReadMutation.mutate(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => resolveMutation.mutate(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
