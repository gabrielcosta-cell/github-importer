import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar token JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clientName, caseContent, prompts, userId } = await req.json();

    if (!clientName || !caseContent) {
      return new Response(
        JSON.stringify({ error: 'clientName e caseContent são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY_CASES') || Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY_CASES não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Separar prompts por tipo
    const postPrompts = prompts?.filter((p: any) => p.is_active && p.prompt_type === 'post') || [];
    const blogPrompts = prompts?.filter((p: any) => p.is_active && p.prompt_type === 'blog') || [];

    const models = [
      'claude-sonnet-4-5',
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307'
    ];

    // ========== CHAMADA 1: GERAR POST DE CARROSSEL ==========
    let copyInstagram = '';
    let usedModelPost = null;

    if (postPrompts.length > 0) {
      const postSystemPrompt = postPrompts.map((p: any) => p.content).join('\n\n');
      
      const postUserMessage = `Informações do case para criar o post de carrossel:

Cliente: ${clientName}

${caseContent}

IMPORTANTE: Siga EXATAMENTE o formato de slides de carrossel (Slide 1:, Slide 2:, etc.) conforme os exemplos do prompt. Não escreva nada além do post. Não faça introduções, não faça perguntas, apenas entregue o post completo.`;

      console.log('Gerando POST de carrossel para:', clientName);

      for (const model of models) {
        try {
          console.log(`[POST] Tentando modelo: ${model}`);
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 4000,
              messages: [
                { role: 'user', content: postUserMessage }
              ],
              system: postSystemPrompt
            })
          });

          if (response.ok) {
            const data = await response.json();
            copyInstagram = data.content[0].text;
            usedModelPost = model;
            console.log(`[POST] Sucesso com modelo: ${model}`);
            break;
          } else {
            const errorText = await response.text();
            console.error(`[POST] Erro com modelo ${model}:`, errorText);
          }
        } catch (modelError) {
          console.error(`[POST] Exceção com modelo ${model}:`, modelError);
        }
      }
    } else {
      console.log('Nenhum prompt de POST ativo, pulando geração de carrossel');
    }

    // ========== CHAMADA 2: GERAR ARTIGO COMPLETO PARA BLOG ==========
    let blogArticle = '';
    let usedModelBlog = null;

    if (blogPrompts.length > 0) {
      const blogSystemPrompt = blogPrompts.map((p: any) => p.content).join('\n\n');
      
      const blogUserMessage = `Informações do case para criar o artigo completo do blog:

Cliente: ${clientName}

${caseContent}

IMPORTANTE: Siga EXATAMENTE a estrutura e formato especificados no prompt. Entregue o artigo completo em Markdown, pronto para publicação. Não escreva nada além do artigo. Não faça introduções, não faça perguntas, apenas entregue o artigo completo.`;

      console.log('Gerando BLOG (título/descrição) para:', clientName);

      for (const model of models) {
        try {
          console.log(`[BLOG] Tentando modelo: ${model}`);
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 8000,
              messages: [
                { role: 'user', content: blogUserMessage }
              ],
              system: blogSystemPrompt
            })
          });

          if (response.ok) {
            const data = await response.json();
            blogArticle = data.content[0].text;
            usedModelBlog = model;
            console.log(`[BLOG] Sucesso com modelo: ${model}`);
            console.log('[BLOG] Artigo gerado com', blogArticle.length, 'caracteres');
            break;
          } else {
            const errorText = await response.text();
            console.error(`[BLOG] Erro com modelo ${model}:`, errorText);
          }
        } catch (modelError) {
          console.error(`[BLOG] Exceção com modelo ${model}:`, modelError);
        }
      }
    } else {
      console.log('Nenhum prompt de BLOG ativo, pulando geração de artigo');
    }

    // ========== MONTAR RESPOSTA FINAL ==========
    const finalResponse = {
      copy_instagram: copyInstagram,
      blog_article: blogArticle
    };

    console.log('Resposta final montada:', {
      copy_instagram_length: copyInstagram.length,
      blog_article_length: blogArticle.length,
      models_used: { post: usedModelPost, blog: usedModelBlog }
    });

    return new Response(
      JSON.stringify({
        success: true,
        model: usedModelPost || usedModelBlog,
        data: finalResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
