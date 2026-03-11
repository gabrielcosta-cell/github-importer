import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticação do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Token não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente autenticado para verificar quem está chamando
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.user.id;

    // 2. Verificar se o chamador é admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_global_admin")
      .eq("user_id", callerId)
      .single();

    if (callerError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN", message: "Perfil do chamador não encontrado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = callerProfile.role === "admin" || callerProfile.is_global_admin;
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN", message: "Apenas admins podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Ler body da requisição
    const { email, password, profile, require_password_change } = await req.json();

    if (!email || !profile?.name) {
      return new Response(
        JSON.stringify({ error: "VALIDATION_ERROR", message: "Email e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isDotConceitoDomain = email.trim().toLowerCase().endsWith("@dotconceito.com");

    // Password required only for non-DOT users
    if (!isDotConceitoDomain && !password) {
      return new Response(
        JSON.stringify({ error: "VALIDATION_ERROR", message: "Senha é obrigatória para usuários externos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin comum não pode criar outro admin
    if (profile.role === "admin" && !callerProfile.is_global_admin) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN", message: "Apenas o Admin Global pode criar admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isDotConceitoDomain = email.trim().toLowerCase().endsWith("@dotconceito.com");

    if (isDotConceitoDomain) {
      // Para @dotconceito.com: NÃO criar Auth user (login será via Google OAuth)
      // Apenas inserir perfil com placeholder user_id
      const placeholderUserId = crypto.randomUUID();

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        user_id: placeholderUserId,
        name: profile.name,
        email: email.trim().toLowerCase(),
        role: profile.role || "user",
        department: profile.department || null,
        phone: profile.phone || null,
        is_active: true,
        is_global_admin: false,
        project_scope: profile.project_scope || "csm",
      });

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        return new Response(
          JSON.stringify({ error: "PROFILE_ERROR", message: "Erro ao criar perfil: " + profileError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id: placeholderUserId,
          message: "Perfil criado com sucesso. O usuário deve fazer login via Google.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Para outros domínios: fluxo original (criar Auth user + perfil)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Erro ao criar usuário no Auth:", createError);

      if (createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "USER_EXISTS", message: "Este email já está cadastrado" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AUTH_ERROR", message: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user.id,
      name: profile.name,
      email: email,
      role: profile.role || "user",
      department: profile.department || null,
      phone: profile.phone || null,
      is_active: true,
      is_global_admin: false,
      project_scope: profile.project_scope || "csm",
    });

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      return new Response(
        JSON.stringify({ error: "PROFILE_ERROR", message: "Erro ao criar perfil: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        message: "Usuário criado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
