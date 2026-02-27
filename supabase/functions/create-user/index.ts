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
    console.log('=== CREATE USER FUNCTION STARTED ===');
    
    // Verificar se o usuário está autenticado e é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return cors(new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 }));
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Auth error:', authError?.message);
      return cors(new Response(JSON.stringify({ error: "Token inválido" }), { status: 401 }));
    }

    // Verificar se o usuário é admin (considerando custom_role se houver)
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, custom_role_id, custom_roles(base_role)')
      .eq('user_id', user.id)
      .single();

    // Determinar o role efetivo do usuário
    const effectiveRole = adminProfile?.custom_role_id 
      ? (adminProfile as any).custom_roles?.base_role 
      : adminProfile?.role;

    if (effectiveRole !== 'admin') {
      console.log('User is not admin. Role:', adminProfile?.role, 'Effective role:', effectiveRole);
      return cors(new Response(JSON.stringify({ error: "Acesso negado - apenas admins podem criar usuários" }), { status: 403 }));
    }
    
    let body;
    try {
      const rawText = await req.text();
      console.log('Raw text received:', rawText);
      body = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return cors(new Response(JSON.stringify({ error: "Invalid JSON body", details: String(parseError) }), { status: 400 }));
    }
    
    console.log('Parsed body:', JSON.stringify(body));
    
    const { email, password, profile } = body;
    console.log('Extracted fields:', { email, password: password ? '[PRESENT]' : '[MISSING]', profile: profile ? '[PRESENT]' : '[MISSING]' });
    
    if (!email || !password) {
      console.log('Missing required fields - email:', !!email, 'password:', !!password);
      return cors(new Response(JSON.stringify({ error: "email e password são obrigatórios", details: { email: !!email, password: !!password } }), { status: 400 }));
    }

    console.log('Creating user with email:', email);

    // 1) Cria o usuário com senha definida pelo admin
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma automaticamente para que possa logar direto
    });

    console.log('Auth user creation result:', { 
      success: !!created?.user, 
      userId: created?.user?.id,
      error: createErr?.message 
    });

    // Helper para achar um usuário existente por e-mail (se já existe)
    async function findUserIdByEmail(targetEmail: string): Promise<string | null> {
      console.log('Looking for existing user with email:', targetEmail);
      // lista paginando até achar (poucos usuários → rápido)
      const perPage = 200;
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.log('Error listing users:', error);
          break;
        }
        const hit = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
        if (hit) {
          console.log('Found existing user:', hit.id);
          return hit.id;
        }
        if (data.users.length < perPage) break; // acabou
      }
      console.log('No existing user found');
      return null;
    }

    let userId: string | null = created?.user?.id ?? null;

    // Se deu erro na criação, pode ser que já existe
    if (createErr) {
      console.log('User creation failed, checking error:', createErr.message);
      const msg = (createErr.message || "").toLowerCase();
      const isAlreadyExists = msg.includes("already exist") || msg.includes("user already exists") || createErr.status === 422;
      
      if (isAlreadyExists) {
        console.log('Email already exists, returning specific error');
        return cors(new Response(JSON.stringify({ 
          error: "EMAIL_ALREADY_EXISTS", 
          message: "Este email já está cadastrado no sistema" 
        }), { status: 400 }));
      }
      
      console.log('Creation error is not about existing user:', createErr.message);
      return cors(new Response(JSON.stringify({ error: createErr.message }), { status: 400 }));
    }

    console.log('Final userId for profile creation:', userId);

    // 2) UPSERT em profiles (só se soubermos o id do usuário)
    if (userId) {
      // Monte os campos que quer guardar no profile inicialmente
      const profileRow = {
        user_id: userId,
        email: email,
        // campos opcionais vindos do front (ex.: name, role, phone)
        ...(profile ?? {}),
      };

      console.log('Upserting profile with data:', profileRow);

      const { error: upsertErr } = await supabaseAdmin
        .from("profiles")
        .upsert([profileRow], { onConflict: "user_id" }); // <- chave única

      if (upsertErr) {
        // Loga mas não mata a requisição se o usuário foi criado
        console.error("profiles upsert error:", upsertErr);
      } else {
        console.log("Profile upserted successfully");
      }
    }

    // 3) Resposta OK (se o usuário já existia, também retornamos 200)
    const response = {
      ok: true,
      user_id: userId,
      created: !createErr,
      message: createErr ? "Usuário já existia; profile atualizado (upsert)." : "Usuário criado com sucesso e pode fazer login.",
    };
    
    console.log('Returning response:', response);
    console.log('=== CREATE USER FUNCTION COMPLETED ===');
    
    return cors(
      new Response(
        JSON.stringify(response),
        { status: 200 },
      ),
    );
  } catch (e) {
    console.error("create-user exception:", e);
    return cors(new Response(JSON.stringify({ error: "internal_error", details: String(e) }), { status: 500 }));
  }
});