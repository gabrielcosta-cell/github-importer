import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface VariableRecord {
  id: string;
  variable_type: 'investimento' | 'venda';
  variable_value: number;
  variable_month: number;
  variable_year: number;
  notes?: string | null;
  created_at: string;
}

interface VariableManagerProps {
  cardId: string;
  variableHistory: VariableRecord[];
  filterType?: 'investimento' | 'venda';
}

const VARIABLE_TYPES = [
  { value: "investimento", label: "Investimento" },
  { value: "venda", label: "Venda" },
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

export function VariableManager({ cardId, variableHistory, filterType }: VariableManagerProps) {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [editingType, setEditingType] = useState<'investimento' | 'venda' | null>(null);
  const [variableValue, setVariableValue] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleAddVariable = async (type: 'investimento' | 'venda') => {
    if (!variableValue || variableValue <= 0 || !selectedMonth || !selectedYear) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("csm_card_variable_history")
        .insert({
          card_id: cardId,
          variable_type: type,
          variable_value: variableValue,
          variable_month: selectedMonth,
          variable_year: selectedYear,
          notes: notes || null,
          recorded_by: user.id,
        });

      if (error) throw error;

      // Log history
      await supabase.from("csm_activities").insert({
        card_id: cardId,
        activity_type: "note",
        title: "Variável registrada",
        description: `${type === 'investimento' ? 'Investimento' : 'Venda'}: R$ ${variableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear})`,
        created_by: user.id,
        status: "completed",
      });

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });

      toast.success("Variável registrada com sucesso");

      // Reset form
      setEditingType(null);
      setVariableValue(0);
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
      setNotes("");
    } catch (error: any) {
      console.error("Error adding variable:", error);
      toast.error(error.message || "Erro ao registrar variável");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariable = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from("csm_card_variable_history")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      // Log history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("csm_activities").insert({
          card_id: cardId,
          activity_type: "note",
          title: "Variável removida",
          description: "Registro removido do histórico",
          created_by: user.id,
          status: "completed",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Registro removido");
    } catch (error: any) {
      console.error("Error deleting variable:", error);
      toast.error("Erro ao remover registro");
    }
  };

  // Group records by type (filtered if filterType is set)
  const typesToShow = filterType ? VARIABLE_TYPES.filter(t => t.value === filterType) : VARIABLE_TYPES;
  const groupedRecords = typesToShow.map(type => {
    const records = variableHistory
      .filter(r => r.variable_type === type.value)
      .sort((a, b) => {
        if (a.variable_year !== b.variable_year) {
          return b.variable_year - a.variable_year;
        }
        return b.variable_month - a.variable_month;
      });

    return {
      type,
      records,
      latestRecord: records[0] || null,
    };
  });

  return (
    <div className="space-y-4">
      {/* Display variable types as clickable options */}
      <div className="space-y-2">
        {groupedRecords.map(({ type, latestRecord, records }) => (
          <div key={type.value} className="space-y-2">
            <button
              onClick={() => {
                if (editingType === type.value) {
                  setEditingType(null);
                  setVariableValue(0);
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                  setNotes("");
                } else {
                  setEditingType(type.value as 'investimento' | 'venda');
                  setVariableValue(0);
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                  setNotes("");
                }
              }}
              className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-md transition-colors text-left"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{type.label}</div>
                {latestRecord ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    R$ {latestRecord.variable_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({MONTHS.find(m => m.value === latestRecord.variable_month)?.label}/{latestRecord.variable_year})
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic mt-1">Sem registro</div>
                )}
              </div>
              {latestRecord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVariable(latestRecord.id);
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
                    type="number"
                    value={variableValue || ''}
                    onChange={(e) => setVariableValue(parseFloat(e.target.value) || 0)}
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

                <div className="space-y-2">
                  <Label className="text-xs">Notas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações sobre o registro..."
                    className="min-h-[60px] resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddVariable(type.value as 'investimento' | 'venda')}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Salvar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingType(null);
                      setVariableValue(0);
                      setSelectedMonth(currentMonth);
                      setSelectedYear(currentYear);
                      setNotes("");
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
                        {MONTHS.find(m => m.value === record.variable_month)?.label}/{record.variable_year}: R$ {record.variable_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariable(record.id)}
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
