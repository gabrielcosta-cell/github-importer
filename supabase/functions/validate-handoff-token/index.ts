import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function corsResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('=== VALIDATE HANDOFF TOKEN STARTED ===');

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return corsResponse({ 
        success: false, 
        error: 'INVALID_REQUEST',
        message: 'Requisição inválida' 
      }, 400);
    }

    const { token } = body;

    if (!token) {
      console.log('No token provided');
      return corsResponse({ 
        success: false, 
        error: 'TOKEN_MISSING',
        message: 'Token não fornecido' 
      }, 400);
    }

    console.log('Validating token:', token.substring(0, 8) + '...');

    // Buscar o token na tabela de handoff tokens
    const { data: handoffData, error: fetchError } = await supabaseAdmin
      .from('auth_handoff_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError) {
      console.log('Token fetch error:', fetchError.message);
      
      if (fetchError.code === 'PGRST116') {
        return corsResponse({ 
          success: false, 
          error: 'TOKEN_NOT_FOUND',
          message: 'Token não encontrado' 
        }, 404);
      }
      
      return corsResponse({ 
        success: false, 
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar token' 
      }, 500);
    }

    if (!handoffData) {
      console.log('Token not found in database');
      return corsResponse({ 
        success: false, 
        error: 'TOKEN_NOT_FOUND',
        message: 'Token não encontrado' 
      }, 404);
    }

    // Verificar se o token já foi usado
    if (handoffData.used_at) {
      console.log('Token already used at:', handoffData.used_at);
      return corsResponse({ 
        success: false, 
        error: 'TOKEN_ALREADY_USED',
        message: 'Token já foi utilizado' 
      }, 400);
    }

    // Verificar se o token expirou (60 segundos)
    const createdAt = new Date(handoffData.created_at);
    const now = new Date();
    const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

    if (diffSeconds > 60) {
      console.log('Token expired. Created:', createdAt, 'Diff:', diffSeconds, 'seconds');
      return corsResponse({ 
        success: false, 
        error: 'TOKEN_EXPIRED',
        message: 'Token expirado' 
      }, 400);
    }

    console.log('Token valid. User ID:', handoffData.user_id);

    // Marcar o token como usado
    const { error: updateError } = await supabaseAdmin
      .from('auth_handoff_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Error marking token as used:', updateError);
      // Continua mesmo se falhar a atualização
    }

    // Determinar a URL de redirecionamento (sempre usar domínio de produção como fallback)
    const origin = req.headers.get('origin');
    const redirectBase = origin && origin.includes('dotconceito.com') 
      ? origin 
      : 'https://skala.dotconceito.com';
    
    // Gerar magic link para o usuário
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: handoffData.email,
      options: {
        redirectTo: `${redirectBase}/dashboard`
      }
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
      return corsResponse({ 
        success: false, 
        error: 'MAGIC_LINK_ERROR',
        message: 'Erro ao gerar link de autenticação' 
      }, 500);
    }

    console.log('Magic link generated successfully');
    console.log('=== VALIDATE HANDOFF TOKEN COMPLETED ===');

    // Retornar os dados necessários para autenticação
    return corsResponse({
      success: true,
      user_id: handoffData.user_id,
      email: handoffData.email,
      token_hash: magicLinkData.properties?.hashed_token,
    });

  } catch (e) {
    console.error("validate-handoff-token exception:", e);
    return corsResponse({ 
      success: false, 
      error: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor' 
    }, 500);
  }
});
