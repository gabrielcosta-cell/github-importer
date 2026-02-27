import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  return new Response(res.body, { status: res.status, headers: h });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  try {
    console.log('=== UPDATE PASSWORD FUNCTION STARTED ===');
    
    // Esta função usa SERVICE_ROLE diretamente, então já tem acesso admin
    // Usada apenas para operações administrativas via API
    
    const body = await req.json();
    const { user_id, new_password } = body;
    
    if (!user_id || !new_password) {
      return cors(new Response(JSON.stringify({ error: "user_id e new_password são obrigatórios" }), { status: 400 }));
    }

    console.log('Updating password for user:', user_id);

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password
    });

    if (error) {
      console.error('Error updating password:', error);
      return cors(new Response(JSON.stringify({ error: error.message }), { status: 400 }));
    }

    console.log('Password updated successfully for user:', user_id);
    
    return cors(new Response(JSON.stringify({ 
      ok: true, 
      message: "Senha atualizada com sucesso" 
    }), { status: 200 }));
    
  } catch (e) {
    console.error("update-password exception:", e);
    return cors(new Response(JSON.stringify({ error: "internal_error", details: String(e) }), { status: 500 }));
  }
});
