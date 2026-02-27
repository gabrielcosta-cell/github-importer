import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Card {
  id: string;
  health_score: number | null;
  data_renovacao: string | null;
  inadimplente: boolean;
}

interface Tag {
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

    console.log('Starting auto-tag application process...');

    // Buscar todas as etiquetas automáticas do sistema
    const { data: systemTags, error: tagsError } = await supabase
      .from('crm_tags')
      .select('id, name')
      .eq('is_system', true)
      .eq('is_active', true)
      .eq('module_scope', 'csm');

    if (tagsError) throw tagsError;

    const tagMap: Record<string, string> = {};
    systemTags?.forEach((tag: Tag) => {
      tagMap[tag.name] = tag.id;
    });

    // Buscar todos os cards do CSM (pipeline "Clientes ativos - CSM")
    const { data: pipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('name', 'Clientes ativos - CSM')
      .single();

    if (!pipeline) {
      console.log('Pipeline CSM não encontrado');
      return new Response(
        JSON.stringify({ message: 'Pipeline CSM não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: cards, error: cardsError } = await supabase
      .from('crm_cards')
      .select('id, health_score, data_renovacao, inadimplente')
      .eq('pipeline_id', pipeline.id);

    if (cardsError) throw cardsError;

    console.log(`Processing ${cards?.length || 0} cards...`);

    let appliedTagsCount = 0;
    let removedTagsCount = 0;

    // Processar cada card
    for (const card of cards || []) {
      const cardTags: string[] = [];

      // Regra 1: Health Score Crítico (< 30)
      if (card.health_score !== null && card.health_score < 30) {
        cardTags.push(tagMap['HEALTH SCORE CRÍTICO']);
      }

      // Regra 2: Health Score Baixo (30-50)
      if (card.health_score !== null && card.health_score >= 30 && card.health_score <= 50) {
        cardTags.push(tagMap['HEALTH SCORE BAIXO']);
      }

      // Regra 3: Renovação Próxima (próximos 30 dias)
      if (card.data_renovacao) {
        const renovacaoDate = new Date(card.data_renovacao);
        const today = new Date();
        const diffDays = Math.ceil((renovacaoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0 && diffDays <= 30) {
          cardTags.push(tagMap['RENOVAÇÃO PRÓXIMA']);
        }
      }

      // Regra 4: Inadimplente
      if (card.inadimplente) {
        cardTags.push(tagMap['INADIMPLENTE']);
      }

      // Buscar etiquetas atuais do card (apenas as automáticas)
      const { data: currentTags } = await supabase
        .from('crm_card_tags')
        .select('tag_id')
        .eq('card_id', card.id)
        .in('tag_id', Object.values(tagMap));

      const currentTagIds = currentTags?.map(ct => ct.tag_id) || [];

      // Remover etiquetas que não devem mais estar aplicadas
      const tagsToRemove = currentTagIds.filter(tid => !cardTags.includes(tid));
      if (tagsToRemove.length > 0) {
        await supabase
          .from('crm_card_tags')
          .delete()
          .eq('card_id', card.id)
          .in('tag_id', tagsToRemove);
        removedTagsCount += tagsToRemove.length;
      }

      // Adicionar novas etiquetas
      const tagsToAdd = cardTags.filter(tid => !currentTagIds.includes(tid));
      if (tagsToAdd.length > 0) {
        const inserts = tagsToAdd.map(tagId => ({
          card_id: card.id,
          tag_id: tagId
        }));
        
        await supabase
          .from('crm_card_tags')
          .insert(inserts);
        appliedTagsCount += tagsToAdd.length;
      }
    }

    console.log(`Auto-tag process completed. Applied: ${appliedTagsCount}, Removed: ${removedTagsCount}`);

    return new Response(
      JSON.stringify({ 
        message: 'Auto-tags applied successfully',
        appliedTags: appliedTagsCount,
        removedTags: removedTagsCount,
        cardsProcessed: cards?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in apply-auto-tags function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
