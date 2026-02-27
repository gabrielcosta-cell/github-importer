import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

// Set para rastrear automações em execução (evitar execuções paralelas)
const runningAutomations = new Set<string>();
// Map para rastrear automações já executadas (evitar re-execuções por 60 segundos)
const completedAutomations = new Map<string, number>();

// Limpar automações completadas antigas a cada 30 segundos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of completedAutomations.entries()) {
    if (now - timestamp > 60000) {
      completedAutomations.delete(key);
    }
  }
}, 30000);

export function usePipelineAutomations() {
  
  const executeAutomation = useCallback(async (
    sourcePipelineId: string,
    triggerEvent: 'won' | 'lost',
    cardId: string,
    newOwnerId?: string | null
  ) => {
    // Criar chave única para esta execução
    const executionKey = `${cardId}-${triggerEvent}`;
    
    // Verificar se já está em execução (evitar execuções paralelas)
    if (runningAutomations.has(executionKey)) {
      console.log('[executeAutomation] Automação já em execução, ignorando:', executionKey);
      return;
    }
    
    // Verificar se já foi completada recentemente (últimos 60 segundos)
    const lastCompletion = completedAutomations.get(executionKey);
    if (lastCompletion && Date.now() - lastCompletion < 60000) {
      console.log('[executeAutomation] Automação já completada recentemente, ignorando:', executionKey);
      return;
    }
    
    // Marcar como em execução
    runningAutomations.add(executionKey);
    
    try {
      // Buscar automações ativas para este pipeline e evento
      const { data: automations, error: automationsError } = await supabase
        .from("pipeline_automations")
        .select("*")
        .eq("source_pipeline_id", sourcePipelineId)
        .eq("trigger_event", triggerEvent)
        .eq("is_active", true);

      if (automationsError) {
        console.error("Error fetching automations:", automationsError);
        return;
      }

      if (!automations || automations.length === 0) {
        return;
      }

      // Executar primeira automação encontrada
      const automation = automations[0];
      
      // Verificar se o card já está no pipeline de destino (evitar loop)
      const { data: currentCard } = await supabase
        .from("crm_cards")
        .select("pipeline_id")
        .eq("id", cardId)
        .single();
      
      if (currentCard?.pipeline_id === automation.target_pipeline_id) {
        console.log('[executeAutomation] Card já está no pipeline de destino, ignorando');
        return;
      }

      // Buscar funil para cópia se configurado
      let copyToPipelineId: string | null = null;
      if (automation.archive_to && automation.archive_to !== 'none') {
        // archive_to agora é diretamente o ID do pipeline
        copyToPipelineId = automation.archive_to;
      }
      
      // Buscar o card
      const { data: card, error: cardError } = await supabase
        .from("crm_cards")
        .select("*")
        .eq("id", cardId)
        .single();

      if (cardError || !card) {
        console.error("Error fetching card:", cardError);
        return;
      }

      // Buscar primeira etapa do pipeline de destino
      const { data: targetStages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("pipeline_id", automation.target_pipeline_id)
        .eq("is_active", true)
        .order("position")
        .limit(1);

      if (stagesError || !targetStages || targetStages.length === 0) {
        console.error("Error fetching target stages:", stagesError);
        toast.error("Erro ao executar automação: etapa de destino não encontrada");
        return;
      }

      const targetStage = targetStages[0];

      // Se deve criar cópia para outro funil, criar antes de mover
      if (copyToPipelineId) {
        console.log('[executeAutomation] Tentando criar cópia no funil:', copyToPipelineId);
        
        const { data: copyStages, error: stagesError } = await supabase
          .from("crm_stages")
          .select("id")
          .eq("pipeline_id", copyToPipelineId)
          .eq("is_active", true)
          .order("position")
          .limit(1);

        if (stagesError) {
          console.error("[executeAutomation] Erro ao buscar etapas para cópia:", stagesError);
        }

        if (copyStages && copyStages.length > 0) {
          // Criar cópia do card no funil selecionado
          // IMPORTANTE: Remover o id do card original para que o Supabase gere um novo
          const { id: _originalId, created_at: _createdAt, updated_at: _updatedAt, ...cardWithoutId } = card;
          
          const copyData = {
            ...cardWithoutId,
            pipeline_id: copyToPipelineId,
            stage_id: copyStages[0].id,
            position: 0,
          };
          
          console.log('[executeAutomation] Dados da cópia:', { 
            pipeline_id: copyToPipelineId, 
            stage_id: copyStages[0].id,
            title: card.title 
          });

          const { error: copyError } = await supabase
            .from("crm_cards")
            .insert(copyData);

          if (copyError) {
            console.error("[executeAutomation] Erro ao criar cópia:", copyError);
            toast.error("Erro ao criar cópia do card: " + copyError.message);
          } else {
            console.log('[executeAutomation] ✅ Cópia criada com sucesso no funil:', copyToPipelineId);
            toast.success("Cópia do lead criada no funil de arquivo");
          }
        } else {
          console.error("[executeAutomation] Nenhuma etapa ativa encontrada para o funil de cópia:", copyToPipelineId);
        }
      }

      // Preparar dados de atualização do card
      const updateData: any = {
        pipeline_id: automation.target_pipeline_id,
        stage_id: targetStage.id,
        updated_at: new Date().toISOString(),
      };

      console.log('[executeAutomation] Dados antes de aplicar novo proprietário:', {
        newOwnerId,
        updateData,
      });

      // Se foi fornecido um novo proprietário, atualizar o assigned_to
      if (newOwnerId) {
        updateData.assigned_to = newOwnerId;
      }

      console.log('[executeAutomation] Dados finais para update do card:', updateData);

      // Mover o card para o novo pipeline/etapa
      const { error: updateError } = await supabase
        .from("crm_cards")
        .update(updateData)
        .eq("id", cardId);

      if (updateError) {
        console.error("Error moving card:", updateError);
        toast.error("Erro ao executar automação");
        return;
      }

      // NÃO criar histórico aqui - será criado pelo componente que chamou a automação
      // Isso evita duplicatas quando múltiplas chamadas paralelas acontecem

      // Buscar nomes dos pipelines para mensagem
      const { data: sourcePipeline } = await supabase
        .from("crm_pipelines")
        .select("name")
        .eq("id", sourcePipelineId)
        .single();

      const { data: targetPipeline } = await supabase
        .from("crm_pipelines")
        .select("name")
        .eq("id", automation.target_pipeline_id)
        .single();

      toast.success(
        `Card movido automaticamente para "${targetPipeline?.name}"`
      );

      // Marcar como completada
      completedAutomations.set(executionKey, Date.now());
    } catch (error) {
      console.error("Error executing automation:", error);
    } finally {
      // Remover do set de execução
      runningAutomations.delete(executionKey);
    }
  }, []);

  return { executeAutomation };
}
