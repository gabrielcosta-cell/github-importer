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
        .from('crm_stages')
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
        .from('crm_card_stage_history')
        .select('card_id, stage_id, entered_at')
        .is('exited_at', null);

      if (historyError || !activeHistory) {
        console.error('Erro ao buscar histórico:', historyError);
        return;
      }

      // 3. Verificar quais cards estão há 30+ dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
        
        // Se está há 30+ dias
        if (enteredAt <= thirtyDaysAgo) {
          // Buscar dados do card
          const { data: card, error: cardError } = await supabase
            .from('crm_cards')
            .select('id, stage_id, title, pipeline_id')
            .eq('id', history.card_id)
            .eq('pipeline_id', pipelineId)
            .single();

          if (cardError || !card) {
            continue;
          }

          // Encontrar próxima etapa
          const currentStageIndex = stages.findIndex(s => s.id === card.stage_id);
          
          // Se não encontrou etapa ou já está na última, pular
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

          console.log(`📌 Card "${card.title}" será movido: ${currentStage.name} → ${nextStage.name}`);
        }
      }

      // 4. Mover os cards
      if (cardsToMove.length > 0) {
        let movedCount = 0;

        for (const move of cardsToMove) {
          const { error: updateError } = await supabase
            .from('crm_cards')
            .update({ 
              stage_id: move.nextStageId,
              updated_at: new Date().toISOString()
            })
            .eq('id', move.cardId);

          if (updateError) {
            console.error(`❌ Erro ao mover card ${move.cardId}:`, updateError);
          } else {
            movedCount++;
            console.log(`✅ Card "${move.cardTitle}" movido: ${move.currentStageName} → ${move.nextStageName}`);
          }
        }

        if (movedCount > 0) {
          toast.success(`${movedCount} ${movedCount === 1 ? 'card movido' : 'cards movidos'} automaticamente`, {
            description: 'Cards que estavam há mais de 30 dias na mesma etapa foram avançados.'
          });

          // Notificar componente pai para atualizar
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
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkAndMoveCards]);

  return { checkAndMoveCards };
};
