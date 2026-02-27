// supabase/functions/anthropic-copias/index.ts
// Deno / Supabase Edge Function
// Recebe multipart/form-data com campos de texto e PDFs.
// Envia para Anthropic com attachments (text_extractor) e retorna o texto final.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-3-5-haiku-20241022";

// System Prompt para criação de copys da DOT
const SYSTEM_PROMPT = `
Você deve criar copys para os clientes da DOT usando como base de conhecimentos os documentos em anexo e as informações que devem ser sempre enviadas pelo usuário.

O usuário deve te dar 4 inputs:
1- Reunião de boas-vindas...
2- Transcrição do kick off...
3- Transcrição do Brainstorm...
4- Briefing de 15 perguntas...

Regras de saída: separe claramente as respostas por seção pedida pelo usuário. Use tom e estrutura adequados para copy de anúncios de performance (DOT).

Com base nessas informações e nos documentos fornecidos, crie:

1. **ANÁLISE ESTRATÉGICA** (Resumo da situação atual e oportunidades)
2. **POSICIONAMENTO** (Como a empresa deve se posicionar no mercado)
3. **PROPOSTA DE VALOR** (Principais benefícios únicos)
4. **ARGUMENTOS-CHAVE** (5 argumentos principais para venda)
5. **HEADLINES SUGERIDAS** (5 títulos impactantes)
6. **COPY PARA LANDING PAGE** (Estrutura completa: headline, subheadline, benefícios, objeções, call-to-action)
7. **ESTRATÉGIA DE CONTEÚDO** (Temas e ângulos para marketing de conteúdo)
8. **RECOMENDAÇÕES** (Próximos passos estratégicos)

Seja específico, estratégico e focado em conversão. Use os dados fornecidos para personalizar todas as sugestões.
`.trim();

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`📄 Extraindo texto de: ${file.name}`);
    
    // Usando pdf-parse para extrair texto do PDF
    const pdfParse = await import("https://esm.sh/pdf-parse@1.1.1");
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const data = await pdfParse.default(buffer);
    const extractedText = data.text;
    
    console.log(`✅ Texto extraído de ${file.name}: ${extractedText.length} caracteres`);
    
    return extractedText;
  } catch (error) {
    console.error(`❌ Erro ao extrair texto de ${file.name}:`, error);
    return `[Erro ao extrair texto do arquivo ${file.name}]`;
  }
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Verificar autenticação do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Não autorizado" }), {
        status: 401,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Validar token JWT
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        status: 401,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log("🚀 Iniciando processamento da requisição anthropic-copias");
    console.log("🔑 ANTHROPIC_API_KEY está configurada:", !!ANTHROPIC_API_KEY);
    
    if (!ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY não configurada.");
      return new Response(JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY não configurada." }), {
        status: 500,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    
    if (req.method !== "POST") {
      console.log("❌ Método não permitido:", req.method);
      return new Response(JSON.stringify({ ok: false, error: "Use POST" }), {
        status: 405,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const ctype = req.headers.get("content-type") || "";
    console.log("📋 Content-Type recebido:", ctype);
    
    if (!ctype.includes("multipart/form-data")) {
      console.log("❌ Content-Type inválido, esperado multipart/form-data");
      return new Response(JSON.stringify({ ok: false, error: "Envie multipart/form-data" }), {
        status: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const form = await req.formData();

    // Campos de texto
    const reuniao_boas_vindas = String(form.get("reuniao_boas_vindas") || "");
    const kickoff = String(form.get("kickoff") || "");
    const brainstorm = String(form.get("brainstorm") || "");
    const briefing = String(form.get("briefing") || "");

    console.log("Campos recebidos:", {
      reuniao_boas_vindas: reuniao_boas_vindas.length,
      kickoff: kickoff.length,
      brainstorm: brainstorm.length,
      briefing: briefing.length
    });

    // Arquivos (um ou vários) no campo "docs"
    const docs: File[] = [];
    for (const [key, val] of form.entries()) {
      if (key === "docs" && val instanceof File && val.size > 0) {
        docs.push(val);
      }
    }

    console.log(`${docs.length} documentos recebidos`);

    // Extrair texto dos documentos
    const documentTexts: string[] = [];
    for (const f of docs) {
      const extractedText = await extractTextFromPDF(f);
      documentTexts.push(`=== DOCUMENTO: ${f.name} ===\n${extractedText}\n=== FIM DO DOCUMENTO ===`);
    }
    
    const documentsContext = documentTexts.length > 0 
      ? `\n\nDOCUMENTOS DE REFERÊNCIA:\n${documentTexts.join('\n\n')}`
      : '';

    const payload = {
      model: "claude-3-5-haiku-20241022",
      max_tokens: 8000,
      system: SYSTEM_PROMPT + documentsContext,
      messages: [
        {
          role: "user",
          content: `Reunião de boas-vindas:\n${reuniao_boas_vindas}\n\nKickoff:\n${kickoff}\n\nBrainstorm:\n${brainstorm}\n\nBriefing (15 perguntas):\n${briefing}`
        },
      ],
    };

    console.log("Enviando para Anthropic API...");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Erro da API Anthropic:", data);
      return new Response(JSON.stringify({ ok: false, error: data }), {
        status: r.status,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const output = data?.content?.[0]?.text ?? "";
    console.log("Resposta gerada com sucesso, tamanho:", output.length);
    
    return new Response(JSON.stringify({
      ok: true,
      output,
      debug: {
        documentsProcessed: docs.length,
        model: "claude-3-5-haiku-20241022"
      }
    }), {
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Erro na função anthropic-copias:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});