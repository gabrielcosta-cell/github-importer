import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PIPELINE_CLIENTES_ATIVOS = "749ccdc2-5127-41a1-997b-3dcb47979555";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();

    // Buscar cards CRM Ops com tipo_receita = 'venda_recorrente' e migrado_csm = false
    // Que foram criados em um mês ANTERIOR ao mês atual
    const { data: cards, error: fetchError } = await supabase
      .from("csm_cards")
      .select("*")
      .eq("tipo_receita", "venda_recorrente")
      .eq("migrado_csm", false)
      .not("pipeline_id", "eq", PIPELINE_CLIENTES_ATIVOS);

    if (fetchError) {
      console.error("Erro ao buscar cards:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum card para migrar", migrated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let migratedCount = 0;

    for (const card of cards) {
      const createdAt = new Date(card.created_at);
      const cardMonth = createdAt.getMonth();
      const cardYear = createdAt.getFullYear();

      // Só migrar se o card é de um mês anterior
      const isFromPreviousMonth =
        cardYear < currentYear ||
        (cardYear === currentYear && cardMonth < currentMonth);

      if (!isFromPreviousMonth) continue;

      // Buscar primeiro estágio do pipeline Clientes Ativos
      const { data: firstStage } = await supabase
        .from("csm_stages")
        .select("id")
        .eq("pipeline_id", PIPELINE_CLIENTES_ATIVOS)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (!firstStage) {
        console.error("Nenhum estágio encontrado no pipeline Clientes Ativos");
        continue;
      }

      // Calcular data_inicio como dia 1 do mês atual
      const dataInicio = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;

      // Criar card no pipeline Clientes Ativos
      const { data: newCard, error: insertError } = await supabase
        .from("csm_cards")
        .insert({
          title: card.title,
          company_name: card.company_name,
          contact_name: card.contact_name,
          contact_email: card.contact_email,
          contact_phone: card.contact_phone,
          monthly_revenue: card.monthly_revenue,
          niche: card.niche,
          squad: card.squad,
          plano: card.plano,
          servico_contratado: card.servico_contratado,
          pipeline_id: PIPELINE_CLIENTES_ATIVOS,
          stage_id: firstStage.id,
          position: 0,
          value: card.value || 0,
          data_inicio: dataInicio,
          data_contrato: dataInicio,
          client_status: "ativo",
          created_by: card.created_by,
          categoria: "MRR Operação",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Erro ao criar card CSM para ${card.title}:`, insertError);
        continue;
      }

      // Criar histórico de estágio para o novo card
      if (newCard) {
        await supabase.from("csm_card_stage_history").insert({
          card_id: newCard.id,
          stage_id: firstStage.id,
          entered_at: new Date().toISOString(),
          moved_by: card.created_by,
          notes: `Card migrado automaticamente do CRM Ops (Venda Recorrente)`,
          event_type: "stage_change",
        });
      }

      // Marcar card original como migrado
      await supabase
        .from("csm_cards")
        .update({ migrado_csm: true })
        .eq("id", card.id);

      migratedCount++;
      console.log(`Card migrado: ${card.title} (${card.id}) -> ${newCard?.id}`);
    }

    return new Response(
      JSON.stringify({
        message: `Migração concluída`,
        migrated: migratedCount,
        total_checked: cards.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na migração:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
