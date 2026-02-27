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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") || "2");
    const year = parseInt(url.searchParams.get("year") || "2026");

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const serviceRoleKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(EXTERNAL_URL, serviceRoleKey);

    const { data, error } = await supabase
      .from("crm_cards")
      .select("title, company_name, squad, monthly_revenue, motivo_perda, data_perda")
      .eq("churn", true)
      .in("pipeline_id", CS_PIPELINE_IDS)
      .gte("data_perda", startDate)
      .lt("data_perda", endDate)
      .order("data_perda", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clients = (data || []).map((c) => ({
      name: c.company_name || c.title,
      squad: c.squad || "Sem squad",
      mrr: c.monthly_revenue || 0,
      motivo: c.motivo_perda || "Não informado",
      data_perda: c.data_perda,
    }));

    const bySquad: Record<string, { count: number; mrr: number }> = {};
    let totalMrr = 0;

    for (const c of clients) {
      totalMrr += c.mrr;
      if (!bySquad[c.squad]) bySquad[c.squad] = { count: 0, mrr: 0 };
      bySquad[c.squad].count++;
      bySquad[c.squad].mrr += c.mrr;
    }

    return new Response(
      JSON.stringify({
        total_churns: clients.length,
        total_mrr_lost: totalMrr,
        month,
        year,
        by_squad: bySquad,
        clients,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
