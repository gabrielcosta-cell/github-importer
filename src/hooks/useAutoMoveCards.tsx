import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAutoMoveCardsProps {
  pipelineId: string | null;
  pipelineName: string | undefined;
  onCardsUpdated?: () => void;
}

export const useAutoMoveCards = ({ 
  pipelineId, 
  pipelineName,
  onCardsUpdated 
}: UseAutoMoveCardsProps) => {
  
  const checkAndMoveCards = useCallback(async () => {
    // Só executa para pipeline de "Clientes ativos"
    if (!pipelineId || !pipelineName?.toLowerCase().includes('ativos')) {
      return;
    }

    try {
      console.log('🔄 Verificando cards para movimentação automática...');

      // 1. Buscar etapas do pipeline ordenadas
      const { data: stages, error: stagesError } = await supabase
        .from('csm_stages')
        .select('id, position, name')
        .eq('pipeline_id', pipelineId)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (stagesError || !stages || stages.length === 0) {
        console.error('Erro ao buscar etapas:', stagesError);
        return;
      }

      // 2. Buscar histórico de cards ativos (sem exited_at)
      const { data: activeHistory, error: historyError } = await supabase
        .from('csm_card_stage_history')
        .select('card_id, stage_id, entered_at')
        .is('exited_at', null);

      if (historyError || !activeHistory) {
        console.error('Erro ao buscar histórico:', historyError);
        return;
      }

      // 3. Verificar quais cards completaram 30 dias na etapa atual
      const now = new Date();

      const cardsToMove: Array<{ 
        cardId: string; 
        currentStageId: string; 
        nextStageId: string;
        cardTitle?: string;
        currentStageName?: string;
        nextStageName?: string;
      }> = [];

      for (const history of activeHistory) {
        const enteredAt = new Date(history.entered_at);
        const daysInStage = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Se completou 30 dias (dia 31+), mover para próxima etapa
        if (daysInStage >= 30) {
          // Buscar dados do card
          const { data: card, error: cardError } = await supabase
            .from('csm_cards')
            .select('id, stage_id, title, pipeline_id, client_status')
            .eq('id', history.card_id)
            .eq('pipeline_id', pipelineId)
            .single();

          if (cardError || !card) {
            continue;
          }

          // Só mover cards ativos
          if (card.client_status === 'cancelado') {
            continue;
          }

          // Encontrar próxima etapa
          const currentStageIndex = stages.findIndex(s => s.id === card.stage_id);
          
          // Se não encontrou etapa ou já está na última (Retenção), pular
          if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
            continue;
          }

          const currentStage = stages[currentStageIndex];
          const nextStage = stages[currentStageIndex + 1];

          cardsToMove.push({
            cardId: card.id,
            currentStageId: card.stage_id,
            nextStageId: nextStage.id,
            cardTitle: card.title,
            currentStageName: currentStage.name,
            nextStageName: nextStage.name
          });

          console.log(`📌 Card "${card.title}" será movido: ${currentStage.name} → ${nextStage.name} (${daysInStage} dias)`);
        }
      }

      // 4. Mover os cards
      if (cardsToMove.length > 0) {
        let movedCount = 0;
        const moveTimestamp = new Date().toISOString();

        for (const move of cardsToMove) {
          // Atualizar stage_id do card
          const { error: updateError } = await supabase
            .from('csm_cards')
            .update({ 
              stage_id: move.nextStageId,
              updated_at: moveTimestamp
            })
            .eq('id', move.cardId);

          if (updateError) {
            console.error(`❌ Erro ao mover card ${move.cardId}:`, updateError);
            continue;
          }

          // Fechar registro anterior no histórico
          await supabase
            .from('csm_card_stage_history')
            .update({ exited_at: moveTimestamp })
            .eq('card_id', move.cardId)
            .is('exited_at', null);

          // Criar novo registro no histórico (dia 1 da nova etapa)
          await supabase
            .from('csm_card_stage_history')
            .insert({
              card_id: move.cardId,
              stage_id: move.nextStageId,
              entered_at: moveTimestamp,
              moved_by: null, // Movimentação automática
            });

          movedCount++;
          console.log(`✅ Card "${move.cardTitle}" movido: ${move.currentStageName} → ${move.nextStageName}`);
        }

        if (movedCount > 0) {
          toast.success(`${movedCount} ${movedCount === 1 ? 'card movido' : 'cards movidos'} automaticamente`, {
            description: 'Cards que completaram 30 dias na etapa foram avançados.'
          });

          if (onCardsUpdated) {
            onCardsUpdated();
          }
        }

        console.log(`✅ Movimentação automática concluída: ${movedCount}/${cardsToMove.length} cards movidos`);
      } else {
        console.log('ℹ️ Nenhum card precisa ser movido automaticamente');
      }

    } catch (error) {
      console.error('❌ Erro na movimentação automática:', error);
    }
  }, [pipelineId, pipelineName, onCardsUpdated]);

  useEffect(() => {
    // Executar verificação inicial após 2 segundos
    const initialTimeout = setTimeout(() => {
      checkAndMoveCards();
    }, 2000);

    // Executar verificação a cada 5 minutos
    const interval = setInterval(() => {
      checkAndMoveCards();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkAndMoveCards]);

  return { checkAndMoveCards };
};
