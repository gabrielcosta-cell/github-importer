import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface ClientData {
  empresa: string;
  plano: string;
  categoria: string;
  mrr: number;
  inadimplente: boolean;
  possivel_churn: boolean;
  churn_comercial: boolean;
  churn: boolean;
  aviso_previo: boolean;
  pausa_contratual: boolean;
  squad: string;
}

function parseBooleanValue(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1' || lower === 'x';
  }
  return Boolean(value);
}

function parseCurrencyValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove todos os caracteres que não são dígitos, vírgula ou ponto
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function normalizePlano(plano: string): string {
  const planoLower = plano.toLowerCase().trim();
  
  // Mapear variações para o formato padrão (primeira letra maiúscula)
  if (planoLower === 'starter' || planoLower === 'start') {
    return 'Starter';
  }
  if (planoLower === 'business') {
    return 'Business';
  }
  if (planoLower === 'pro') {
    return 'Pro';
  }
  if (planoLower === 'conceito' || planoLower === 'concept') {
    return 'Conceito';
  }
  if (planoLower === 'social') {
    return 'Social';
  }
  
  // Se não reconhecer, retorna Business como padrão
  return 'Business';
}

export async function importClientsFromFile(file: File) {
  try {
    // Read the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse the Excel file
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON - first get raw data to check format
    let jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
    
    console.log('Dados da planilha (raw):', jsonData);
    console.log('Primeira linha:', jsonData[0]);
    console.log('Colunas disponíveis:', jsonData.length > 0 ? Object.keys(jsonData[0]) : 'Nenhuma');
    
    // Check if we got __EMPTY columns (means headers weren't recognized)
    if (jsonData.length > 0 && Object.keys(jsonData[0])[0]?.startsWith('__EMPTY')) {
      console.log('Detectado formato __EMPTY, corrigindo headers...');
      
      // Get data as array of arrays to extract headers
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Find the header row (first non-empty row)
      let headerRowIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i].some((cell: any) => cell && cell.toString().trim() !== '')) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex >= 0) {
        const headers = rawData[headerRowIndex];
        const dataRows = rawData.slice(headerRowIndex + 1);
        
        // Convert back to JSON with proper headers
        jsonData = dataRows
          .filter(row => row && row.some((cell: any) => cell && cell.toString().trim() !== ''))
          .map(row => {
            const obj: any = {};
            headers.forEach((header: any, index: number) => {
              if (header) {
                obj[header.toString().trim()] = row[index];
              }
            });
            return obj;
          });
        
        console.log('Dados corrigidos:', jsonData);
        console.log('Headers encontrados:', headers);
      }
    }
    
    // Filter out empty rows
    const validRows = jsonData.filter(row => {
      const empresa = row['EMPRESA'] || row['Empresa'] || row['empresa'];
      return empresa && empresa.toString().trim() !== '';
    });
    
    console.log('Linhas válidas encontradas:', validRows.length);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    // Find "Onboarding" stage in "Clientes ativos" pipeline
    const { data: pipeline } = await supabase
      .from('csm_pipelines')
      .select('id')
      .eq('name', 'Clientes ativos')
      .single();
    
    if (!pipeline) throw new Error('Pipeline "Clientes ativos" não encontrado');
    
    const { data: stage } = await supabase
      .from('csm_stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.id)
      .ilike('name', '%onboarding%')
      .single();
    
    if (!stage) throw new Error('Etapa de Onboarding não encontrada no pipeline Clientes ativos');
    
    const results = {
      success: 0,
      errors: 0,
      updated: 0,
      created: 0,
      details: [] as string[]
    };
    
    // Process each row
    for (const row of validRows) {
      try {
        const clientData: ClientData = {
          empresa: row['EMPRESA'] || row['Empresa'] || row['empresa'] || '',
          plano: normalizePlano(row['PLANO'] || row['Plano'] || row['plano'] || 'Business'),
          categoria: row['CATEGORIA'] || row['Categoria'] || row['categoria'] || 'MRR recorrente',
          mrr: parseCurrencyValue(row['MRR'] || row['Mrr'] || row['mrr'] || 0),
          inadimplente: parseBooleanValue(row['INADIMPLENTE'] || row['Inadimplente'] || row['inadimplente'] || false),
          possivel_churn: parseBooleanValue(row['POSSÍVEL CHURN'] || row['Possivel Churn'] || row['Possiveis Churn'] || row['possivel_churn'] || false),
          churn_comercial: parseBooleanValue(row['CHURN COMERCIAL'] || row['Churn Comercial'] || row['churn_comercial'] || false),
          churn: parseBooleanValue(row['CHURN'] || row['Churn'] || row['churn'] || false),
          aviso_previo: parseBooleanValue(row['AVISO PRÉVIO'] || row['Aviso Previo'] || row['aviso_previo'] || false),
          pausa_contratual: parseBooleanValue(row['PAUSA CONTRATUAL'] || row['Pausa Contratual'] || row['pausa_contratual'] || false),
          squad: row['SQUAD'] || row['Squad'] || row['squad'] || '',
        };
        
        if (!clientData.empresa) {
          results.details.push(`⚠️ Linha ignorada: sem nome de empresa`);
          continue;
        }
        
        // Check if client already exists in CRM
        const { data: existingCard } = await supabase
          .from('csm_cards')
          .select('id')
          .eq('company_name', clientData.empresa)
          .eq('pipeline_id', pipeline.id)
          .maybeSingle();
        
        let crmError = null;
        
        if (existingCard) {
          // Update existing card
          const { error } = await supabase
            .from('csm_cards')
            .update({
              monthly_revenue: clientData.mrr,
              plano: clientData.plano,
              categoria: clientData.categoria,
              squad: clientData.squad || null,
              inadimplente: clientData.inadimplente,
              possivel_churn: clientData.possivel_churn,
              churn_comercial: clientData.churn_comercial,
              churn: clientData.churn,
              aviso_previo: clientData.aviso_previo,
              pausa_contratual: clientData.pausa_contratual,
            })
            .eq('id', existingCard.id);
          
          crmError = error;
          if (!error) {
            results.updated++;
            results.details.push(`🔄 ${clientData.empresa}: atualizado no CSM`);
          }
        } else {
          // Insert new card into CRM
          const { error } = await supabase
            .from('csm_cards')
            .insert({
              title: clientData.empresa,
              company_name: clientData.empresa,
              stage_id: stage.id,
              pipeline_id: pipeline.id,
              monthly_revenue: clientData.mrr,
              plano: clientData.plano,
              categoria: clientData.categoria,
              squad: clientData.squad || null,
              inadimplente: clientData.inadimplente,
              possivel_churn: clientData.possivel_churn,
              churn_comercial: clientData.churn_comercial,
              churn: clientData.churn,
              aviso_previo: clientData.aviso_previo,
              pausa_contratual: clientData.pausa_contratual,
              created_by: user.id,
              position: 0
            });
          
          crmError = error;
          if (!error) {
            results.created++;
          }
        }
        
        if (crmError) {
          console.error('Erro ao processar no CRM:', crmError);
          results.errors++;
          results.details.push(`❌ ${clientData.empresa}: ${crmError.message}`);
          continue;
        }
        
        // Upsert into projetos_reservados (update if exists, insert if not)
        const { data: existingProjeto } = await supabase
          .from('projetos_reservados')
          .select('id')
          .eq('empresa', clientData.empresa)
          .maybeSingle();
        
        // Convert plano to uppercase format for projetos_reservados table
        const planoForProjetos = clientData.plano.toUpperCase();
        
        const projetoData = {
          empresa: clientData.empresa,
          plano: planoForProjetos,
          categoria: clientData.categoria,
          mrr: `R$ ${clientData.mrr.toFixed(2).replace('.', ',')}`,
          implementacao: 'R$ 0,00',
          squad: clientData.squad || null,
          vaga_reservada_ate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          inadimplente: clientData.inadimplente,
          possivel_churn: clientData.possivel_churn,
          churn_comercial: clientData.churn_comercial,
          churn: clientData.churn,
          aviso_previo: clientData.aviso_previo,
          pausa_contratual: clientData.pausa_contratual,
          selected: false
        };
        
        let projetoError = null;
        
        if (existingProjeto) {
          // Update existing project
          const { error } = await supabase
            .from('projetos_reservados')
            .update(projetoData)
            .eq('id', existingProjeto.id);
          projetoError = error;
        } else {
          // Insert new project
          const { error } = await supabase
            .from('projetos_reservados')
            .insert({
              ...projetoData,
              created_by: user.id
            });
          projetoError = error;
        }
        
        if (projetoError) {
          console.error('Erro ao processar na lista de clientes:', projetoError);
          results.errors++;
          results.details.push(`❌ ${clientData.empresa}: ${projetoError.message}`);
          continue;
        }
        
        results.success++;
        results.details.push(`✓ ${clientData.empresa} importado com sucesso`);
        
      } catch (error: any) {
        results.errors++;
        results.details.push(`❌ Erro ao processar linha: ${error.message}`);
      }
    }
    
    return results;
    
  } catch (error: any) {
    console.error('Erro ao importar:', error);
    throw error;
  }
}
