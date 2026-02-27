import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StageHistory {
  card_id: string;
  stage_id: string;
  entered_at: string;
  exited_at: string | null;
}

interface Card {
  id: string;
  stage_id: string;
  title: string;
  pipeline_id: string;
}

interface Stage {
  id: string;
  pipeline_id: string;
  position: number;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Iniciando verificação de cards para movimentação automática...');

    // 1. Buscar pipeline de "Clientes ativos"
    const { data: pipelines, error: pipelineError } = await supabase
      .from('crm_pipelines')
      .select('id, name')
      .ilike('name', '%ativos%')
      .eq('is_active', true)
      .limit(1)
      .returns<Pipeline[]>();

    if (pipelineError) {
      console.error('❌ Erro ao buscar pipeline:', pipelineError);
      throw pipelineError;
    }

    if (!pipelines || pipelines.length === 0) {
      console.log('ℹ️ Nenhum pipeline de "Clientes ativos" encontrado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum pipeline de clientes ativos encontrado',
          movedCards: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const activePipeline = pipelines[0];
    console.log(`✅ Pipeline encontrado: ${activePipeline.name} (${activePipeline.id})`);

    // 2. Buscar etapas do pipeline ordenadas por posição
    const { data: stages, error: stagesError } = await supabase
      .from('crm_stages')
      .select('id, pipeline_id, position, name')
      .eq('pipeline_id', activePipeline.id)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .returns<Stage[]>();

    if (stagesError) {
      console.error('❌ Erro ao buscar etapas:', stagesError);
      throw stagesError;
    }

    if (!stages || stages.length === 0) {
      console.log('ℹ️ Nenhuma etapa encontrada no pipeline');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma etapa encontrada',
          movedCards: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ ${stages.length} etapas encontradas`);

    // 3. Buscar cards ativos do pipeline com histórico
    const { data: stageHistory, error: historyError } = await supabase
      .from('crm_card_stage_history')
      .select(`
        card_id,
        stage_id,
        entered_at,
        exited_at
      `)
      .is('exited_at', null)
      .returns<StageHistory[]>();

    if (historyError) {
      console.error('❌ Erro ao buscar histórico:', historyError);
      throw historyError;
    }

    console.log(`✅ ${stageHistory?.length || 0} cards em etapas ativas`);

    // 4. Verificar quais cards precisam ser movidos (30+ dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cardsToMove: { cardId: string; currentStageId: string; nextStageId: string }[] = [];

    if (stageHistory) {
      for (const history of stageHistory) {
        const enteredAt = new Date(history.entered_at);
        
        if (enteredAt <= thirtyDaysAgo) {
          // Buscar dados do card
          const { data: card, error: cardError } = await supabase
            .from('crm_cards')
            .select('id, stage_id, title, pipeline_id')
            .eq('id', history.card_id)
            .eq('pipeline_id', activePipeline.id)
            .single<Card>();

          if (cardError || !card) {
            console.log(`⚠️ Card ${history.card_id} não encontrado ou não está no pipeline ativo`);
            continue;
          }

          // Encontrar próxima etapa
          const currentStageIndex = stages.findIndex(s => s.id === card.stage_id);
          if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
            console.log(`ℹ️ Card "${card.title}" já está na última etapa ou etapa não encontrada`);
            continue;
          }

          const nextStage = stages[currentStageIndex + 1];
          cardsToMove.push({
            cardId: card.id,
            currentStageId: card.stage_id,
            nextStageId: nextStage.id
          });

          console.log(`📌 Card "${card.title}" será movido de "${stages[currentStageIndex].name}" para "${nextStage.name}"`);
        }
      }
    }

    console.log(`🎯 ${cardsToMove.length} cards serão movidos automaticamente`);

    // 5. Mover cards
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
        console.log(`✅ Card ${move.cardId} movido com sucesso`);
      }
    }

    console.log(`✅ Processo concluído: ${movedCount} cards movidos`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${movedCount} cards movidos automaticamente`,
        movedCards: movedCount,
        pipelineName: activePipeline.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        movedCards: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
