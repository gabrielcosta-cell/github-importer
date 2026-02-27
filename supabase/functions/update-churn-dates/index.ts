import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTERNAL_URL = "https://yoauzllgwcsrmvkwdcoa.supabase.co";
const EXTERNAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXV6bGxnd2Nzcm12a3dkY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjMwNzUsImV4cCI6MjA3MTYzOTA3NX0.ZJGF9tw5b3XeTLHPByP_a7R2yrgzUae_L1lWC-AJz90";

const CS_PIPELINE_IDS = [
  "0193ef31-aa14-7889-848b-fb9a4e834464",
  "0193ef31-e498-7b44-a238-0895e2e6c756",
  "5dfc98f3-9614-419a-af65-1b87c8372aeb",
];

const FEB_CLIENTS = [
  { name: "8 milimetros", squad: "Apollo", mrr: 2800, data_perda: "2026-02-06", motivo: "Falta de Resultado" },
  { name: "Cotafacil", squad: "Apollo", mrr: 5800, data_perda: "2026-02-06", motivo: "Desalinhamento com o time operacional" },
  { name: "Face Doctor", squad: "Apollo", mrr: 4900, data_perda: "2026-02-10", motivo: "Desalinhamento com o time operacional" },
  { name: "Grupo Gemba", squad: "Apollo", mrr: 3600, data_perda: "2026-02-03", motivo: "Inadimplencia" },
  { name: "Inshape", squad: "Apollo", mrr: 4900, data_perda: "2026-02-07", motivo: "Desalinhamento em vendas" },
  { name: "Connect Tecnologia", squad: "Athena", mrr: 3500, data_perda: "2026-02-02", motivo: "Falta de Resultado" },
];

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(EXTERNAL_URL, serviceRoleKey);

    // Fetch all Feb churns
    const { data: febChurns, error: fetchErr } = await supabase
      .from("crm_cards")
      .select("id, title, company_name, squad, monthly_revenue, motivo_perda, data_perda")
      .eq("churn", true)
      .in("pipeline_id", CS_PIPELINE_IDS)
      .gte("data_perda", "2026-02-01")
      .lt("data_perda", "2026-03-01");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report = { updated_feb: [] as any[], moved_to_jan: [] as any[], errors: [] as any[] };
    const febNames = FEB_CLIENTS.map(c => normalize(c.name));

    for (const card of (febChurns || [])) {
      const cardName = normalize(card.company_name || card.title || "");
      const matchIdx = febNames.findIndex(n => cardName.includes(n) || n.includes(cardName));

      if (matchIdx >= 0) {
        // Update with correct data
        const client = FEB_CLIENTS[matchIdx];
        const { error } = await supabase
          .from("crm_cards")
          .update({
            data_perda: client.data_perda,
            motivo_perda: client.motivo,
            squad: client.squad,
            monthly_revenue: client.mrr,
          })
          .eq("id", card.id);

        if (error) {
          report.errors.push({ id: card.id, name: card.company_name || card.title, error: error.message });
        } else {
          report.updated_feb.push({ id: card.id, name: card.company_name || card.title, ...client });
        }
      } else {
        // Move to January
        const { error } = await supabase
          .from("crm_cards")
          .update({ data_perda: "2026-01-30" })
          .eq("id", card.id);

        if (error) {
          report.errors.push({ id: card.id, name: card.company_name || card.title, error: error.message });
        } else {
          report.moved_to_jan.push({ id: card.id, name: card.company_name || card.title, old_data_perda: card.data_perda });
        }
      }
    }

    return new Response(JSON.stringify({
      total_feb_churns_found: (febChurns || []).length,
      updated_feb_count: report.updated_feb.length,
      moved_to_jan_count: report.moved_to_jan.length,
      errors_count: report.errors.length,
      ...report,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
