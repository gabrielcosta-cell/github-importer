import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let copyFormIdVar: string | null = null;

  try {
    let copyFormIdVar: string | null = null;
    console.log('🚀 Edge function generate-copy-ai iniciada');
    const { copyFormId, newCopyContext, appendToExisting } = await req.json();
    copyFormIdVar = copyFormId;
    console.log('📝 ID do formulário recebido:', copyFormId);
    console.log('📝 Contexto de nova copy:', newCopyContext ? 'Sim' : 'Não');
    console.log('📝 Modo append:', appendToExisting ? 'Sim' : 'Não');
    
    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do formulário
    console.log('🔍 Buscando dados do formulário...');
    const { data: formData, error: formError } = await supabase
      .from('copy_forms')
      .select('*')
      .eq('id', copyFormId)
      .single();

    if (formError) {
      console.error('❌ Erro ao buscar formulário:', formError);
      throw new Error(`Erro ao buscar formulário: ${formError.message}`);
    }

    console.log('✅ Dados do formulário carregados:', {
      empresa: formData.nome_empresa,
      status: formData.status
    });

    // Processar documentos se existirem
    let documentsContent = '';
    if (formData.document_files && formData.document_files.length > 0) {
      console.log(`Processando ${formData.document_files.length} documento(s)...`);
      
      try {
        const documentPromises = formData.document_files.map(async (filePath: string) => {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('briefing-documents')
            .download(filePath);
          
          if (fileError) {
            console.error(`Erro ao baixar ${filePath}:`, fileError);
            return `Erro ao processar arquivo: ${filePath}`;
          }
          
          const fileName = filePath.split('/').pop() || 'arquivo';
          const isTextLike = /\.(txt|md|csv|json)$/i.test(fileName);
          if (isTextLike) {
            const text = await fileData.text();
            return `=== DOCUMENTO: ${fileName} ===\n${text}\n`;
          } else {
            return `=== DOCUMENTO: ${fileName} (anexado) ===\n[Conteúdo não textual omitido no prompt para evitar ruído]\n`;
          }
        });
        
        const documentsArray = await Promise.all(documentPromises);
        documentsContent = documentsArray.join('\n\n');
        console.log(`Documentos processados com sucesso. Total de caracteres: ${documentsContent.length}`);
      } catch (error) {
        console.error('Erro ao processar documentos:', error);
        documentsContent = 'Erro ao processar documentos anexados.';
      }
    }

    // Buscar prompts padrão do sistema para enriquecer a resposta
    const { data: prompts } = await supabase
      .from('default_prompts')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    let systemPrompt = '';
    if (prompts && prompts.length > 0) {
      systemPrompt = prompts.map(p => p.content).join('\n\n');
    }

    // Usar Claude via Supabase secrets
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const provider = 'anthropic';

    console.log('🔑 Verificando chave da API...');
    if (!apiKey) {
      console.error('❌ Chave da API Claude não encontrada');
      throw new Error('Chave da API Claude não configurada no Supabase');
    }
    console.log('✅ Chave da API encontrada');

    // Preparar system prompt completo com TODOS os prompts padrão
    console.log('📝 Preparando system prompt completo...');
    console.log(`📊 Total de prompts ativos encontrados: ${prompts?.length || 0}`);
    
    // Log para debug: verificar conteúdo dos prompts
    if (prompts && prompts.length > 0) {
      console.log('📋 Títulos dos prompts carregados:');
      prompts.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.title} (${p.content?.length || 0} caracteres)`);
        // Log específico para verificar se contém "criativo estático"
        if (p.title?.toLowerCase().includes('criativo') || p.content?.toLowerCase().includes('criativo estático')) {
          console.log('   ✅ Prompt de criativos estáticos ENCONTRADO!');
        }
      });
    }
    
    const fullSystemPrompt = `
${systemPrompt}

${documentsContent ? `
=== CONTEXTO ADICIONAL DOS DOCUMENTOS ===
${documentsContent}

IMPORTANTE: Use as informações dos documentos acima para enriquecer sua análise e personalizar ainda mais as recomendações. Extraia insights únicos, dados específicos, processos proprietários ou qualquer informação relevante que possa fortalecer a estratégia de copy.

===========================
` : ''}`;

    const userMessage = `
${newCopyContext ? `
=== SOLICITAÇÃO DE NOVA COPY ===
MOTIVO/CONTEXTO: ${newCopyContext}

O cliente já recebeu uma copy anteriormente e agora está solicitando uma NOVA versão considerando o contexto acima.
Use TODAS as informações do briefing abaixo para gerar uma copy completamente nova e adequada ao novo contexto.

===========================

` : ''}
INFORMAÇÕES DO CLIENTE ATUAL:

REUNIÕES:
${formData.reuniao_boas_vindas ? `Reunião de Boas-vindas: ${formData.reuniao_boas_vindas}` : ''}
${formData.reuniao_kick_off ? `Reunião de Kick-off: ${formData.reuniao_kick_off}` : ''}
${formData.reuniao_brainstorm ? `Reunião de Brainstorm: ${formData.reuniao_brainstorm}` : ''}

DADOS DO NEGÓCIO:
- Empresa: ${formData.nome_empresa || 'Não informado'}
- Nicho: ${formData.nicho_empresa || 'Não informado'}
- Serviços/Produtos: ${formData.servicos_produtos || 'Não informado'}
- Diferencial: ${formData.diferencial_competitivo || 'Não informado'}
- Público-alvo: ${formData.publico_alvo || 'Não informado'}
- Principal obstáculo: ${formData.principal_inimigo || 'Não informado'}
- Avatar: ${formData.avatar_principal || 'Não informado'}
- Momento da jornada: ${formData.momento_jornada || 'Não informado'}
- Maior objeção: ${formData.maior_objecao || 'Não informado'}
- Cases: ${formData.cases_impressionantes || 'Não informado'}
- Empresas atendidas: ${formData.nomes_empresas || 'Não informado'}
- Investimento médio: ${formData.investimento_medio || 'Não informado'}
- Qualificação: ${formData.pergunta_qualificatoria || 'Não informado'}
- Informações extras: ${formData.informacao_extra || 'Não informado'}
- Números/Certificados: ${formData.numeros_certificados || 'Não informado'}

TAMANHO DA LP SOLICITADO: ${formData.tamanho_lp || 'Não especificado'}

Agora gere o material completo seguindo todos os padrões e exemplos fornecidos no sistema.
`;

    let aiResponse = '';

    // Chamar API Claude com fallback de modelos (Claude 4 mais recentes)
    console.log('🤖 Chamando API da Anthropic...');
    const candidateModels = [
      'claude-sonnet-4-20250514',      // Claude 4 Sonnet - melhor performance
      'claude-opus-4-1-20250805',      // Claude 4 Opus - mais capaz
      'claude-3-5-haiku-20241022',     // Claude 3.5 Haiku - mais rápido
      'claude-3-haiku-20240307'        // Claude 3 Haiku - fallback
    ];

    let data: any = null;
    let lastErrorText = '';
    for (const model of candidateModels) {
      console.log('🧪 Tentando modelo:', model);
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: fullSystemPrompt || 'Você é um copywriter sênior especializado em copys de alta conversão.',
          max_tokens: 8000,
          messages: [
            { role: 'user', content: [{ type: 'text', text: userMessage }] }
          ],
        }),
      });

      console.log('📡 Status do modelo', model, ':', resp.status);
      if (resp.ok) {
        data = await resp.json();
        console.log('✅ Modelo aceito:', model);
        break;
      } else {
        lastErrorText = await resp.text();
        console.error('❌ Erro com modelo', model, ':', lastErrorText);
      }
    }

    if (!data) {
      throw new Error(`Nenhum modelo Anthropic aceitou a requisição. Último erro: ${lastErrorText}`);
    }

    console.log('✅ Dados processados pela API');
    
    aiResponse = data.content[0].text;
    console.log('📝 Resposta gerada, tamanho:', aiResponse.length, 'caracteres');

    // Salvar resposta no banco
    console.log('💾 Salvando resposta no banco...');
    
    // Se appendToExisting for true, concatenar à resposta existente
    let finalResponse = aiResponse;
    if (appendToExisting && formData.ai_response) {
      console.log('📎 Concatenando nova copy à resposta existente...');
      finalResponse = `${formData.ai_response}\n\n=== NOVA COPY ===\n\n${aiResponse}`;
      console.log('📝 Resposta final, tamanho:', finalResponse.length, 'caracteres');
    }
    
    const { error: updateError } = await supabase
      .from('copy_forms')
      .update({
        ai_response: finalResponse,
        ai_provider: documentsContent ? `${provider}-with-docs` : provider,
        response_generated_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', copyFormId);

    if (updateError) {
      console.error('❌ Erro ao salvar no banco:', updateError);
      throw new Error(`Erro ao salvar resposta: ${updateError.message}`);
    }

    console.log('🎉 Processo finalizado com sucesso!');
    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        copyFormId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função generate-copy-ai:', error);

    // Marcar briefing como failed para não ficar preso em "processing"
    try {
      if (copyFormIdVar) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('copy_forms')
          .update({ status: 'failed' })
          .eq('id', copyFormIdVar);
      }
    } catch (e) {
      console.error('⚠️ Falha ao atualizar status para failed:', e);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});