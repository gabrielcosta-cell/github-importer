import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const FixItabanDuplicate = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      const duplicateId = '96baace6-f2ae-40a9-9686-3c7a780e305c';

      // 1. Deletar histórico de stage do registro duplicado
      const { error: historyError } = await supabase
        .from('crm_card_stage_history')
        .delete()
        .eq('card_id', duplicateId);

      if (historyError) throw historyError;

      // 2. Deletar o registro duplicado
      const { error: cardError } = await supabase
        .from('crm_cards')
        .delete()
        .eq('id', duplicateId);

      if (cardError) throw cardError;

      // 3. Verificar resultado
      const { data: verification, error: verifyError } = await supabase
        .from('crm_cards')
        .select('id, company_name, monthly_revenue')
        .eq('company_name', 'Itiban');

      if (verifyError) throw verifyError;

      setResult({
        success: true,
        message: `Duplicata corrigida! Agora existe ${verification?.length} registro(s) do Itiban com MRR total de R$ ${verification?.reduce((sum, c) => sum + (c.monthly_revenue || 0), 0).toLocaleString('pt-BR')}`
      });

      toast.success("Duplicata do Itiban corrigida com sucesso!");
    } catch (error) {
      console.error('Erro ao corrigir duplicata:', error);
      setResult({
        success: false,
        message: error.message || "Erro ao corrigir duplicata"
      });
      toast.error("Erro ao corrigir duplicata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleFix} 
        disabled={loading}
        variant="destructive"
      >
        {loading ? "Corrigindo..." : "Corrigir Duplicata do Itiban"}
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
