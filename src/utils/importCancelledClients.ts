import { supabase } from '@/integrations/supabase/client';

interface CancelledClient {
  company_name: string;
  squad: 'Apollo' | 'Artemis' | 'Athena' | 'Ares';
  plano: 'Starter' | 'Business' | 'Pro' | 'Conceito' | 'Social';
  monthly_revenue: number;
  data_contrato: string;
  tempo_contrato: string;
  valor_contrato: number;
  niche: string;
  existe_comissao: boolean;
  observacao_comissao?: string;
  fase_projeto: string;
  etapa_formal: string; // Etapa Formal → mapeia para stage do kanban
}

// Mapeamento: Etapa Formal → Nome da stage no kanban
const ETAPA_TO_STAGE: Record<string, string> = {
  'Onboarding': '1º Mês',
  'Implementação': '2º Mês',
  'Refinamento': '3º Mês',
  'Escala': '4º Mês',
  'Expansão': '5º Mês',
  'Renovação': '6º Mês',
  'Retenção': 'Retenção',
};

const CANCELLED_CLIENTS: CancelledClient[] = [
  {
    company_name: 'QJ Donuts',
    squad: 'Artemis',
    plano: 'Business',
    monthly_revenue: 3000,
    data_contrato: '2025-08-01',
    tempo_contrato: '6',
    valor_contrato: 18000,
    niche: 'Franquia',
    existe_comissao: true,
    observacao_comissao: '1e franquia das uni',
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Renovação',
  },
  {
    company_name: 'Rede Fooch',
    squad: 'Apollo',
    plano: 'Pro',
    monthly_revenue: 3500,
    data_contrato: '2025-08-01',
    tempo_contrato: '12',
    valor_contrato: 42000,
    niche: 'Serviço',
    existe_comissao: false,
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Renovação',
  },
  {
    company_name: 'Itália no Box',
    squad: 'Athena',
    plano: 'Business',
    monthly_revenue: 3000,
    data_contrato: '2024-10-01',
    tempo_contrato: '6',
    valor_contrato: 18000,
    niche: 'Franquia',
    existe_comissao: false,
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Renovação',
  },
  {
    company_name: 'Aluga Aí',
    squad: 'Athena',
    plano: 'Business',
    monthly_revenue: 3000,
    data_contrato: '2025-01-01',
    tempo_contrato: '6',
    valor_contrato: 18000,
    niche: 'Franquia',
    existe_comissao: true,
    observacao_comissao: 'uando bater a meta',
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Renovação',
  },
  {
    company_name: 'Master Crio',
    squad: 'Ares',
    plano: 'Pro',
    monthly_revenue: 4900,
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Produto',
    existe_comissao: true,
    observacao_comissao: '2,5% sobre vendas',
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Onboarding',
  },
  {
    company_name: 'Belafer',
    squad: 'Ares',
    plano: 'Business',
    monthly_revenue: 3000,
    data_contrato: '2025-09-01',
    tempo_contrato: '6',
    valor_contrato: 18000,
    niche: 'Produto',
    existe_comissao: false,
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Escala',
  },
  {
    company_name: 'Unigama',
    squad: 'Artemis',
    plano: 'Pro',
    monthly_revenue: 4200,
    data_contrato: '2025-10-01',
    tempo_contrato: '6',
    valor_contrato: 25200,
    niche: 'Educação',
    existe_comissao: true,
    observacao_comissao: 'nsalidade gerada pe',
    fase_projeto: 'Cancelamento',
    etapa_formal: 'Refinamento',
  },
];

const PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555'; // Clientes Ativos

export async function importCancelledClients(): Promise<{ success: number; skipped: number; errors: string[] }> {
  const result = { success: 0, skipped: 0, errors: [] as string[] };

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.errors.push('Usuário não autenticado');
    return result;
  }

  // Get ALL stages of the pipeline to map by name
  const { data: stages, error: stagesError } = await supabase
    .from('csm_stages')
    .select('id, name')
    .eq('pipeline_id', PIPELINE_ID)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (stagesError || !stages?.length) {
    result.errors.push('Não foi possível encontrar stages do pipeline');
    return result;
  }

  // Build name→id map for stage lookup
  const stageMap: Record<string, string> = {};
  for (const s of stages) {
    if (!stageMap[s.name]) stageMap[s.name] = s.id; // keep first (avoid duplicates)
  }
  const fallbackStageId = stages[0].id;

  for (const client of CANCELLED_CLIENTS) {
    // Resolve stage from etapa_formal
    const targetStageName = ETAPA_TO_STAGE[client.etapa_formal] || '1º Mês';
    const clientStageId = stageMap[targetStageName] || fallbackStageId;

    // Check if already exists
    const { data: existing } = await supabase
      .from('csm_cards')
      .select('id')
      .eq('company_name', client.company_name)
      .eq('pipeline_id', PIPELINE_ID)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      const { error } = await supabase
        .from('csm_cards')
        .update({
          stage_id: clientStageId,
          client_status: 'cancelado',
          churn: true,
          data_perda: '2026-01-30',
          fase_projeto: client.fase_projeto,
          squad: client.squad,
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          niche: client.niche,
          servico_contratado: 'Gestão de Tráfego',
          data_contrato: client.data_contrato,
          data_inicio: client.data_contrato,
          tempo_contrato: client.tempo_contrato,
          valor_contrato: client.valor_contrato,
          existe_comissao: client.existe_comissao,
          observacao_comissao: client.observacao_comissao || null,
        } as any)
        .eq('id', existing[0].id);

      if (error) {
        result.errors.push(`Erro ao atualizar ${client.company_name}: ${error.message}`);
      } else {
        result.success++;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('csm_cards')
        .insert({
          title: client.company_name,
          company_name: client.company_name,
          stage_id: clientStageId,
          pipeline_id: PIPELINE_ID,
          squad: client.squad,
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          value: client.monthly_revenue,
          niche: client.niche,
          servico_contratado: 'Gestão de Tráfego',
          data_contrato: client.data_contrato,
          data_inicio: client.data_contrato,
          tempo_contrato: client.tempo_contrato,
          valor_contrato: client.valor_contrato,
          existe_comissao: client.existe_comissao,
          observacao_comissao: client.observacao_comissao || null,
          client_status: 'cancelado',
          churn: true,
          data_perda: '2026-01-30',
          fase_projeto: client.fase_projeto,
          position: 0,
          created_by: user.id,
        } as any);

      if (error) {
        result.errors.push(`Erro ao inserir ${client.company_name}: ${error.message}`);
      } else {
        result.success++;
      }
    }
  }

  return result;
}
