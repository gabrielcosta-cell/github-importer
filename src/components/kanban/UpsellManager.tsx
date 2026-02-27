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

interface UpsellRecord {
  id: string;
  upsell_type?: 'upsell' | 'crosssell';
  upsell_value: number;
  upsell_month: number;
  upsell_year: number;
  payment_type?: 'recorrente' | 'unico' | 'parcelado';
  installments?: number | null;
  notes?: string | null;
  created_at: string;
}

interface UpsellManagerProps {
  cardId: string;
  upsellHistory: UpsellRecord[];
}

const UPSELL_TYPES = [
  { value: "upsell", label: "Upsell" },
  { value: "crosssell", label: "Crosssell" },
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

export function UpsellManager({ cardId, upsellHistory }: UpsellManagerProps) {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [editingType, setEditingType] = useState<'upsell' | 'crosssell' | null>(null);
  const [upsellValue, setUpsellValue] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [paymentType, setPaymentType] = useState<'recorrente' | 'unico' | 'parcelado'>('recorrente');
  const [installments, setInstallments] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleAddUpsell = async (type: 'upsell' | 'crosssell') => {
    if (!upsellValue || upsellValue <= 0 || !selectedMonth || !selectedYear) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (paymentType === 'parcelado' && (!installments || installments < 2)) {
      toast.error("Para pagamento parcelado, informe o número de parcelas (mínimo 2)");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("csm_card_upsell_history")
        .insert({
          card_id: cardId,
          upsell_type: type,
          upsell_value: upsellValue,
          upsell_month: selectedMonth,
          upsell_year: selectedYear,
          payment_type: paymentType,
          installments: paymentType === 'parcelado' ? installments : null,
          start_month: paymentType === 'recorrente' ? selectedMonth : null,
          start_year: paymentType === 'recorrente' ? selectedYear : null,
          notes: notes || null,
          recorded_by: user.id,
        });

      if (error) throw error;

      // Log history
      await supabase.from("csm_activities").insert({
        card_id: cardId,
        activity_type: "note",
        title: `${type === 'upsell' ? 'Upsell' : 'Crosssell'} registrado`,
        description: `Valor: R$ ${upsellValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear}) - ${paymentType}`,
        created_by: user.id,
        status: "completed",
      });

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });

      toast.success(`${type === 'upsell' ? 'Upsell' : 'Crosssell'} registrado com sucesso`);

      // Reset form
      setEditingType(null);
      setUpsellValue(0);
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
      setPaymentType('recorrente');
      setInstallments(null);
      setNotes("");
    } catch (error: any) {
      console.error("Error adding upsell:", error);
      toast.error(error.message || "Erro ao registrar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUpsell = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from("csm_card_upsell_history")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      // Log history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("csm_activities").insert({
          card_id: cardId,
          activity_type: "note",
          title: "Upsell/Crosssell removido",
          description: "Registro removido do histórico",
          created_by: user.id,
          status: "completed",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Registro removido");
    } catch (error: any) {
      console.error("Error deleting upsell:", error);
      toast.error("Erro ao remover registro");
    }
  };

  // Group records by type
  const groupedRecords = UPSELL_TYPES.map(type => {
    const records = upsellHistory
      .filter(r => r.upsell_type === type.value || (!r.upsell_type && type.value === 'upsell'))
      .sort((a, b) => {
        if (a.upsell_year !== b.upsell_year) {
          return b.upsell_year - a.upsell_year;
        }
        return b.upsell_month - a.upsell_month;
      });

    return {
      type,
      records,
      latestRecord: records[0] || null,
    };
  });

  return (
    <div className="space-y-4">
      {/* Display upsell types as clickable options */}
      <div className="space-y-2">
        {groupedRecords.map(({ type, latestRecord, records }) => (
          <div key={type.value} className="space-y-2">
            <button
              onClick={() => {
                if (editingType === type.value) {
                  setEditingType(null);
                  setUpsellValue(0);
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                  setPaymentType('recorrente');
                  setInstallments(null);
                  setNotes("");
                } else {
                  setEditingType(type.value as 'upsell' | 'crosssell');
                  setUpsellValue(0);
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                  setPaymentType('recorrente');
                  setInstallments(null);
                  setNotes("");
                }
              }}
              className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-md transition-colors text-left"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{type.label}</div>
                {latestRecord ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    R$ {latestRecord.upsell_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({MONTHS.find(m => m.value === latestRecord.upsell_month)?.label}/{latestRecord.upsell_year})
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
                    handleDeleteUpsell(latestRecord.id);
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
                  <Label className="text-xs">Tipo de Pagamento</Label>
                  <Select value={paymentType} onValueChange={(v: 'recorrente' | 'unico' | 'parcelado') => setPaymentType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                      <SelectItem value="unico">Pagamento Único</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    value={upsellValue || ''}
                    onChange={(e) => setUpsellValue(parseFloat(e.target.value) || 0)}
                    placeholder="Digite o valor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">{paymentType === 'recorrente' ? 'Mês de Início' : 'Mês'}</Label>
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

                {paymentType === 'parcelado' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Número de Parcelas</Label>
                    <Input
                      type="number"
                      min="2"
                      value={installments || ''}
                      onChange={(e) => setInstallments(parseInt(e.target.value) || null)}
                      placeholder="Ex: 12"
                    />
                  </div>
                )}

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
                    onClick={() => handleAddUpsell(type.value as 'upsell' | 'crosssell')}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Salvar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingType(null);
                      setUpsellValue(0);
                      setSelectedMonth(currentMonth);
                      setSelectedYear(currentYear);
                      setPaymentType('recorrente');
                      setInstallments(null);
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
                        {MONTHS.find(m => m.value === record.upsell_month)?.label}/{record.upsell_year}: R$ {record.upsell_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUpsell(record.id)}
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
