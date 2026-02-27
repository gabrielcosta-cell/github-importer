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
    console.log('🧪 Teste da configuração Anthropic iniciado');
    
    // Verificar se a chave existe
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('🔑 Chave API encontrada:', !!apiKey);
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY não encontrada');
      return new Response(JSON.stringify({
        error: 'ANTHROPIC_API_KEY não configurada',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📡 Fazendo teste de chamada para API Anthropic...');
    
    // Fazer uma chamada de teste com fallback de modelos
    const candidateModels = [
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229'
    ];

    let ok = false;
    let lastError = '';
    let data: any = null;

    for (const model of candidateModels) {
      console.log('🧪 Teste com modelo:', model);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          messages: [
            { role: 'user', content: 'Responda apenas: teste ok' }
          ],
        }),
      });

      console.log('📊 Status da resposta:', response.status, 'para', model);
      if (!response.ok) {
        lastError = await response.text();
        console.error('❌ Erro na API para', model, ':', lastError);
        continue;
      }
      data = await response.json();
      ok = true;
      console.log('✅ Modelo OK:', model);
      break;
    }

    if (!ok) {
      return new Response(JSON.stringify({
        error: `Nenhum modelo aceitou a chamada. Último erro: ${lastError}`,
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Resposta recebida:', data);

    return new Response(JSON.stringify({
      success: true,
      message: 'Anthropic API funcionando corretamente',
      response: data.content[0].text
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Erro no teste:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});