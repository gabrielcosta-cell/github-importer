import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PerformanceDashboard } from "./PerformanceDashboard";

interface PerformanceRecord {
  id: string;
  performance_type: string;
  performance_value: string;
  performance_month: number;
  performance_year: number;
  created_at: string;
}

interface PerformanceManagerProps {
  cardId: string;
  performanceHistory: PerformanceRecord[];
}

const PERFORMANCE_TYPES = [
  { value: "receita_gerada", label: "Receita gerada ao cliente" },
  { value: "investimento_midia", label: "Total investido em mídia" },
  { value: "teve_vendas", label: "Já teve vendas" },
  { value: "quantidade_vendas", label: "Quantidade de vendas" },
  { value: "teve_roas", label: "Já teve ROAS" },
  { value: "teve_roi", label: "Já teve ROI" },
];

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function PerformanceManager({ cardId, performanceHistory }: PerformanceManagerProps) {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [editingType, setEditingType] = useState<string | null>(null);
  const [performanceValue, setPerformanceValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleAddPerformance = async (type: string) => {
    if (!performanceValue || !selectedMonth || !selectedYear) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check if record exists for this month/year/type
      const { data: existing } = await supabase
        .from("crm_card_performance_history")
        .select("id")
        .eq("card_id", cardId)
        .eq("performance_type", type)
        .eq("performance_month", selectedMonth)
        .eq("performance_year", selectedYear)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("crm_card_performance_history")
          .update({
            performance_value: performanceValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;

        // Log history
        await supabase.from("crm_activities").insert({
          card_id: cardId,
          activity_type: "note",
          title: "Performance atualizada",
          description: `${PERFORMANCE_TYPES.find(t => t.value === type)?.label}: ${performanceValue} (${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear})`,
          created_by: user.id,
          status: "completed",
        });

        toast.success("Performance atualizada");
      } else {
        // Insert new record
        const { error } = await supabase
          .from("crm_card_performance_history")
          .insert({
            card_id: cardId,
            performance_type: type,
            performance_value: performanceValue,
            performance_month: selectedMonth,
            performance_year: selectedYear,
            recorded_by: user.id,
          });

        if (error) throw error;

        // Log history
        await supabase.from("crm_activities").insert({
          card_id: cardId,
          activity_type: "note",
          title: "Performance registrada",
          description: `${PERFORMANCE_TYPES.find(t => t.value === type)?.label}: ${performanceValue} (${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear})`,
          created_by: user.id,
          status: "completed",
        });

        toast.success("Performance registrada");
      }

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });

      // Reset form
      setEditingType(null);
      setPerformanceValue("");
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    } catch (error: any) {
      console.error("Error adding performance:", error);
      toast.error(error.message || "Erro ao registrar performance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePerformance = async (recordId: string, type: string, value: string, month: number, year: number) => {
    try {
      const { error } = await supabase
        .from("crm_card_performance_history")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      // Log history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("crm_activities").insert({
          card_id: cardId,
          activity_type: "note",
          title: "Performance removida",
          description: `${PERFORMANCE_TYPES.find(t => t.value === type)?.label}: ${value} (${MONTHS.find(m => m.value === month)?.label}/${year})`,
          created_by: user.id,
          status: "completed",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Performance removida");
    } catch (error: any) {
      console.error("Error deleting performance:", error);
      toast.error("Erro ao remover performance");
    }
  };

  // Group records by type
  const groupedRecords = PERFORMANCE_TYPES.map(type => {
    const records = performanceHistory
      .filter(r => r.performance_type === type.value)
      .sort((a, b) => {
        if (a.performance_year !== b.performance_year) {
          return b.performance_year - a.performance_year;
        }
        return b.performance_month - a.performance_month;
      });

    return {
      type,
      records,
      latestRecord: records[0] || null,
    };
  });

  return (
    <div className="space-y-4">
      {/* Dashboard com gráficos */}
      {performanceHistory.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard de Performance
          </div>
          <PerformanceDashboard performanceHistory={performanceHistory} />
          <Separator className="my-4" />
        </>
      )}

      {/* Display performance types as clickable options */}
      <div className="space-y-2">
        {groupedRecords.map(({ type, latestRecord, records }) => (
          <div key={type.value} className="space-y-2">
            <button
              onClick={() => {
                if (editingType === type.value) {
                  setEditingType(null);
                  setPerformanceValue("");
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                } else {
                  setEditingType(type.value);
                  if (latestRecord) {
                    setPerformanceValue(latestRecord.performance_value);
                    setSelectedMonth(latestRecord.performance_month);
                    setSelectedYear(latestRecord.performance_year);
                  } else {
                    setPerformanceValue("");
                    setSelectedMonth(currentMonth);
                    setSelectedYear(currentYear);
                  }
                }
              }}
              className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-md transition-colors text-left"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{type.label}</div>
                {latestRecord && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {latestRecord.performance_value} ({MONTHS.find(m => m.value === latestRecord.performance_month)?.label}/{latestRecord.performance_year})
                  </div>
                )}
                {!latestRecord && (
                  <div className="text-xs text-muted-foreground italic mt-1">Sem registro</div>
                )}
              </div>
              {latestRecord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePerformance(
                      latestRecord.id,
                      latestRecord.performance_type,
                      latestRecord.performance_value,
                      latestRecord.performance_month,
                      latestRecord.performance_year
                    );
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </button>

            {/* Show edit form when this type is selected */}
            {editingType === type.value && (
              <div className="space-y-3 p-3 bg-background border rounded-md">
                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    value={performanceValue}
                    onChange={(e) => setPerformanceValue(e.target.value)}
                    placeholder="Digite o valor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Mês</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Ano</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddPerformance(type.value)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Salvar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingType(null);
                      setPerformanceValue("");
                      setSelectedMonth(currentMonth);
                      setSelectedYear(currentYear);
                    }}
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Show history for this type */}
            {records.length > 1 && (
              <details className="text-xs pl-3">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver histórico ({records.length - 1} registros anteriores)
                </summary>
                <div className="mt-2 space-y-1 pl-2">
                  {records.slice(1).map(record => (
                    <div key={record.id} className="flex items-center justify-between text-muted-foreground">
                      <span>
                        {MONTHS.find(m => m.value === record.performance_month)?.label}/{record.performance_year}: {record.performance_value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePerformance(
                          record.id,
                          record.performance_type,
                          record.performance_value,
                          record.performance_month,
                          record.performance_year
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}