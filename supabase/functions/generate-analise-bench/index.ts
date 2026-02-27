import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { briefingId } = await req.json();

    if (!briefingId) {
      return new Response(
        JSON.stringify({ error: 'briefingId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY_ANALISE');

    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY_ANALISE not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar briefing
    const { data: briefing, error: briefingError } = await supabase
      .from('analise_bench_forms')
      .select('*')
      .eq('id', briefingId)
      .single();

    if (briefingError || !briefing) {
      console.error('Error fetching briefing:', briefingError);
      return new Response(
        JSON.stringify({ error: 'Briefing not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Competitors estão salvos como JSON na própria tabela
    const competitors = briefing.competitors || [];

    // Montar o contexto do briefing
    let briefingContext = `
INFORMAÇÕES DO CLIENTE:
Nome da empresa: ${briefing.nome_empresa || 'Não especificado'}
Nicho: ${briefing.nicho_empresa || 'Não especificado'}
Site: ${briefing.site || 'Não especificado'}
Serviços/Produtos: ${briefing.servicos_produtos || 'Não especificado'}
Diferenciais competitivos: ${briefing.diferenciais_competitivos || 'Não especificado'}
Público-alvo: ${briefing.publico_alvo || 'Não especificado'}
Objetivo do projeto: ${briefing.objetivo_projeto || 'Não especificado'}
Maior desafio: ${briefing.maior_desafio || 'Não especificado'}
`;

    if (competitors && competitors.length > 0) {
      briefingContext += '\n\nCONCORRENTES:\n';
      competitors.forEach((comp: any, idx: number) => {
        briefingContext += `\n${idx + 1}. ${comp.nome || 'Sem nome'}`;
        briefingContext += `\n   Tipo: ${comp.tipo === 'direto' ? 'Concorrente Direto' : 'Concorrente Indireto'}`;
        if (comp.site) briefingContext += `\n   Site: ${comp.site}`;
        if (comp.instagram_linkedin) briefingContext += `\n   Instagram/LinkedIn: ${comp.instagram_linkedin}`;
        if (comp.porque_escolhido) briefingContext += `\n   Por que foi escolhido: ${comp.porque_escolhido}`;
      });
    }

    // Adicionar objetivos e foco da análise
    if (briefing.objetivo_benchmark && briefing.objetivo_benchmark.length > 0) {
      briefingContext += '\n\nOBJETIVOS DO BENCHMARK:\n';
      briefing.objetivo_benchmark.forEach((obj: string) => {
        briefingContext += `- ${obj}\n`;
      });
    }

    if (briefing.objetivo_benchmark_outro) {
      briefingContext += `- Outro: ${briefing.objetivo_benchmark_outro}\n`;
    }

    if (briefing.aspecto_prioritario) {
      briefingContext += `\nASPECTO PRIORITÁRIO: ${briefing.aspecto_prioritario}\n`;
    }

    if (briefing.informacoes_adicionais) {
      briefingContext += `\nINFORMAÇÕES ADICIONAIS: ${briefing.informacoes_adicionais}\n`;
    }

    // Buscar prompts ativos específicos para analise_bench; se não houver, usar todos ativos
    let systemPrompt = 'Você é um especialista em análise de mercado e benchmarking competitivo.';

    const { data: promptsByType, error: promptsByTypeError } = await supabase
      .from('default_prompts')
      .select('*')
      .eq('copy_type', 'analise_bench')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (promptsByTypeError) {
      console.error('Error fetching prompts by type:', promptsByTypeError);
    }

    let activePrompts = promptsByType || [];

    // Fallback: se não existir nenhum prompt marcado como analise_bench, usa todos ativos
    if (!activePrompts || activePrompts.length === 0) {
      const { data: allPrompts, error: allPromptsError } = await supabase
        .from('default_prompts')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (allPromptsError) {
        console.error('Error fetching active prompts:', allPromptsError);
      }
      activePrompts = allPrompts || [];
    }

    if (activePrompts.length > 0) {
      systemPrompt = activePrompts.map((p: any) => p.content).join('\n\n');
    }

    // Montar o contexto do briefing (mantém o que já foi construído acima)
    let userPrompt = briefingContext;

    console.log('Calling Anthropic API for analise bench...');

    // Chamar API da Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate analysis', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedAnalysis = data.content[0].text;

    console.log('Analysis generated successfully');

    // Salvar o resultado no briefing
    const provider = 'anthropic';
    const { error: updateError } = await supabase
      .from('analise_bench_forms')
      .update({
        ai_response: generatedAnalysis,
        ai_provider: provider,
        response_generated_at: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefingId);

    if (updateError) {
      console.error('Error updating briefing with analysis:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: generatedAnalysis,
        briefingId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-analise-bench function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
