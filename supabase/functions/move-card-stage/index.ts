import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://yoauzllgwcsrmvkwdcoa.supabase.co";

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

    const { cardId, newStageId } = await req.json();

    if (!cardId || !newStageId) {
      return new Response(JSON.stringify({ error: "cardId and newStageId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(EXTERNAL_URL, serviceRoleKey);

    // Update the card's stage
    const { error: updateError } = await supabase
      .from("crm_cards")
      .update({
        stage_id: newStageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId);

    if (updateError) {
      console.error("Error updating card stage:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create tasks for the new stage
    const { data: stageTasks } = await supabase
      .from("crm_stage_tasks")
      .select("*")
      .eq("stage_id", newStageId)
      .eq("is_active", true)
      .order("position");

    if (stageTasks && stageTasks.length > 0) {
      const stageTaskIds = stageTasks.map((t: any) => t.id);
      const { data: existingTasks } = await supabase
        .from("crm_card_tasks")
        .select("stage_task_id")
        .eq("card_id", cardId)
        .in("stage_task_id", stageTaskIds);

      const existingSet = new Set(existingTasks?.map((t: any) => t.stage_task_id) || []);

      const newTasks = stageTasks
        .filter((st: any) => !existingSet.has(st.id))
        .map((st: any) => {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + st.deadline_days);
          return {
            card_id: cardId,
            stage_task_id: st.id,
            title: st.title,
            description: st.description,
            deadline_date: deadline.toISOString(),
          };
        });

      if (newTasks.length > 0) {
        await supabase.from("crm_card_tasks").insert(newTasks);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
