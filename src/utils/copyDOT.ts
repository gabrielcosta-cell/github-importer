// CHAME sua Edge Function AQUI:
const EDGE_URL = "https://yoauzllgwcsrmvkwdcoa.functions.supabase.co/anthropic-copias";

// Limites de segurança
const MAX_FILES = 5;
const MAX_MB = 32; // Anthropic aceita ~32MB por arquivo

/**
 * PATCH 2 - Garantir limite de tamanho
 */
function withinLimit(f: File): boolean {
  return (f.size / (1024 * 1024)) <= MAX_MB;
}

/**
 * PATCH 2 - Garantir MIME type correto
 */
function asPdf(file: File): File {
  // força o tipo quando o blob veio sem MIME
  if (file.type && file.type !== "application/octet-stream") return file;
  return new File([file], file.name || "documento.pdf", { type: "application/pdf" });
}

/**
 * Deduplica arquivos por nome e tamanho
 */
function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const f of files) {
    const key = `${f.name}::${f.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

/**
 * (Opcional) Converte uma URL (pública ou assinada) em File para enviar via FormData.
 * Use se você SÓ tiver o path/URL no banco.
 */
async function fetchAsFile(url: string, filename?: string): Promise<File> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar ${url} (${r.status})`);
  const blob = await r.blob();
  const name = filename || url.split("/").pop() || "documento.pdf";
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

/**
 * Envia briefing + (opcional) documentos reais para a Edge Function.
 * docs: File[] (PDFs). Se você só tiver caminhos/URLs, use fetchAsFile antes.
 */
export async function gerarCopyDOT({
  reuniao_boas_vindas,
  kickoff,
  brainstorm,
  briefing,
  docs = [],           // Array<File> (PDFs). Na 1ª vez com anexos fixos, preencha; depois pode deixar []
}: {
  reuniao_boas_vindas: string;
  kickoff: string;
  brainstorm: string;
  briefing: string;
  docs?: File[];
}) {
  console.log("🚀 Iniciando gerarCopyDOT com", docs.length, "documentos");
  
  // PATCH 2 - Deduplica, aplica MIME correto e limites de segurança
  const merged = dedupeFiles(docs)
    .map(asPdf)
    .filter(withinLimit);
    
  const safeFiles = merged.slice(0, MAX_FILES);
  
  console.log("📋 Arquivos após processamento:", safeFiles.length, "de", docs.length, "originais");
  
  const fd = new FormData();
  fd.append("reuniao_boas_vindas", reuniao_boas_vindas || "");
  fd.append("kickoff", kickoff || "");
  fd.append("brainstorm", brainstorm || "");
  fd.append("briefing", briefing || "");

  // ⚠️ O nome do campo de arquivo TEM que ser "docs"
  for (const file of safeFiles) {
    if (file && file.size > 0) {
      console.log("📎 Anexando arquivo:", file.name, "(" + file.size + " bytes)", "tipo:", file.type);
      fd.append("docs", file);
    }
  }

  console.log("📡 Enviando para:", EDGE_URL);
  
  try {
    // PATCH 3 - SEM headers manuais de Content-Type
    const resp = await fetch(EDGE_URL, { method: "POST", body: fd });
    const api = await resp.json();
    
    console.log("📥 Resposta recebida - Status:", resp.status, "OK:", resp.ok);
    console.log("📥 Dados da API:", api);
    console.log("🔍 Debug attachments:", api.debug?.attachments);

    if (!resp.ok || !api.ok) {
      // Se a função ainda não tem anexos fixos, ela avisa para anexar UMA vez:
      if (api?.needs_seed) {
        throw new Error("Anexe os PDFs uma única vez no campo 'docs' para fixar os documentos base.");
      }
      const errorMessage = typeof api?.error === 'string' 
        ? api.error 
        : api?.error?.message || JSON.stringify(api?.error) || "Falha ao processar briefing";
      throw new Error(errorMessage);
    }

    // Saída final pronta para exibir
    console.log("✅ Copy gerada com sucesso!");
    return api.output as string;
    
  } catch (e: any) {
    console.error("❌ Erro ao processar briefing:", e);
    throw e; // Re-throw para o componente tratar com toast
  }
}

/**
 * Converte caminhos do Storage Supabase em File objects
 * Funciona com buckets públicas e privadas (usando signed URLs)
 */
export async function convertStoragePathsToFiles(
  paths: string[], 
  supabaseClient: any,
  bucketName: string = 'briefing-documents'
): Promise<File[]> {
  console.log("🔄 Convertendo", paths.length, "paths do Storage para Files");
  
  const files: File[] = [];
  
  for (const path of paths) {
    try {
      console.log("📥 Processando arquivo do Storage:", path);
      
      // Primeiro, tentar como bucket pública
      const { data: publicUrl } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(path);
      
      let downloadUrl = publicUrl?.publicUrl;
      
      // Se falhar, tentar como bucket privada com signed URL
      if (!downloadUrl) {
        const { data: signedData, error: signedError } = await supabaseClient.storage
          .from(bucketName)
          .createSignedUrl(path, 60 * 5); // 5 minutos
        
        if (signedError || !signedData?.signedUrl) {
          console.warn("⚠️ Erro ao gerar signed URL:", path, signedError?.message);
          continue;
        }
        
        downloadUrl = signedData.signedUrl;
      }
      
      // Baixar o arquivo
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.warn("⚠️ Falha ao baixar arquivo:", path, response.status);
        continue;
      }
      
      const blob = await response.blob();
      
      // Garantir MIME type correto
      const contentType = blob.type || "application/pdf";
      const fileName = path.split('/').pop() || 'documento.pdf';
      
      const file = new File([blob], fileName, { type: contentType });
      files.push(file);
      
      console.log("✅ Arquivo convertido:", fileName, "(" + file.size + " bytes)", "tipo:", contentType);
      
    } catch (e) {
      console.warn("⚠️ Erro ao processar arquivo:", path, e);
    }
  }
  
  console.log("✅ Conversão concluída:", files.length, "arquivos convertidos");
  return files;
}